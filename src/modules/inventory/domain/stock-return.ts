import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { InventoryBalance } from "./inventory";

export interface RuntimeStockReturnCandidate {
  readonly withdrawalMovementId: EntityId;
  readonly stockItemId: EntityId;
  readonly stockLocationId: EntityId;
  readonly withdrawnQuantity: Quantity;
  readonly returnedQuantity: Quantity;
  readonly remainingQuantity: Quantity;
  readonly unitCostSnapshot: Money;
  readonly occurredAt: string;
  readonly notes?: string;
}

export interface RuntimeStockReturn {
  readonly id: EntityId;
  readonly withdrawalMovementId: EntityId;
  readonly stockItemId: EntityId;
  readonly stockLocationId: EntityId;
  readonly quantity: Quantity;
  readonly unitCostSnapshot: Money;
  readonly occurredAt: string;
  readonly notes?: string;
}

export interface RuntimeStockReturnOverview {
  readonly candidates: readonly RuntimeStockReturnCandidate[];
  readonly recent: readonly RuntimeStockReturn[];
}

export interface RecordStockReturnInput {
  readonly commandId?: EntityId;
  readonly organizationId: EntityId;
  readonly withdrawalMovementId: EntityId;
  readonly quantity: string;
  readonly notes?: string;
}

export interface RecordStockReturnResult {
  readonly movementId: EntityId;
  readonly withdrawalMovementId: EntityId;
  readonly returnedQuantity: Quantity;
  readonly remainingReturnableQuantity: Quantity;
  readonly balance: InventoryBalance;
}
