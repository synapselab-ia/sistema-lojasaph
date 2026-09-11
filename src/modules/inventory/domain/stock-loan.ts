import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { InventoryBalance } from "./inventory";

export type StockLoanStatus = "open" | "partial" | "settled";

export interface RuntimeStockLoan {
  readonly id: EntityId;
  readonly stockItemId: EntityId;
  readonly sourceLocationId: EntityId;
  readonly counterparty: string;
  readonly originalQuantity: Quantity;
  readonly originalValue: Money;
  readonly physicalReturnedQuantity: Quantity;
  readonly physicalReturnedValue: Money;
  readonly monetarySettledAmount: Money;
  readonly remainingPhysicalQuantity: Quantity;
  readonly remainingValue: Money;
  readonly preferredBatchId?: EntityId;
  readonly status: StockLoanStatus;
  readonly loanedAt: string;
  readonly settledAt?: string;
  readonly notes?: string;
}

export interface RuntimeStockLoanRestitution {
  readonly id: EntityId;
  readonly stockLoanId: EntityId;
  readonly physicalQuantity: Quantity;
  readonly physicalValue: Money;
  readonly monetaryAmount: Money;
  readonly physicalMovementId?: EntityId;
  readonly remainingPhysicalQuantityAfter: Quantity;
  readonly remainingValueAfter: Money;
  readonly occurredAt: string;
  readonly notes?: string;
}

export interface CreateStockLoanInput {
  readonly commandId?: EntityId;
  readonly organizationId: EntityId;
  readonly stockItemId: EntityId;
  readonly sourceLocationId: EntityId;
  readonly counterparty: string;
  readonly quantity: string;
  readonly preferredBatchId?: EntityId;
  readonly notes?: string;
}

export interface CreateStockLoanResult {
  readonly loan: RuntimeStockLoan;
  readonly balance: InventoryBalance;
}

export interface RecordStockLoanRestitutionInput {
  readonly commandId?: EntityId;
  readonly organizationId: EntityId;
  readonly stockLoanId: EntityId;
  readonly physicalQuantity?: string;
  readonly monetaryAmount?: string;
  readonly notes?: string;
}

export interface RecordStockLoanRestitutionResult {
  readonly restitution: RuntimeStockLoanRestitution;
  readonly loanStatus: StockLoanStatus;
  readonly balance: InventoryBalance;
}
