import { EntityId } from "@/domain/common/entity-id";
import { InventoryBalance } from "../domain/inventory";
import { InventoryBalanceRepository } from "../repositories/inventory-balance-repository";

function key(stockItemId: EntityId, stockLocationId: EntityId): string {
  return `${stockLocationId}:${stockItemId}`;
}

export class InMemoryInventoryBalanceRepository implements InventoryBalanceRepository {
  private readonly balances = new Map<string, InventoryBalance>();

  constructor(initialBalances: readonly InventoryBalance[] = []) {
    initialBalances.forEach((balance) => this.balances.set(key(balance.stockItemId, balance.stockLocationId), balance));
  }

  async get(stockItemId: EntityId, stockLocationId: EntityId): Promise<InventoryBalance | null> {
    return this.balances.get(key(stockItemId, stockLocationId)) ?? null;
  }

  async list(): Promise<readonly InventoryBalance[]> {
    return [...this.balances.values()];
  }

  async save(balance: InventoryBalance): Promise<void> {
    this.balances.set(key(balance.stockItemId, balance.stockLocationId), Object.freeze(balance));
  }
}
