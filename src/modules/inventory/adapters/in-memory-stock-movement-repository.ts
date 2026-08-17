import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { StockMovement } from "../domain/inventory";
import { StockMovementRepository } from "../repositories/stock-movement-repository";

export class InMemoryStockMovementRepository implements StockMovementRepository {
  private readonly movements = new Map<EntityId, StockMovement>();

  constructor(initialMovements: readonly StockMovement[] = []) {
    initialMovements.forEach((movement) => this.movements.set(movement.id, movement));
  }

  async list(): Promise<readonly StockMovement[]> {
    return [...this.movements.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async append(movement: StockMovement): Promise<void> {
    if (this.movements.has(movement.id)) {
      throw new DomainError("DUPLICATE_STOCK_MOVEMENT", "Stock movement already exists.");
    }
    this.movements.set(movement.id, movement);
  }
}
