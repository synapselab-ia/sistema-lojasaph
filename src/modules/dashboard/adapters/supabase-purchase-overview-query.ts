import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { validateDashboardPeriod } from "../application/dashboard-summary";
import { stockPeriodUtcBounds as dashboardPeriodUtcBounds } from "./supabase-stock-overview-query";

const PAGE_SIZE = 1000;
const PRICE_CHANGE_LIMIT = 6;

export interface PurchaseOverviewQueryInput {
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly timeZone: string;
}

export interface SupplierPurchaseHistory {
  readonly supplierId: EntityId;
  readonly supplierName: string;
  readonly issuedOrderCount: number;
  readonly receiptCount: number;
  readonly lastActivityAt: string | null;
}

export interface SupplierPriceChange {
  readonly supplierItemId: EntityId;
  readonly supplierName: string;
  readonly stockItemName: string;
  readonly previousPrice: Money;
  readonly currentPrice: Money;
  readonly delta: Money;
  readonly observedAt: string;
}

export interface PurchaseOverviewSnapshot {
  readonly issuedOrderCount: number;
  readonly receiptCount: number;
  readonly suppliersWithOrdersCount: number;
  readonly supplierHistory: readonly SupplierPurchaseHistory[];
  readonly priceObservationCount: number;
  readonly comparablePriceItemCount: number;
  readonly changedPriceItemCount: number;
  readonly recentPriceChanges: readonly SupplierPriceChange[];
}

interface LocationRow { readonly id: string }
export interface SupplierRow { readonly id: string; readonly trade_name: string }
export interface SupplierItemRow {
  readonly id: string;
  readonly supplier_id: string;
  readonly stock_item_id: string;
}
export interface StockItemRow { readonly id: string; readonly name: string }
export interface PurchaseOrderRow {
  readonly id: string;
  readonly supplier_id: string;
  readonly stock_location_id: string;
  readonly ordered_at: string;
}
export interface PurchaseReceiptRow {
  readonly id: string;
  readonly purchase_order_id: string;
  readonly received_at: string;
}
export interface SupplierPriceRow {
  readonly id: string;
  readonly supplier_item_id: string;
  readonly unit_price: number | string;
  readonly observed_at: string;
}

interface QueryPage<T> {
  readonly data: T[] | null;
  readonly error: { readonly message: string } | null;
}

function queryError(scope: string, message: string): Error {
  return new Error(`Não foi possível carregar ${scope}: ${message}`);
}

async function collectPages<T>(
  loadPage: (from: number, to: number) => Promise<QueryPage<T>>,
  scope: string,
): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE;
    const result = await loadPage(from, from + PAGE_SIZE - 1);
    if (result.error) throw queryError(scope, result.error.message);

    const pageRows = result.data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) return rows;
  }
}

function inUtcPeriod(
  value: string,
  bounds: Readonly<{ startInclusive: string; endExclusive: string }> | undefined,
): boolean {
  if (!bounds) return true;
  return value >= bounds.startInclusive && value < bounds.endExclusive;
}

function laterTimestamp(current: string | null, candidate: string): string {
  return current === null || candidate > current ? candidate : current;
}

export function summarizeSupplierPurchases(
  issuedOrders: readonly PurchaseOrderRow[],
  receipts: readonly PurchaseReceiptRow[],
  orderLookup: readonly PurchaseOrderRow[],
  suppliers: readonly SupplierRow[],
): readonly SupplierPurchaseHistory[] {
  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.trade_name]));
  const supplierByOrder = new Map(orderLookup.map((order) => [order.id, order.supplier_id]));
  const summaries = new Map<string, {
    issuedOrderCount: number;
    receiptCount: number;
    lastActivityAt: string | null;
  }>();

  for (const order of issuedOrders) {
    const current = summaries.get(order.supplier_id) ?? {
      issuedOrderCount: 0,
      receiptCount: 0,
      lastActivityAt: null,
    };
    current.issuedOrderCount += 1;
    current.lastActivityAt = laterTimestamp(current.lastActivityAt, order.ordered_at);
    summaries.set(order.supplier_id, current);
  }

  for (const receipt of receipts) {
    const supplierId = supplierByOrder.get(receipt.purchase_order_id);
    if (!supplierId) continue;
    const current = summaries.get(supplierId) ?? {
      issuedOrderCount: 0,
      receiptCount: 0,
      lastActivityAt: null,
    };
    current.receiptCount += 1;
    current.lastActivityAt = laterTimestamp(current.lastActivityAt, receipt.received_at);
    summaries.set(supplierId, current);
  }

  return [...summaries.entries()]
    .map(([supplierId, summary]) => Object.freeze({
      supplierId: supplierId as EntityId,
      supplierName: supplierNames.get(supplierId) ?? "Fornecedor sem nome disponível",
      issuedOrderCount: summary.issuedOrderCount,
      receiptCount: summary.receiptCount,
      lastActivityAt: summary.lastActivityAt,
    }))
    .sort((left, right) => {
      if (left.lastActivityAt !== right.lastActivityAt) {
        return (right.lastActivityAt ?? "").localeCompare(left.lastActivityAt ?? "");
      }
      return left.supplierName.localeCompare(right.supplierName, "pt-BR");
    });
}

