import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/common/domain-error";
import { asEntityId, type EntityId } from "@/domain/common/entity-id";
import { createStockItem, updateStockItem } from "./stock-item";

const organizationId = asEntityId("org-test");
const categoryId = asEntityId("category-test");

function expectCategoryRequired(action: () => unknown) {
  try {
    action();
    throw new Error("expected stock item category validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe("STOCK_ITEM_CATEGORY_REQUIRED");
  }
}

describe("stock item category contract", () => {
  it("requires a category when creating a stock item", () => {
    expectCategoryRequired(() =>
      createStockItem({
        organizationId,
        categoryId: undefined as unknown as EntityId,
        name: "Água",
        baseUnitCode: "un",
        type: "merchandise",
      }),
    );
  });

  it("requires a category when updating a stock item", () => {
    const item = createStockItem({
      organizationId,
      categoryId,
      name: "Água",
      baseUnitCode: "un",
      type: "merchandise",
    });

    expectCategoryRequired(() =>
      updateStockItem(item, {
        categoryId: "   " as EntityId,
        name: item.name,
        baseUnitCode: item.baseUnitCode,
        type: item.type,
        active: item.active,
        trackExpiration: item.trackExpiration,
        trackBatch: item.trackBatch,
        isReturnable: item.isReturnable,
      }),
    );
  });
});
