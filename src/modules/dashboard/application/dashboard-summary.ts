import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";

export type DashboardSeverity = "high" | "medium";

export interface DashboardAttentionItem {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly href: string;
  readonly severity: DashboardSeverity;
}

export interface DashboardFinanceRow {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly sectorId?: EntityId;
  readonly nominalAmount: Money;
  readonly netPaidAmount: Money;
  readonly balanceAmount: Money;
  readonly status: "cancelled" | "paid" | "overdue" | "due_today" | "upcoming";
  readonly dueDate: string;
}

export interface DashboardCashRow {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly businessDate: string;
  readonly status: "open" | "closed" | "cancelled";
  readonly cashDifference?: Money;
}

export interface DashboardPurchaseRow {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly sectorId?: EntityId;
  readonly status: "draft" | "ordered" | "partially_received" | "received" | "cancelled";
  readonly expectedDeliveryDate?: string;
}

export interface DashboardTransferRow {
  readonly id: EntityId;
  readonly sourceUnitId: EntityId;
  readonly sourceSectorId?: EntityId;
  readonly destinationUnitId: EntityId;
  readonly destinationSectorId?: EntityId;
  readonly status: "dispatched" | "partially_received" | "received";
}

export interface DashboardInventoryCountRow {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly sectorId?: EntityId;
  readonly status: "counting" | "review" | "confirmed" | "cancelled";
}

export interface DashboardExpiryRow {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly sectorId?: EntityId;
  readonly expirationDate: string;
}

export interface DashboardRawData {
  readonly finance: readonly DashboardFinanceRow[];
  readonly cash: readonly DashboardCashRow[];
  readonly purchases: readonly DashboardPurchaseRow[];
  readonly transfers: readonly DashboardTransferRow[];
  readonly inventoryCounts: readonly DashboardInventoryCountRow[];
  readonly expiries: readonly DashboardExpiryRow[];
}

export interface DashboardFilter {
  readonly today: string;
  readonly horizonDays: number;
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
}

export interface DashboardSummary {
  readonly finance: {
    readonly nominal: Money;
    readonly paid: Money;
    readonly openBalance: Money;
    readonly overdueCount: number;
    readonly dueTodayCount: number;
    readonly dueSoonCount: number;
  };
  readonly cash: {
    readonly openCount: number;
    readonly discrepancyCount: number;
    readonly recentClosedCount: number;
  };
  readonly purchases: {
    readonly pendingCount: number;
    readonly lateDeliveryCount: number;
    readonly deliverySoonCount: number;
  };
  readonly stock: {
    readonly transfersInTransitCount: number;
    readonly openInventoryCount: number;
    readonly expiredBatchCount: number;
    readonly expiringSoonCount: number;
  };
  readonly attention: readonly DashboardAttentionItem[];
}

