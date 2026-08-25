import { describe, expect, it } from "vitest";
import { normalizeSupplierCommercialTermsDraft, hasSupplierTermValues } from "./commercial-terms";

describe("supplier commercial terms", () => {
  it("normalizes free text and exact monetary value", () => {
    const result = normalizeSupplierCommercialTermsDraft({
      notes: "  combinar pelo WhatsApp  ",
      minimumOrderValue: "150,75",
      paymentTerms: "  28 dias  ",
      orderSchedule: "  terça-feira  ",
      deliverySchedule: " quinta-feira ",
    });

    expect(result.notes).toBe("combinar pelo WhatsApp");
    expect(result.minimumOrderValue?.toDecimal()).toBe("150.75");
    expect(result.paymentTerms).toBe("28 dias");
    expect(result.orderSchedule).toBe("terça-feira");
    expect(result.deliverySchedule).toBe("quinta-feira");
    expect(hasSupplierTermValues(result)).toBe(true);
  });

  it("turns blank optional fields into absence without creating an empty term", () => {
    const result = normalizeSupplierCommercialTermsDraft({
      notes: "  ",
      minimumOrderValue: "",
      paymentTerms: " ",
      orderSchedule: "",
      deliverySchedule: "  ",
    });

    expect(result).toEqual({
      notes: undefined,
      minimumOrderValue: undefined,
      paymentTerms: undefined,
      orderSchedule: undefined,
      deliverySchedule: undefined,
    });
    expect(hasSupplierTermValues(result)).toBe(false);
  });

  it("rejects negative minimum order values", () => {
    expect(() => normalizeSupplierCommercialTermsDraft({ minimumOrderValue: "-0,01" }))
      .toThrow("O valor mínimo do pedido não pode ser negativo.");
  });

  it("rejects malformed money instead of coercing it through floating point", () => {
    expect(() => normalizeSupplierCommercialTermsDraft({ minimumOrderValue: "12,345" }))
      .toThrow();
  });
});
