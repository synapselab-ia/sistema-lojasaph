import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";

export type StockMovementType =
  | "opening_balance"
  | "entry"
  | "withdrawal"
  | "transfer_out"
  | "transfer_in"
  | "inventory_adjustment";

export interface StockMovementBatchAllocation {
  readonly batchId: EntityId;
  readonly quantity: Quantity;
}

export interface StockMovementLine {
  readonly stockItemId: EntityId;
  readonly quantity: Quantity;
  readonly unitCostSnapshot: Money;
  readonly batchAllocations?: readonly StockMovementBatchAllocation[];
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
  readonly reasonCode?: string;
  readonly notes?: string;
  readonly lines: readonly StockMovementLine[];
}

export interface InventoryBalance {
  readonly stockItemId: EntityId;
  readonly stockLocationId: EntityId;
  readonly quantity: Quantity;
  readonly averageCost: Money;
}

export type InventoryBatchSource = "opening_balance" | "entry" | "transfer" | "inventory_adjustment";

export interface InventoryBatch {
  readonly id: EntityId;
  readonly stockItemId: EntityId;
  readonly stockLocationId: EntityId;
  readonly batchCode?: string;
  readonly expirationDate?: string;
  readonly receivedAt: string;
  readonly originalQuantity: Quantity;
  readonly remainingQuantity: Quantity;
  readonly unitCost: Money;
  readonly sourceType: InventoryBatchSource;
  readonly sourceReferenceId?: EntityId;
}

export type StockTransferStatus = "dispatched" | "partially_received" | "received" | "cancelled";

export interface StockTransferBatchAllocation {
  readonly sourceBatchId: EntityId;
  readonly destinationBatchId: EntityId;
  readonly quantity: Quantity;
  readonly receivedQuantity: Quantity;
  readonly batchCode?: string;
  readonly expirationDate?: string;
  readonly unitCostSnapshot: Money;
}

export interface StockTransferLine {
  readonly stockItemId: EntityId;
  readonly dispatchedQuantity: Quantity;
  readonly receivedQuantity: Quantity;
  readonly unitCostSnapshot: Money;
  readonly batchAllocations?: readonly StockTransferBatchAllocation[];
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

export type InventoryCountStatus = "counting" | "confirmed" | "cancelled";

export interface InventoryCountLine {
  readonly stockItemId: EntityId;
  readonly expectedQuantity: Quantity;
  readonly countedQuantity?: Quantity;
}

export interface InventoryCount {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly stockLocationId: EntityId;
  readonly status: InventoryCountStatus;
  readonly startedAt: string;
  readonly confirmedAt?: string;
  readonly responsibleUserId?: EntityId;
  readonly lines: readonly InventoryCountLine[];
}

export function createStockMovement(input: Omit<StockMovement, "id">): StockMovement {
  return Object.freeze({ id: newEntityId(), ...input });
}

export function createInventoryBatch(input: Omit<InventoryBatch, "id"> & { id?: EntityId }): InventoryBatch {
  return Object.freeze({ ...input, id: input.id ?? newEntityId() });
}

export function createStockTransfer(input: Omit<StockTransfer, "id" | "status" | "receivedAt">): StockTransfer {
  return Object.freeze({ id: newEntityId(), status: "dispatched" as const, ...input });
}

export function createInventoryCount(input: Omit<InventoryCount, "id" | "status" | "confirmedAt">): InventoryCount {
  return Object.freeze({ id: newEntityId(), status: "counting" as const, ...input });
}
