import { EntityId } from "@/domain/common/entity-id";
import { InventoryCount } from "../domain/inventory";

export interface InventoryCountRepository {
  findById(id: EntityId): Promise<InventoryCount | null>;
  list(): Promise<readonly InventoryCount[]>;
  save(count: InventoryCount): Promise<void>;
}
