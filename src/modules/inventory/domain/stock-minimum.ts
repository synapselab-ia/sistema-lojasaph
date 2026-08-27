import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Quantity } from "@/domain/common/quantity";

export interface StockMinimumPolicy {
  readonly id: EntityId;
  readonly stockItemId: EntityId;
  readonly stockLocationId: EntityId;
  readonly minimumQuantity: Quantity;
  readonly active: boolean;
}

export function parseStockMinimumQuantity(value: string): Quantity {
  const quantity = Quantity.fromDecimal(value);
  if (quantity.isNegative()) {
    throw new DomainError(
      "INVALID_STOCK_MINIMUM",
      "O estoque mínimo deve ser maior ou igual a zero.",
    );
  }
  return quantity;
}

export function isBelowStockMinimum(
  quantityOnHand: Quantity,
  policy: Pick<StockMinimumPolicy, "minimumQuantity" | "active"> | undefined,
): boolean {
  return Boolean(policy?.active && quantityOnHand.isLessThan(policy.minimumQuantity));
}
