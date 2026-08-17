import { StockMovement } from "../domain/inventory";

export interface StockMovementRepository {
  list(): Promise<readonly StockMovement[]>;
  append(movement: StockMovement): Promise<void>;
}
