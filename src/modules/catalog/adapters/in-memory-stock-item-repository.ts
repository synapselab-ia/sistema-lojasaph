import { EntityId } from "@/domain/common/entity-id";
import { StockItem } from "../domain/stock-item";
import { StockItemRepository } from "../repositories/stock-item-repository";

export class InMemoryStockItemRepository implements StockItemRepository {
  private readonly items = new Map<EntityId, StockItem>();

  constructor(initialItems: readonly StockItem[] = []) {
    initialItems.forEach((item) => this.items.set(item.id, item));
  }

  async findById(id: EntityId): Promise<StockItem | null> {
    return this.items.get(id) ?? null;
  }

  async listByOrganization(organizationId: EntityId): Promise<readonly StockItem[]> {
    return [...this.items.values()]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }

  async save(item: StockItem): Promise<void> {
    this.items.set(item.id, item);
  }
}
