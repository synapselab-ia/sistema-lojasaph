import { asEntityId } from "@/domain/common/entity-id";
import { describe, expect, it } from "vitest";
import { normalizeSupplierItemDraft } from "./supplier-items";

const stockItemId = asEntityId("00000000-0000-4000-8000-000000000400");

describe("supplier item normalization", () => {
  it("trims purchase unit and preserves exact package quantity", () => {
    const result = normalizeSupplierItemDraft({
      stockItemId,
      purchaseUnit: "  cx  ",
      unitsPerPackage: "12,500",
    });

    expect(result.purchaseUnit).toBe("cx");
    expect(result.unitsPerPackage?.toDecimal()).toBe("12.5");
    expect(result.active).toBe(true);
  });

  it("normalizes optional empty values to absence", () => {
    const result = normalizeSupplierItemDraft({
      stockItemId,
      purchaseUnit: "   ",
      unitsPerPackage: "",
      active: false,
    });

    expect(result.purchaseUnit).toBeUndefined();
    expect(result.unitsPerPackage).toBeUndefined();
    expect(result.active).toBe(false);
  });

  it.each(["0", "-1", "1.2345", "abc"])("rejects invalid package quantity %s", (unitsPerPackage) => {
    expect(() => normalizeSupplierItemDraft({ stockItemId, unitsPerPackage })).toThrow();
  });

  it("requires a stock item", () => {
    expect(() => normalizeSupplierItemDraft({ stockItemId: "" as typeof stockItemId })).toThrow();
  });
});
