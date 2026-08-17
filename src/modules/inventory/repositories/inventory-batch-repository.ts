import { EntityId } from "@/domain/common/entity-id";
import { InventoryBatch } from "../domain/inventory";

export interface InventoryBatchRepository {
  findById(id: EntityId): Promise<InventoryBatch | null>;
  list(): Promise<readonly InventoryBatch[]>;
  listByItemLocation(stockItemId: EntityId, stockLocationId: EntityId): Promise<readonly InventoryBatch[]>;
  save(batch: InventoryBatch): Promise<void>;
}
