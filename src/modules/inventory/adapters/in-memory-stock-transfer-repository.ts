import { EntityId } from "@/domain/common/entity-id";
import { StockTransfer } from "../domain/inventory";
import { StockTransferRepository } from "../repositories/stock-transfer-repository";

export class InMemoryStockTransferRepository implements StockTransferRepository {
  private readonly transfers = new Map<EntityId, StockTransfer>();

  constructor(initialTransfers: readonly StockTransfer[] = []) {
    initialTransfers.forEach((transfer) => this.transfers.set(transfer.id, transfer));
  }

  async findById(id: EntityId): Promise<StockTransfer | null> {
    return this.transfers.get(id) ?? null;
  }

  async list(): Promise<readonly StockTransfer[]> {
    return [...this.transfers.values()].sort((a, b) => b.dispatchedAt.localeCompare(a.dispatchedAt));
  }

  async save(transfer: StockTransfer): Promise<void> {
    this.transfers.set(transfer.id, Object.freeze(transfer));
  }
}
