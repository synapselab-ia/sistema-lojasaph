import type { DashboardAttentionItem } from "./dashboard-summary";

const attentionDestinations: Readonly<Record<string, string>> = Object.freeze({
  "finance-overdue": "/workspace/financeiro/vencimentos",
  "finance-today": "/workspace/financeiro/vencimentos",
  "finance-soon": "/workspace/financeiro/vencimentos",
  "cash-discrepancy": "/workspace/caixa/sessoes",
  "cash-open": "/workspace/caixa/sessoes",
  "purchase-late": "/workspace/compras/pedidos",
  "purchase-soon": "/workspace/compras/pedidos",
  "expiry-expired": "/workspace/estoque/lotes",
  "expiry-soon": "/workspace/estoque/lotes",
  "stock-below-minimum": "/workspace/estoque/minimos",
  "transfers-in-transit": "/workspace/transferencias",
  "inventory-open": "/workspace/inventarios",
});

export function dashboardAttentionHref(
  item: Pick<DashboardAttentionItem, "key" | "href">,
): string {
  return attentionDestinations[item.key] ?? item.href;
}