export function buildSupplierPriceChanges(
  priceRows: readonly SupplierPriceRow[],
  supplierItems: readonly SupplierItemRow[],
  suppliers: readonly SupplierRow[],
  stockItems: readonly StockItemRow[],
): Readonly<{
  comparablePriceItemCount: number;
  changedPriceItemCount: number;
  recentPriceChanges: readonly SupplierPriceChange[];
}> {
  const supplierItemById = new Map(supplierItems.map((item) => [item.id, item]));
  const supplierNameById = new Map(suppliers.map((supplier) => [supplier.id, supplier.trade_name]));
  const stockItemById = new Map(stockItems.map((item) => [item.id, item]));
  const observations = new Map<string, SupplierPriceRow[]>();

  for (const row of priceRows) {
    const grouped = observations.get(row.supplier_item_id) ?? [];
    grouped.push(row);
    observations.set(row.supplier_item_id, grouped);
  }

  let comparablePriceItemCount = 0;
  const changes: SupplierPriceChange[] = [];

  for (const [supplierItemId, rows] of observations.entries()) {
    if (rows.length < 2) continue;
    comparablePriceItemCount += 1;

    const ordered = [...rows].sort((left, right) => {
      const byObservedAt = left.observed_at.localeCompare(right.observed_at);
      return byObservedAt !== 0 ? byObservedAt : left.id.localeCompare(right.id);
    });
    const previous = ordered[ordered.length - 2];
    const current = ordered[ordered.length - 1];
    const previousPrice = Money.fromDecimal(String(previous.unit_price));
    const currentPrice = Money.fromDecimal(String(current.unit_price));
    if (previousPrice.cents === currentPrice.cents) continue;

    const supplierItem = supplierItemById.get(supplierItemId);
    if (!supplierItem) continue;
    const stockItem = stockItemById.get(supplierItem.stock_item_id);
    if (!stockItem) continue;

    changes.push(Object.freeze({
      supplierItemId: supplierItemId as EntityId,
      supplierName: supplierNameById.get(supplierItem.supplier_id) ?? "Fornecedor sem nome disponível",
      stockItemName: stockItem.name,
      previousPrice,
      currentPrice,
      delta: currentPrice.subtract(previousPrice),
      observedAt: current.observed_at,
    }));
  }

  changes.sort((left, right) => {
    const byObservedAt = right.observedAt.localeCompare(left.observedAt);
    if (byObservedAt !== 0) return byObservedAt;
    const bySupplier = left.supplierName.localeCompare(right.supplierName, "pt-BR");
    return bySupplier !== 0 ? bySupplier : left.stockItemName.localeCompare(right.stockItemName, "pt-BR");
  });

  return Object.freeze({
    comparablePriceItemCount,
    changedPriceItemCount: changes.length,
    recentPriceChanges: Object.freeze(changes.slice(0, PRICE_CHANGE_LIMIT)),
  });
}

export class SupabasePurchaseOverviewQuery {
  constructor(private readonly client: SupabaseClient) {}

