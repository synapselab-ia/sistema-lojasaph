import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Quantity } from "@/domain/common/quantity";
import {
  RecordStockReturnInput,
  RecordStockReturnResult,
  RuntimeStockReturnOverview,
} from "../domain/stock-return";
import { StockReturnGateway } from "../repositories/stock-return-gateway";

export class StockReturnService {
  constructor(private readonly gateway: StockReturnGateway) {}

  loadOverview(organizationId: EntityId): Promise<RuntimeStockReturnOverview> {
    return this.gateway.loadOverview(organizationId);
  }

  record(input: RecordStockReturnInput): Promise<RecordStockReturnResult> {
    const quantity = Quantity.fromDecimal(input.quantity);
    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Stock return quantity must be greater than zero.");
    }

    return this.gateway.record({
      ...input,
      quantity: quantity.toDecimal(),
      notes: input.notes?.trim() || undefined,
    });
  }
}
