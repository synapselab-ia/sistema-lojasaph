import { EntityId } from "@/domain/common/entity-id";
import { StockItem } from "../domain/stock-item";

export interface StockItemRepository {
  findById(id: EntityId): Promise<StockItem | null>;
  listByOrganization(organizationId: EntityId): Promise<readonly StockItem[]>;
  save(item: StockItem): Promise<void>;
}
