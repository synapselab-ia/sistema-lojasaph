import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import {
  CreateStockLoanInput,
  CreateStockLoanResult,
  RecordStockLoanRestitutionInput,
  RecordStockLoanRestitutionResult,
  RuntimeStockLoan,
  RuntimeStockLoanRestitution,
} from "../domain/stock-loan";
import { StockLoanGateway } from "../repositories/stock-loan-gateway";
import { StockLoanService } from "./stock-loan-service";

const organizationId = "00000000-0000-4000-8000-000000000001" as EntityId;
const loanId = "00000000-0000-4000-8000-000000000701" as EntityId;
const stockItemId = "00000000-0000-4000-8000-000000000400" as EntityId;
const stockLocationId = "00000000-0000-4000-8000-000000000120" as EntityId;

const loan: RuntimeStockLoan = {
  id: loanId,
  stockItemId,
  sourceLocationId: stockLocationId,
  counterparty: "Restaurante parceiro",
  originalQuantity: Quantity.fromDecimal("5"),
  originalValue: Money.fromDecimal("19"),
  physicalReturnedQuantity: Quantity.zero(),
  physicalReturnedValue: Money.zero(),
  monetarySettledAmount: Money.zero(),
  remainingPhysicalQuantity: Quantity.fromDecimal("5"),
  remainingValue: Money.fromDecimal("19"),
  status: "open",
  loanedAt: "2026-09-11T10:00:00Z",
};

class FakeStockLoanGateway implements StockLoanGateway {
  createInput?: CreateStockLoanInput;
  restitutionInput?: RecordStockLoanRestitutionInput;

  async listByOrganization(): Promise<readonly RuntimeStockLoan[]> {
    return [loan];
  }

  async findById(): Promise<RuntimeStockLoan | null> {
    return loan;
  }

  async listRestitutions(): Promise<readonly RuntimeStockLoanRestitution[]> {
    return [];
  }

  async create(input: CreateStockLoanInput): Promise<CreateStockLoanResult> {
    this.createInput = input;
    return {
      loan,
      balance: {
        stockItemId,
        stockLocationId,
        quantity: Quantity.fromDecimal("3"),
        averageCost: Money.fromDecimal("2"),
      },
    };
  }

  async recordRestitution(
    input: RecordStockLoanRestitutionInput,
  ): Promise<RecordStockLoanRestitutionResult> {
    this.restitutionInput = input;
    return {
      restitution: {
        id: "00000000-0000-4000-8000-000000000711" as EntityId,
        stockLoanId: loanId,
        physicalQuantity: Quantity.fromDecimal(input.physicalQuantity ?? "0"),
        physicalValue: Money.fromDecimal("5"),
        monetaryAmount: Money.fromDecimal(input.monetaryAmount ?? "0"),
        remainingPhysicalQuantityAfter: Quantity.fromDecimal("4"),
        remainingValueAfter: Money.fromDecimal("10"),
        occurredAt: "2026-09-11T11:00:00Z",
      },
      loanStatus: "partial",
      balance: {
        stockItemId,
        stockLocationId,
        quantity: Quantity.fromDecimal("4"),
        averageCost: Money.fromDecimal("2.75"),
      },
    };
  }
}

describe("StockLoanService", () => {
  it("normalizes loan quantity, counterparty and notes", async () => {
    const gateway = new FakeStockLoanGateway();
    const service = new StockLoanService(gateway);

    await service.create({
      organizationId,
      stockItemId,
      sourceLocationId: stockLocationId,
      counterparty: "  Restaurante parceiro  ",
      quantity: "2,500",
      notes: "  entrega no balcão  ",
    });

    expect(gateway.createInput?.counterparty).toBe("Restaurante parceiro");
    expect(gateway.createInput?.quantity).toBe("2.5");
    expect(gateway.createInput?.notes).toBe("entrega no balcão");
  });

  it("rejects invalid loan inputs before persistence", () => {
    const service = new StockLoanService(new FakeStockLoanGateway());

    expect(() => service.create({
      organizationId,
      stockItemId,
      sourceLocationId: stockLocationId,
      counterparty: "Parceiro",
      quantity: "0",
    })).toThrowError(/maior que zero/i);

    expect(() => service.create({
      organizationId,
      stockItemId,
      sourceLocationId: stockLocationId,
      counterparty: "   ",
      quantity: "1",
    })).toThrowError(/contraparte/i);
  });

  it("normalizes combined restitution inputs", async () => {
    const gateway = new FakeStockLoanGateway();
    const service = new StockLoanService(gateway);

    await service.recordRestitution({
      organizationId,
      stockLoanId: loanId,
      physicalQuantity: "1,500",
      monetaryAmount: "4,50",
      notes: "  acerto combinado  ",
    });

    expect(gateway.restitutionInput?.physicalQuantity).toBe("1.5");
    expect(gateway.restitutionInput?.monetaryAmount).toBe("4.50");
    expect(gateway.restitutionInput?.notes).toBe("acerto combinado");
  });

  it("requires at least one restitution component", () => {
    const service = new StockLoanService(new FakeStockLoanGateway());

    expect(() => service.recordRestitution({
      organizationId,
      stockLoanId: loanId,
      physicalQuantity: "0",
      monetaryAmount: "0",
    })).toThrowError(/devolução física/i);
  });
});
