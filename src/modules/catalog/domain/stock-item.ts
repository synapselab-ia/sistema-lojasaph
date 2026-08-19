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
  trackExpiration?: boolean;
  trackBatch?: boolean;
  isReturnable?: boolean;
}

export interface UpdateStockItemInput {
  categoryId: EntityId;
  name: string;
  baseUnitCode: string;
  type: StockItemType;
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

export function createStockItem(input: CreateStockItemInput): StockItem {
  return Object.freeze({
    id: newEntityId(),
    organizationId: input.organizationId,
    categoryId: normalizeCategoryId(input.categoryId),
    name: normalizeName(input.name),
    baseUnitCode: normalizeUnit(input.baseUnitCode),
    type: input.type,
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
    active: input.active,
    trackExpiration: input.trackExpiration,
    trackBatch: input.trackBatch,
    isReturnable: input.isReturnable,
  });
}