  async load(
    organizationId: EntityId,
    input: PurchaseOverviewQueryInput,
  ): Promise<PurchaseOverviewSnapshot> {
    validateDashboardPeriod(input);
    const hasExplicitScope = Boolean(input.unitId || input.sectorId);
    const bounds = input.dateFrom && input.dateTo
      ? dashboardPeriodUtcBounds(input.dateFrom, input.dateTo, input.timeZone)
      : undefined;

    let scopedLocationIds: string[] | undefined;
    if (hasExplicitScope) {
      const locations = await collectPages<LocationRow>(async (from, to) => {
        let query = this.client
          .from("stock_locations")
          .select("id")
          .eq("organization_id", organizationId);
        if (input.unitId) query = query.eq("unit_id", input.unitId);
        if (input.sectorId) query = query.eq("sector_id", input.sectorId);
        const result = await query.range(from, to);
        return { data: (result.data ?? []) as LocationRow[], error: result.error };
      }, "os locais das compras");
      scopedLocationIds = locations.map((row) => row.id);
    }

    const [allOrders, suppliers, supplierItems, stockItems, priceRows] = await Promise.all([
      hasExplicitScope && scopedLocationIds?.length === 0
        ? Promise.resolve([] as PurchaseOrderRow[])
        : collectPages<PurchaseOrderRow>(async (from, to) => {
            let query = this.client
              .from("purchase_orders")
              .select("id, supplier_id, stock_location_id, ordered_at")
              .eq("organization_id", organizationId)
              .not("ordered_at", "is", null);
            if (scopedLocationIds) query = query.in("stock_location_id", scopedLocationIds);
            const result = await query.order("ordered_at", { ascending: false }).range(from, to);
            return { data: (result.data ?? []) as PurchaseOrderRow[], error: result.error };
          }, "o histórico de pedidos"),
      collectPages<SupplierRow>(async (from, to) => {
        const result = await this.client
          .from("suppliers")
          .select("id, trade_name")
          .eq("organization_id", organizationId)
          .range(from, to);
        return { data: (result.data ?? []) as SupplierRow[], error: result.error };
      }, "os fornecedores do Dashboard"),
      collectPages<SupplierItemRow>(async (from, to) => {
        const result = await this.client
          .from("supplier_items")
          .select("id, supplier_id, stock_item_id")
          .eq("organization_id", organizationId)
          .range(from, to);
        return { data: (result.data ?? []) as SupplierItemRow[], error: result.error };
      }, "os vínculos de fornecedor"),
      collectPages<StockItemRow>(async (from, to) => {
        const result = await this.client
          .from("stock_items")
          .select("id, name")
          .eq("organization_id", organizationId)
          .range(from, to);
        return { data: (result.data ?? []) as StockItemRow[], error: result.error };
      }, "os itens do histórico de preço"),
      collectPages<SupplierPriceRow>(async (from, to) => {
        let query = this.client
          .from("supplier_prices")
          .select("id, supplier_item_id, unit_price, observed_at")
          .eq("organization_id", organizationId);
        if (bounds) {
          query = query
            .gte("observed_at", bounds.startInclusive)
            .lt("observed_at", bounds.endExclusive);
        }
        const result = await query
          .order("observed_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        return { data: (result.data ?? []) as SupplierPriceRow[], error: result.error };
      }, "o histórico de preços"),
    ]);

    const issuedOrders = allOrders.filter((order) => inUtcPeriod(order.ordered_at, bounds));
    const scopedOrderIds = new Set(allOrders.map((order) => order.id));

    const allReceipts = hasExplicitScope && scopedOrderIds.size === 0
      ? []
      : await collectPages<PurchaseReceiptRow>(async (from, to) => {
          let query = this.client
            .from("purchase_receipts")
            .select("id, purchase_order_id, received_at")
            .eq("organization_id", organizationId);
          if (bounds) {
            query = query
              .gte("received_at", bounds.startInclusive)
              .lt("received_at", bounds.endExclusive);
          }
          const result = await query.order("received_at", { ascending: false }).range(from, to);
          return { data: (result.data ?? []) as PurchaseReceiptRow[], error: result.error };
        }, "o histórico de recebimentos");
    const receipts = hasExplicitScope
      ? allReceipts.filter((row) => scopedOrderIds.has(row.purchase_order_id))
      : allReceipts;

    const supplierHistory = summarizeSupplierPurchases(issuedOrders, receipts, allOrders, suppliers);
    const priceChanges = buildSupplierPriceChanges(priceRows, supplierItems, suppliers, stockItems);

    return Object.freeze({
      issuedOrderCount: issuedOrders.length,
      receiptCount: receipts.length,
      suppliersWithOrdersCount: supplierHistory.filter((row) => row.issuedOrderCount > 0).length,
      supplierHistory,
      priceObservationCount: priceRows.length,
      comparablePriceItemCount: priceChanges.comparablePriceItemCount,
      changedPriceItemCount: priceChanges.changedPriceItemCount,
      recentPriceChanges: priceChanges.recentPriceChanges,
    });
  }
}
