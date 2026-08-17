import { EntityId } from "@/domain/common/entity-id";
import { InventoryBalance } from "../domain/inventory";

export interface InventoryBalanceRepository {
  get(stockItemId: EntityId, stockLocationId: EntityId): Promise<InventoryBalance | null>;
  list(): Promise<readonly InventoryBalance[]>;
  save(balance: InventoryBalance): Promise<void>;
}
