import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";

export type StockItemType = "consumable" | "merchandise" | "reusable" | "supply";

export interface StockItem {
  readonly id: EntityId;
  readonly organizationId: EntityId;
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
  name: string;
  baseUnitCode: string;
  type: StockItemType;
  trackExpiration?: boolean;
  trackBatch?: boolean;
  isReturnable?: boolean;
}

export function createStockItem(input: CreateStockItemInput): StockItem {
  const name = input.name.trim();
  const baseUnitCode = input.baseUnitCode.trim().toLowerCase();

  if (!name) {
    throw new DomainError("INVALID_STOCK_ITEM_NAME", "Stock item name is required.");
  }

  if (!baseUnitCode) {
    throw new DomainError("INVALID_UNIT", "Base unit is required.");
  }

  return Object.freeze({
    id: newEntityId(),
    organizationId: input.organizationId,
    name,
    baseUnitCode,
    type: input.type,
    active: true,
    trackExpiration: input.trackExpiration ?? false,
    trackBatch: input.trackBatch ?? false,
    isReturnable: input.isReturnable ?? input.type === "reusable",
  });
}
