import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";

export type StockMovementType =
  | "opening_balance"
  | "entry"
  | "withdrawal"
  | "transfer_out"
  | "transfer_in";

export interface StockMovementLine {
  readonly stockItemId: EntityId;
  readonly quantity: Quantity;
  readonly unitCostSnapshot: Money;
}

export interface StockMovement {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly type: StockMovementType;
  readonly occurredAt: string;
  readonly sourceLocationId?: EntityId;
  readonly destinationLocationId?: EntityId;
  readonly responsibleUserId?: EntityId;
  readonly referenceId?: EntityId;
  readonly notes?: string;
  readonly lines: readonly StockMovementLine[];
}

export interface InventoryBalance {
  readonly stockItemId: EntityId;
  readonly stockLocationId: EntityId;
  readonly quantity: Quantity;
  readonly averageCost: Money;
}

export type StockTransferStatus = "dispatched" | "partially_received" | "received" | "cancelled";

export interface StockTransferLine {
  readonly stockItemId: EntityId;
  readonly dispatchedQuantity: Quantity;
  readonly receivedQuantity: Quantity;
  readonly unitCostSnapshot: Money;
}

export interface StockTransfer {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly sourceLocationId: EntityId;
  readonly destinationLocationId: EntityId;
  readonly status: StockTransferStatus;
  readonly dispatchedAt: string;
  readonly receivedAt?: string;
  readonly responsibleUserId?: EntityId;
  readonly notes?: string;
  readonly lines: readonly StockTransferLine[];
}

export function createStockMovement(input: Omit<StockMovement, "id">): StockMovement {
  return Object.freeze({ id: newEntityId(), ...input });
}

export function createStockTransfer(input: Omit<StockTransfer, "id" | "status" | "receivedAt">): StockTransfer {
  return Object.freeze({
    id: newEntityId(),
    status: "dispatched" as const,
    ...input,
  });
}
