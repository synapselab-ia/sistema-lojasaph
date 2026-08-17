import { EntityId } from "@/domain/common/entity-id";
import { StockItem } from "../domain/stock-item";
import { StockItemRepository } from "../repositories/stock-item-repository";

export class InMemoryStockItemRepository implements StockItemRepository {
  private readonly items = new Map<EntityId, StockItem>();

  async findById(id: EntityId): Promise<StockItem | null> {
    return this.items.get(id) ?? null;
  }

  async listByOrganization(organizationId: EntityId): Promise<readonly StockItem[]> {
    return [...this.items.values()].filter((item) => item.organizationId === organizationId);
  }

  async save(item: StockItem): Promise<void> {
    this.items.set(item.id, item);
  }
}
