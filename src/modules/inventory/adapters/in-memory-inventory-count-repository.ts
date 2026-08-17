import { EntityId } from "@/domain/common/entity-id";
import { InventoryCount } from "../domain/inventory";
import { InventoryCountRepository } from "../repositories/inventory-count-repository";

export class InMemoryInventoryCountRepository implements InventoryCountRepository {
  private readonly counts = new Map<EntityId, InventoryCount>();

  async findById(id: EntityId): Promise<InventoryCount | null> {
    return this.counts.get(id) ?? null;
  }

  async list(): Promise<readonly InventoryCount[]> {
    return [...this.counts.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async save(count: InventoryCount): Promise<void> {
    this.counts.set(count.id, Object.freeze(count));
  }
}
