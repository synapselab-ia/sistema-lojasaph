import { describe, expect, it } from "vitest";
import { DomainError } from "./domain-error";
import { Money } from "./money";

describe("Money", () => {
  it("parses decimal values without floating-point arithmetic", () => {
    expect(Money.fromDecimal("10.05").cents).toBe(1005);
    expect(Money.fromDecimal("10,50").toDecimal()).toBe("10.50");
  });

  it("adds and subtracts using integer cents", () => {
    const result = Money.fromDecimal("12.30").add(Money.fromDecimal("0.70"));
    expect(result.toDecimal()).toBe("13.00");
    expect(result.subtract(Money.fromDecimal("3.25")).toDecimal()).toBe("9.75");
  });

  it("rejects unsupported precision", () => {
    expect(() => Money.fromDecimal("1.234")).toThrow(DomainError);
  });
});
