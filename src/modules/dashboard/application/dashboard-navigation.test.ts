import { describe, expect, it } from "vitest";
import { dashboardAttentionHref } from "./dashboard-navigation";

describe("dashboard navigation", () => {
  it.each([
    ["finance-overdue", "/workspace/financeiro/vencimentos"],
    ["finance-today", "/workspace/financeiro/vencimentos"],
    ["finance-soon", "/workspace/financeiro/vencimentos"],
    ["cash-discrepancy", "/workspace/caixa/sessoes"],
    ["cash-open", "/workspace/caixa/sessoes"],
    ["purchase-late", "/workspace/compras/pedidos"],
    ["purchase-soon", "/workspace/compras/pedidos"],
    ["expiry-expired", "/workspace/estoque/lotes"],
    ["expiry-soon", "/workspace/estoque/lotes"],
    ["stock-below-minimum", "/workspace/estoque/minimos"],
    ["transfers-in-transit", "/workspace/transferencias"],
    ["inventory-open", "/workspace/inventarios"],
  ])("routes %s to its consolidated journey", (key, expectedHref) => {
    expect(dashboardAttentionHref({ key, href: "/workspace" })).toBe(expectedHref);
  });

  it("preserves the read-model destination for an unknown signal", () => {
    expect(dashboardAttentionHref({ key: "future-signal", href: "/workspace/future" }))
      .toBe("/workspace/future");
  });
});
