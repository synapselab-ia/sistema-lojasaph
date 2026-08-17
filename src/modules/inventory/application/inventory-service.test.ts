import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/common/domain-error";
import { asEntityId } from "@/domain/common/entity-id";
import { InMemoryStockItemRepository } from "@/modules/catalog/adapters/in-memory-stock-item-repository";
import { createStockItem } from "@/modules/catalog/domain/stock-item";
import { InMemoryInventoryBalanceRepository } from "../adapters/in-memory-inventory-balance-repository";
import { InMemoryInventoryBatchRepository } from "../adapters/in-memory-inventory-batch-repository";
import { InMemoryInventoryCountRepository } from "../adapters/in-memory-inventory-count-repository";
import { InMemoryStockMovementRepository } from "../adapters/in-memory-stock-movement-repository";
import { InMemoryStockTransferRepository } from "../adapters/in-memory-stock-transfer-repository";
import { InventoryService } from "./inventory-service";

function setup(options?: { tracked?: boolean }) {
  const organizationId = asEntityId("org-test");
  const item = createStockItem({
    organizationId,
    name: "Água",
    baseUnitCode: "un",
    type: "merchandise",
    trackBatch: options?.tracked ?? false,
    trackExpiration: options?.tracked ?? false,
  });
  const service = new InventoryService(
    new InMemoryStockItemRepository([item]),
    new InMemoryInventoryBalanceRepository(),
    new InMemoryStockMovementRepository(),
    new InMemoryStockTransferRepository(),
    new InMemoryInventoryBatchRepository(),
    new InMemoryInventoryCountRepository(),
  );
  return {
    organizationId,
    item,
    source: asEntityId("stock-source"),
    destination: asEntityId("stock-destination"),
    service,
  };
}

describe("InventoryService", () => {
  it("calculates moving weighted average and preserves it on withdrawal", async () => {
    const { service, organizationId, item, source } = setup();
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "10", unitCost: "2.00" });
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "10", unitCost: "4.00" });

    let balance = (await service.listBalances())[0]!;
    expect(balance.quantity.toDecimal()).toBe("20");
    expect(balance.averageCost.toDecimal()).toBe("3.00");

    await service.withdraw({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "5" });
    balance = (await service.listBalances())[0]!;
    expect(balance.quantity.toDecimal()).toBe("15");
    expect(balance.averageCost.toDecimal()).toBe("3.00");
  });

  it("blocks negative stock", async () => {
    const { service, organizationId, item, source } = setup();
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "2", unitCost: "1.00" });
    await expect(service.withdraw({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "3" })).rejects.toBeInstanceOf(DomainError);
  });

  it("keeps transfer stock in transit until receipt", async () => {
    const { service, organizationId, item, source, destination } = setup();
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "10", unitCost: "5.00" });
    const transfer = await service.dispatchTransfer({ organizationId, stockItemId: item.id, sourceLocationId: source, destinationLocationId: destination, quantity: "4" });

    let balances = await service.listBalances();
    expect(balances.find((balance) => balance.stockLocationId === source)?.quantity.toDecimal()).toBe("6");
    expect(balances.find((balance) => balance.stockLocationId === destination)).toBeUndefined();
    expect(transfer.status).toBe("dispatched");

    const received = await service.receiveTransfer({ transferId: transfer.id });
    balances = await service.listBalances();
    const destinationBalance = balances.find((balance) => balance.stockLocationId === destination)!;
    expect(destinationBalance.quantity.toDecimal()).toBe("4");
    expect(destinationBalance.averageCost.toDecimal()).toBe("5.00");
    expect(received.status).toBe("received");
  });

  it("serializes simultaneous withdrawals inside the in-memory demo", async () => {
    const { service, organizationId, item, source } = setup();
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "10", unitCost: "1.00" });

    const results = await Promise.allSettled([
      service.withdraw({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "8" }),
      service.withdraw({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "8" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await service.listBalances())[0]?.quantity.toDecimal()).toBe("2");
  });

  it("allocates tracked withdrawals by FEFO and preserves batches across transfer", async () => {
    const { service, organizationId, item, source, destination } = setup({ tracked: true });
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "5", unitCost: "2.00", batchCode: "LATE", expirationDate: "2026-09-01" });
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "3", unitCost: "2.00", batchCode: "EARLY", expirationDate: "2026-08-20" });

    await service.withdraw({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "2" });
    let batches = await service.listBatches();
    expect(batches.find((batch) => batch.batchCode === "EARLY")?.remainingQuantity.toDecimal()).toBe("1");

    const transfer = await service.dispatchTransfer({ organizationId, stockItemId: item.id, sourceLocationId: source, destinationLocationId: destination, quantity: "2" });
    await service.receiveTransfer({ transferId: transfer.id });
    batches = await service.listBatches();
    const destinationBatches = batches.filter((batch) => batch.stockLocationId === destination);
    expect(destinationBatches.reduce((total, batch) => total + batch.remainingQuantity.milliunits, 0)).toBe(2000);
    expect(destinationBatches.some((batch) => batch.expirationDate === "2026-08-20")).toBe(true);
  });

  it("confirms physical count through ledger adjustments and detects stale counts", async () => {
    const { service, organizationId, item, source } = setup();
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "10", unitCost: "3.00" });
    let count = await service.startInventoryCount({ organizationId, stockLocationId: source });
    count = await service.setInventoryCountLine({ countId: count.id, stockItemId: item.id, countedQuantity: "8" });
    const confirmed = await service.confirmInventoryCount({ countId: count.id });
    expect(confirmed.status).toBe("confirmed");
    expect((await service.listBalances())[0]?.quantity.toDecimal()).toBe("8");
    expect((await service.listMovements()).some((movement) => movement.reasonCode === "inventory_count_adjustment_negative")).toBe(true);

    const stale = await service.startInventoryCount({ organizationId, stockLocationId: source });
    await service.recordEntry({ organizationId, stockItemId: item.id, stockLocationId: source, quantity: "1", unitCost: "3.00" });
    await service.setInventoryCountLine({ countId: stale.id, stockItemId: item.id, countedQuantity: "8" });
    await expect(service.confirmInventoryCount({ countId: stale.id })).rejects.toMatchObject({ code: "INVENTORY_COUNT_STALE" });
  });
});
