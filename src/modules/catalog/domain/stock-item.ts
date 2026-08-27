import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";

export type StockItemType = "consumable" | "merchandise" | "reusable" | "supply";

export interface StockItem {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly categoryId: EntityId;
  readonly name: string;
  readonly baseUnitCode: string;
  readonly type: StockItemType;
  readonly ean?: string;
  readonly ncm?: string;
  readonly cest?: string;
  readonly active: boolean;
  readonly trackExpiration: boolean;
  readonly trackBatch: boolean;
  readonly isReturnable: boolean;
}

export interface CreateStockItemInput {
  organizationId: EntityId;
  categoryId: EntityId;
  name: string;
  baseUnitCode: string;
  type: StockItemType;
  ean?: string;
  ncm?: string;
  cest?: string;
  trackExpiration?: boolean;
  trackBatch?: boolean;
  isReturnable?: boolean;
}

export interface UpdateStockItemInput {
  categoryId: EntityId;
  name: string;
  baseUnitCode: string;
  type: StockItemType;
  ean?: string;
  ncm?: string;
  cest?: string;
  active: boolean;
  trackExpiration: boolean;
  trackBatch: boolean;
  isReturnable: boolean;
}

function normalizeCategoryId(value: EntityId | null | undefined): EntityId {
  if (!value || !value.trim()) {
    throw new DomainError("STOCK_ITEM_CATEGORY_REQUIRED", "Stock item category is required.");
  }
  return value.trim() as EntityId;
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new DomainError("INVALID_STOCK_ITEM_NAME", "Stock item name is required.");
  }
  return name;
}

function normalizeUnit(value: string): string {
  const unit = value.trim().toLowerCase();
  if (!unit) {
    throw new DomainError("INVALID_UNIT", "Base unit is required.");
  }
  return unit;
}

function normalizeOptionalIdentifier(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function updatedOptionalIdentifier(
  item: StockItem,
  input: UpdateStockItemInput,
  field: "ean" | "ncm" | "cest",
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(input, field)) return item[field];
  return normalizeOptionalIdentifier(input[field]);
}

export function createStockItem(input: CreateStockItemInput): StockItem {
  return Object.freeze({
    id: newEntityId(),
    organizationId: input.organizationId,
    categoryId: normalizeCategoryId(input.categoryId),
    name: normalizeName(input.name),
    baseUnitCode: normalizeUnit(input.baseUnitCode),
    type: input.type,
    ean: normalizeOptionalIdentifier(input.ean),
    ncm: normalizeOptionalIdentifier(input.ncm),
    cest: normalizeOptionalIdentifier(input.cest),
    active: true,
    trackExpiration: input.trackExpiration ?? false,
    trackBatch: input.trackBatch ?? false,
    isReturnable: input.isReturnable ?? input.type === "reusable",
  });
}

export function updateStockItem(item: StockItem, input: UpdateStockItemInput): StockItem {
  return Object.freeze({
    ...item,
    categoryId: normalizeCategoryId(input.categoryId),
    name: normalizeName(input.name),
    baseUnitCode: normalizeUnit(input.baseUnitCode),
    type: input.type,
    ean: updatedOptionalIdentifier(item, input, "ean"),
    ncm: updatedOptionalIdentifier(item, input, "ncm"),
    cest: updatedOptionalIdentifier(item, input, "cest"),
    active: input.active,
    trackExpiration: input.trackExpiration,
    trackBatch: input.trackBatch,
    isReturnable: input.isReturnable,
  });
}
