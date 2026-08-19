import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { StockReturnGateway } from "../repositories/stock-return-gateway";
import {
  RecordStockReturnInput,
  RecordStockReturnResult,
  RuntimeStockReturnOverview,
} from "../domain/stock-return";
import { StockReturnService } from "./stock-return-service";

const organizationId = "00000000-0000-4000-8000-000000000001" as EntityId;
const withdrawalMovementId = "00000000-0000-4000-8000-000000000701" as EntityId;
const stockItemId = "00000000-0000-4000-8000-000000000400" as EntityId;
const stockLocationId = "00000000-0000-4000-8000-000000000120" as EntityId;

class FakeStockReturnGateway implements StockReturnGateway {
  lastInput?: RecordStockReturnInput;

  async loadOverview(): Promise<RuntimeStockReturnOverview> {
    return {
      candidates: [{
        withdrawalMovementId,
        stockItemId,
        stockLocationId,
        withdrawnQuantity: Quantity.fromDecimal("6"),
        returnedQuantity: Quantity.fromDecimal("2"),
        remainingQuantity: Quantity.fromDecimal("4"),
        unitCostSnapshot: Money.fromDecimal("10"),
        occurredAt: "2026-08-19T10:00:00Z",
      }],
      recent: [],
    };
  }

  async record(input: RecordStockReturnInput): Promise<RecordStockReturnResult> {
    this.lastInput = input;
    return {
      movementId: "00000000-0000-4000-8000-000000000703" as EntityId,
      withdrawalMovementId,
      returnedQuantity: Quantity.fromDecimal(input.quantity),
      remainingReturnableQuantity: Quantity.fromDecimal("2"),
      balance: {
        stockItemId,
        stockLocationId,
        quantity: Quantity.fromDecimal("10"),
        averageCost: Money.fromDecimal("14"),
      },
    };
  }
}

describe("StockReturnService", () => {
  it("loads returnable withdrawals from the gateway", async () => {
    const service = new StockReturnService(new FakeStockReturnGateway());
    const overview = await service.loadOverview(organizationId);

    expect(overview.candidates).toHaveLength(1);
    expect(overview.candidates[0]?.remainingQuantity.toDecimal()).toBe("4");
  });

  it("normalizes quantity and notes before recording", async () => {
    const gateway = new FakeStockReturnGateway();
    const service = new StockReturnService(gateway);

    await service.record({
      organizationId,
      withdrawalMovementId,
      quantity: "2,500",
      notes: "  retorno parcial  ",
    });

    expect(gateway.lastInput?.quantity).toBe("2.5");
    expect(gateway.lastInput?.notes).toBe("retorno parcial");
  });

  it("rejects non-positive return quantities before persistence", () => {
    const service = new StockReturnService(new FakeStockReturnGateway());

    expect(() => service.record({
      organizationId,
      withdrawalMovementId,
      quantity: "0",
    })).toThrowError(/greater than zero/i);
  });
});
