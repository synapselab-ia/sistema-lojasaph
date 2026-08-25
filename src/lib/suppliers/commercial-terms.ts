import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";

export interface SupplierCommercialTerms {
  readonly supplierId: EntityId;
  readonly termId?: EntityId;
  readonly notes?: string;
  readonly minimumOrderValue?: Money;
  readonly paymentTerms?: string;
  readonly orderSchedule?: string;
  readonly deliverySchedule?: string;
}

export interface SupplierCommercialTermsDraft {
  readonly notes?: string;
  readonly minimumOrderValue?: string;
  readonly paymentTerms?: string;
  readonly orderSchedule?: string;
  readonly deliverySchedule?: string;
}

export interface NormalizedSupplierCommercialTermsDraft {
  readonly notes?: string;
  readonly minimumOrderValue?: Money;
  readonly paymentTerms?: string;
  readonly orderSchedule?: string;
  readonly deliverySchedule?: string;
}

function optionalText(value?: string): string | undefined {
  return value?.trim() || undefined;
}

export function normalizeSupplierCommercialTermsDraft(
  input: SupplierCommercialTermsDraft,
): NormalizedSupplierCommercialTermsDraft {
  const minimumOrderText = optionalText(input.minimumOrderValue);
  const minimumOrderValue = minimumOrderText ? Money.fromDecimal(minimumOrderText) : undefined;

  if (minimumOrderValue?.isNegative()) {
    throw new DomainError(
      "INVALID_SUPPLIER_MINIMUM_ORDER",
      "O valor mínimo do pedido não pode ser negativo.",
    );
  }

  return Object.freeze({
    notes: optionalText(input.notes),
    minimumOrderValue,
    paymentTerms: optionalText(input.paymentTerms),
    orderSchedule: optionalText(input.orderSchedule),
    deliverySchedule: optionalText(input.deliverySchedule),
  });
}

export function hasSupplierTermValues(
  input: NormalizedSupplierCommercialTermsDraft,
): boolean {
  return Boolean(
    input.minimumOrderValue
      || input.paymentTerms
      || input.orderSchedule
      || input.deliverySchedule,
  );
}
