import { Money } from "@/domain/common/money";
import { EntityId, newEntityId } from "@/domain/common/entity-id";

export interface SupplierItemOffer {
  readonly id: EntityId;
  readonly supplierId: EntityId;
  readonly stockItemId: EntityId;
  readonly unitPrice: Money;
  readonly observedAt: string;
}

export function createSupplierItemOffer(input: {
  supplierId: EntityId;
  stockItemId: EntityId;
  unitPrice: Money;
  observedAt?: string;
}): SupplierItemOffer {
  return Object.freeze({
    id: newEntityId(),
    supplierId: input.supplierId,
    stockItemId: input.stockItemId,
    unitPrice: input.unitPrice,
    observedAt: input.observedAt ?? new Date().toISOString(),
  });
}
