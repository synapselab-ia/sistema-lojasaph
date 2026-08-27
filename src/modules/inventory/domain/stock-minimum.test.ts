import { describe, expect, it } from "vitest";
import { Quantity } from "@/domain/common/quantity";
import { isBelowStockMinimum, parseStockMinimumQuantity } from "./stock-minimum";

describe("stock minimum policy", () => {
  it("accepts exact non-negative quantities including zero", () => {
    expect(parseStockMinimumQuantity("0").toDecimal()).toBe("0");
    expect(parseStockMinimumQuantity("12,375").toDecimal()).toBe("12.375");
  });

  it("rejects negative minimum quantities", () => {
    expect(() => parseStockMinimumQuantity("-0.001")).toThrow("O estoque mínimo deve ser maior ou igual a zero.");
  });

  it("alerts only when the authoritative balance is strictly below an active minimum", () => {
    const policy = { minimumQuantity: Quantity.fromDecimal("10"), active: true };
    expect(isBelowStockMinimum(Quantity.fromDecimal("9.999"), policy)).toBe(true);
    expect(isBelowStockMinimum(Quantity.fromDecimal("10"), policy)).toBe(false);
    expect(isBelowStockMinimum(Quantity.fromDecimal("10.001"), policy)).toBe(false);
  });

  it("does not alert without an active configured policy", () => {
    expect(isBelowStockMinimum(Quantity.zero(), undefined)).toBe(false);
    expect(isBelowStockMinimum(Quantity.zero(), { minimumQuantity: Quantity.fromDecimal("1"), active: false })).toBe(false);
  });
});
