import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/common/domain-error";
import { asEntityId } from "@/domain/common/entity-id";
import { InMemoryStockItemRepository } from "@/modules/catalog/adapters/in-memory-stock-item-repository";
import { createStockItem } from "@/modules/catalog/domain/stock-item";
import { InMemoryInventoryBalanceRepository } from "../adapters/in-memory-inventory-balance-repository";
import { InMemoryStockMovementRepository } from "../adapters/in-memory-stock-movement-repository";
import { InMemoryStockTransferRepository } from "../adapters/in-memory-stock-transfer-repository";
import { InventoryService } from "./inventory-service";

function setup() {
  const organizationId = asEntityId("org-test");
  const item = createStockItem({ organizationId, name: "Água", baseUnitCode: "un", type: "merchandise" });
  const service = new InventoryService(
    new InMemoryStockItemRepository([item]),
    new InMemoryInventoryBalanceRepository(),
    new InMemoryStockMovementRepository(),
    new InMemoryStockTransferRepository(),
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
    const transfer = await service.dispatchTransfer({
      organizationId,
      stockItemId: item.id,
      sourceLocationId: source,
      destinationLocationId: destination,
      quantity: "4",
    });

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
});