function addIsoDays(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function sumMoney(values: readonly Money[]): Money {
  return values.reduce((total, value) => total.add(value), Money.zero());
}

function matchesUnit(unitId: EntityId, filterUnitId?: EntityId): boolean {
  return !filterUnitId || unitId === filterUnitId;
}

function matchesScopedRow(
  unitId: EntityId,
  sectorId: EntityId | undefined,
  filter: Pick<DashboardFilter, "unitId" | "sectorId">,
): boolean {
  if (filter.unitId && unitId !== filter.unitId) return false;
  if (filter.sectorId && sectorId !== filter.sectorId) return false;
  return true;
}

function matchesTransferScope(
  row: DashboardTransferRow,
  filter: Pick<DashboardFilter, "unitId" | "sectorId">,
): boolean {
  if (!filter.unitId && !filter.sectorId) return true;

  return matchesScopedRow(row.sourceUnitId, row.sourceSectorId, filter)
    || matchesScopedRow(row.destinationUnitId, row.destinationSectorId, filter);
}

function pushAttention(
  target: DashboardAttentionItem[],
  item: DashboardAttentionItem,
): void {
  if (item.count > 0) target.push(Object.freeze(item));
}

export function localIsoDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function buildDashboardSummary(
  data: DashboardRawData,
  filter: DashboardFilter,
): DashboardSummary {
  if (!Number.isInteger(filter.horizonDays) || filter.horizonDays < 1 || filter.horizonDays > 365) {
    throw new Error("Dashboard horizon must be an integer between 1 and 365 days.");
  }

  const horizonEnd = addIsoDays(filter.today, filter.horizonDays);
  const historyStart = addIsoDays(filter.today, -filter.horizonDays);

  const finance = data.finance.filter((row) => matchesScopedRow(row.unitId, row.sectorId, filter));
  const activeFinance = finance.filter((row) => row.status !== "cancelled");
  const nominal = sumMoney(activeFinance.map((row) => row.nominalAmount));
  const paid = sumMoney(activeFinance.map((row) => row.netPaidAmount));
  const openBalance = sumMoney(
    activeFinance
      .filter((row) => row.balanceAmount.cents > 0)
      .map((row) => row.balanceAmount),
  );
  const overdueCount = activeFinance.filter((row) => row.status === "overdue").length;
  const dueTodayCount = activeFinance.filter((row) => row.status === "due_today").length;
  const dueSoonCount = activeFinance.filter(
    (row) => row.status === "upcoming" && row.dueDate > filter.today && row.dueDate <= horizonEnd,
  ).length;

  // Cash has no explicit Sector relationship in the current model. Sector filters
  // therefore never narrow it; only the existing Unit/horizon scope applies.
  const cash = data.cash.filter((row) => matchesUnit(row.unitId, filter.unitId));
  const openCashCount = cash.filter((row) => row.status === "open").length;
  const discrepancyCount = cash.filter(
    (row) => row.status === "closed" && (row.cashDifference?.cents ?? 0) !== 0,
  ).length;
  const recentClosedCount = cash.filter(
    (row) => row.status === "closed" && row.businessDate >= historyStart && row.businessDate <= filter.today,
  ).length;

  const purchases = data.purchases.filter((row) => matchesScopedRow(row.unitId, row.sectorId, filter));
  const pendingPurchases = purchases.filter(
    (row) => row.status === "ordered" || row.status === "partially_received",
  );
  const lateDeliveryCount = pendingPurchases.filter(
    (row) => row.expectedDeliveryDate !== undefined && row.expectedDeliveryDate < filter.today,
  ).length;
  const deliverySoonCount = pendingPurchases.filter(
    (row) => row.expectedDeliveryDate !== undefined
      && row.expectedDeliveryDate >= filter.today
      && row.expectedDeliveryDate <= horizonEnd,
  ).length;

  const transfersInTransitCount = data.transfers.filter(
    (row) => matchesTransferScope(row, filter)
      && (row.status === "dispatched" || row.status === "partially_received"),
  ).length;
  const openInventoryCount = data.inventoryCounts.filter(
    (row) => matchesScopedRow(row.unitId, row.sectorId, filter)
      && (row.status === "counting" || row.status === "review"),
  ).length;
  const expiries = data.expiries.filter((row) => matchesScopedRow(row.unitId, row.sectorId, filter));
  const expiredBatchCount = expiries.filter((row) => row.expirationDate < filter.today).length;
  const expiringSoonCount = expiries.filter(
    (row) => row.expirationDate >= filter.today && row.expirationDate <= horizonEnd,
  ).length;

  const attention: DashboardAttentionItem[] = [];
  pushAttention(attention, { key: "finance-overdue", label: "Parcelas vencidas", count: overdueCount, href: "/workspace/financeiro", severity: "high" });
  pushAttention(attention, { key: "finance-today", label: "Parcelas vencendo hoje", count: dueTodayCount, href: "/workspace/financeiro", severity: "high" });
  pushAttention(attention, { key: "cash-discrepancy", label: "Fechamentos com divergência", count: discrepancyCount, href: "/workspace/caixa", severity: "high" });
  pushAttention(attention, { key: "purchase-late", label: "Pedidos com entrega prevista atrasada", count: lateDeliveryCount, href: "/workspace/compras", severity: "high" });
  pushAttention(attention, { key: "expiry-expired", label: "Lotes vencidos com saldo", count: expiredBatchCount, href: "/workspace/estoque", severity: "high" });
  pushAttention(attention, { key: "finance-soon", label: `Parcelas nos próximos ${filter.horizonDays} dias`, count: dueSoonCount, href: "/workspace/financeiro", severity: "medium" });
  pushAttention(attention, { key: "cash-open", label: "Sessões de caixa abertas", count: openCashCount, href: "/workspace/caixa", severity: "medium" });
  pushAttention(attention, { key: "purchase-soon", label: `Entregas previstas nos próximos ${filter.horizonDays} dias`, count: deliverySoonCount, href: "/workspace/compras", severity: "medium" });
  pushAttention(attention, { key: "expiry-soon", label: `Lotes vencendo nos próximos ${filter.horizonDays} dias`, count: expiringSoonCount, href: "/workspace/estoque", severity: "medium" });
  pushAttention(attention, { key: "transfers-in-transit", label: "Transferências em trânsito", count: transfersInTransitCount, href: "/workspace/transferencias", severity: "medium" });
  pushAttention(attention, { key: "inventory-open", label: "Inventários físicos em andamento", count: openInventoryCount, href: "/workspace/inventarios", severity: "medium" });

  return Object.freeze({
    finance: Object.freeze({ nominal, paid, openBalance, overdueCount, dueTodayCount, dueSoonCount }),
    cash: Object.freeze({ openCount: openCashCount, discrepancyCount, recentClosedCount }),
    purchases: Object.freeze({ pendingCount: pendingPurchases.length, lateDeliveryCount, deliverySoonCount }),
    stock: Object.freeze({ transfersInTransitCount, openInventoryCount, expiredBatchCount, expiringSoonCount }),
    attention: Object.freeze(attention),
  });
}
