import { describe, expect, it } from "vitest";
import { DomainError } from "./domain-error";
import { Quantity } from "./quantity";

describe("Quantity", () => {
  it("supports up to three decimal places without binary floating point", () => {
    expect(Quantity.fromDecimal("1.250").milliunits).toBe(1250);
    expect(Quantity.fromDecimal("0,125").toDecimal()).toBe("0.125");
  });

  it("adds and subtracts exact milliunits", () => {
    expect(Quantity.fromDecimal("2.5").add(Quantity.fromDecimal("0.25")).toDecimal()).toBe("2.75");
    expect(Quantity.fromDecimal("2.5").subtract(Quantity.fromDecimal("1")).toDecimal()).toBe("1.5");
  });

  it("rejects unsupported precision", () => {
    expect(() => Quantity.fromDecimal("1.0001")).toThrow(DomainError);
  });
});
