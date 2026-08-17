import { EntityId } from "@/domain/common/entity-id";
import { StockTransfer } from "../domain/inventory";

export interface StockTransferRepository {
  findById(id: EntityId): Promise<StockTransfer | null>;
  list(): Promise<readonly StockTransfer[]>;
  save(transfer: StockTransfer): Promise<void>;
}
