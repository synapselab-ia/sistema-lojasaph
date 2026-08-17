import { EntityId } from "@/domain/common/entity-id";
import { sortBatchesFefo } from "../domain/expiry";
import { InventoryBatch } from "../domain/inventory";
import { InventoryBatchRepository } from "../repositories/inventory-batch-repository";

export class InMemoryInventoryBatchRepository implements InventoryBatchRepository {
  private readonly batches = new Map<EntityId, InventoryBatch>();

  constructor(initialBatches: readonly InventoryBatch[] = []) {
    initialBatches.forEach((batch) => this.batches.set(batch.id, batch));
  }

  async findById(id: EntityId): Promise<InventoryBatch | null> {
    return this.batches.get(id) ?? null;
  }

  async list(): Promise<readonly InventoryBatch[]> {
    return sortBatchesFefo([...this.batches.values()]);
  }

  async listByItemLocation(stockItemId: EntityId, stockLocationId: EntityId): Promise<readonly InventoryBatch[]> {
    return sortBatchesFefo(
      [...this.batches.values()].filter(
        (batch) => batch.stockItemId === stockItemId && batch.stockLocationId === stockLocationId,
      ),
    );
  }

  async save(batch: InventoryBatch): Promise<void> {
    this.batches.set(batch.id, Object.freeze(batch));
  }
}
