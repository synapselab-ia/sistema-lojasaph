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
  readonly dateFrom?: string;
  readonly dateTo?: string;
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

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateDashboardPeriod(
  input: Pick<DashboardFilter, "dateFrom" | "dateTo">,
): void {
  const hasFrom = input.dateFrom !== undefined;
  const hasTo = input.dateTo !== undefined;

  if (!hasFrom && !hasTo) return;
  if (!hasFrom || !hasTo) throw new Error("DASHBOARD_PERIOD_INCOMPLETE");
  if (!isIsoDate(input.dateFrom!) || !isIsoDate(input.dateTo!)) {
    throw new Error("DASHBOARD_PERIOD_INVALID_DATE");
  }
  if (input.dateFrom! > input.dateTo!) throw new Error("DASHBOARD_PERIOD_INVALID_RANGE");
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

function matchesPeriod(
  value: string | undefined,
  filter: Pick<DashboardFilter, "dateFrom" | "dateTo">,
): boolean {
  if (!filter.dateFrom && !filter.dateTo) return true;
  if (!value || !filter.dateFrom || !filter.dateTo) return false;
  return value >= filter.dateFrom && value <= filter.dateTo;
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
  validateDashboardPeriod(filter);

  const horizonEnd = addIsoDays(filter.today, filter.horizonDays);
  const historyStart = addIsoDays(filter.today, -filter.horizonDays);

  // Finance period semantics are based on installment due_date. netPaidAmount is
  // still cumulative for each obligation; it is not a payment-event total.
  const finance = data.finance.filter(
    (row) => matchesScopedRow(row.unitId, row.sectorId, filter)
      && matchesPeriod(row.dueDate, filter),
  );
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

  // Open cash is current-state. Closed/discrepancy metrics use business_date and
  // are narrowed by an explicit managerial period when present. Cash has no
  // explicit Sector relationship, so Sector never narrows it.
  const cash = data.cash.filter((row) => matchesUnit(row.unitId, filter.unitId));
  const openCashCount = cash.filter((row) => row.status === "open").length;
  const closedCashInPeriod = cash.filter(
    (row) => row.status === "closed" && matchesPeriod(row.businessDate, filter),
  );
  const discrepancyCount = closedCashInPeriod.filter(
    (row) => (row.cashDifference?.cents ?? 0) !== 0,
  ).length;
  const recentClosedCount = closedCashInPeriod.filter(
    (row) => row.businessDate >= historyStart && row.businessDate <= filter.today,
  ).length;

  // Pending purchase orders are current-state. Delivery signals use the canonical
  // expected_delivery_date and exclude unknown dates from a selected period.
  const purchases = data.purchases.filter((row) => matchesScopedRow(row.unitId, row.sectorId, filter));
  const pendingPurchases = purchases.filter(
    (row) => row.status === "ordered" || row.status === "partially_received",
  );
  const datedDeliveries = pendingPurchases.filter(
    (row) => matchesPeriod(row.expectedDeliveryDate, filter),
  );
  const lateDeliveryCount = datedDeliveries.filter(
    (row) => row.expectedDeliveryDate !== undefined && row.expectedDeliveryDate < filter.today,
  ).length;
  const deliverySoonCount = datedDeliveries.filter(
    (row) => row.expectedDeliveryDate !== undefined
      && row.expectedDeliveryDate >= filter.today
      && row.expectedDeliveryDate <= horizonEnd,
  ).length;

  // Transfers in transit and open inventory counts are snapshots of current state;
  // there is no single event timestamp that truthfully turns them into period KPIs.
  const transfersInTransitCount = data.transfers.filter(
    (row) => matchesTransferScope(row, filter)
      && (row.status === "dispatched" || row.status === "partially_received"),
  ).length;
  const openInventoryCount = data.inventoryCounts.filter(
    (row) => matchesScopedRow(row.unitId, row.sectorId, filter)
      && (row.status === "counting" || row.status === "review"),
  ).length;

  // Expiry metrics use expiration_date as their canonical business date.
  const expiries = data.expiries.filter(
    (row) => matchesScopedRow(row.unitId, row.sectorId, filter)
      && matchesPeriod(row.expirationDate, filter),
  );
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
