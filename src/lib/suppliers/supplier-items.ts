import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Quantity } from "@/domain/common/quantity";

export interface SupplierItemLink {
  readonly id: EntityId;
  readonly stockItemId: EntityId;
  readonly purchaseUnit?: string;
  readonly unitsPerPackage?: Quantity;
  readonly active: boolean;
}

export interface SupplierItemDraft {
  readonly stockItemId: EntityId;
  readonly purchaseUnit?: string;
  readonly unitsPerPackage?: string;
  readonly active?: boolean;
}

export interface NormalizedSupplierItemDraft {
  readonly stockItemId: EntityId;
  readonly purchaseUnit?: string;
  readonly unitsPerPackage?: Quantity;
  readonly active: boolean;
}

function optionalText(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function normalizeSupplierItemDraft(input: SupplierItemDraft): NormalizedSupplierItemDraft {
  if (!input.stockItemId?.trim()) {
    throw new DomainError("SUPPLIER_ITEM_STOCK_ITEM_REQUIRED", "Selecione um produto para o fornecedor.");
  }

  const rawPackageQuantity = input.unitsPerPackage?.trim();
  let unitsPerPackage: Quantity | undefined;
  if (rawPackageQuantity) {
    try {
      unitsPerPackage = Quantity.fromDecimal(rawPackageQuantity);
    } catch {
      throw new DomainError(
        "INVALID_SUPPLIER_PACKAGE_QUANTITY",
        "A quantidade por embalagem deve ser um número positivo com até três casas decimais.",
      );
    }
    if (!unitsPerPackage.isPositive()) {
      throw new DomainError(
        "INVALID_SUPPLIER_PACKAGE_QUANTITY",
        "A quantidade por embalagem deve ser maior que zero.",
      );
    }
  }

  return Object.freeze({
    stockItemId: input.stockItemId,
    purchaseUnit: optionalText(input.purchaseUnit),
    unitsPerPackage,
    active: input.active ?? true,
  });
}
