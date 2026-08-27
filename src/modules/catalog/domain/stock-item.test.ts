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

describe("stock item optional identifiers", () => {
  it("trims EAN, NCM and CEST when creating an item", () => {
    const item = createStockItem({
      organizationId,
      categoryId,
      name: "Água",
      baseUnitCode: "un",
      type: "merchandise",
      ean: " 7891234567890 ",
      ncm: " 2201.10.00 ",
      cest: " 03.001.00 ",
    });

    expect(item.ean).toBe("7891234567890");
    expect(item.ncm).toBe("2201.10.00");
    expect(item.cest).toBe("03.001.00");
  });

  it("stores blank optional identifiers as absence", () => {
    const item = createStockItem({
      organizationId,
      categoryId,
      name: "Água",
      baseUnitCode: "un",
      type: "merchandise",
      ean: "   ",
      ncm: "",
      cest: "  ",
    });

    expect(item.ean).toBeUndefined();
    expect(item.ncm).toBeUndefined();
    expect(item.cest).toBeUndefined();
  });

  it("preserves identifiers when an update does not address those fields", () => {
    const item = createStockItem({
      organizationId,
      categoryId,
      name: "Água",
      baseUnitCode: "un",
      type: "merchandise",
      ean: "7891234567890",
      ncm: "2201.10.00",
      cest: "03.001.00",
    });

    const updated = updateStockItem(item, {
      categoryId,
      name: "Água mineral",
      baseUnitCode: item.baseUnitCode,
      type: item.type,
      active: item.active,
      trackExpiration: item.trackExpiration,
      trackBatch: item.trackBatch,
      isReturnable: item.isReturnable,
    });

    expect(updated.ean).toBe(item.ean);
    expect(updated.ncm).toBe(item.ncm);
    expect(updated.cest).toBe(item.cest);
  });

  it("allows explicit blank values to clear identifiers on update", () => {
    const item = createStockItem({
      organizationId,
      categoryId,
      name: "Água",
      baseUnitCode: "un",
      type: "merchandise",
      ean: "7891234567890",
      ncm: "2201.10.00",
      cest: "03.001.00",
    });

    const updated = updateStockItem(item, {
      categoryId,
      name: item.name,
      baseUnitCode: item.baseUnitCode,
      type: item.type,
      ean: " ",
      ncm: " 2201.90.00 ",
      cest: "",
      active: item.active,
      trackExpiration: item.trackExpiration,
      trackBatch: item.trackBatch,
      isReturnable: item.isReturnable,
    });

    expect(updated.ean).toBeUndefined();
    expect(updated.ncm).toBe("2201.90.00");
    expect(updated.cest).toBeUndefined();
  });
});
