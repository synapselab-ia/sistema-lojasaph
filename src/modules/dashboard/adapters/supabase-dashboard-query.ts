import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import {
  DashboardCashRow,
  DashboardExpiryRow,
  DashboardFinanceRow,
  DashboardInventoryCountRow,
  DashboardPurchaseRow,
  DashboardRawData,
  DashboardStockMinimumRow,
  DashboardTransferRow,
  localIsoDate,
  validateDashboardPeriod,
} from "../application/dashboard-summary";

export interface DashboardUnit {
  readonly id: EntityId;
  readonly name: string;
}

export interface DashboardSector {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly name: string;
}

export interface DashboardQueryInput {
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
  readonly horizonDays: number;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface DashboardSnapshot {
  readonly timeZone: string;
  readonly today: string;
  readonly units: readonly DashboardUnit[];
  readonly sectors: readonly DashboardSector[];
  readonly data: DashboardRawData;
}

interface OrganizationRow { timezone: string }
interface UnitRow { id: string; name: string }
interface SectorRow { id: string; unit_id: string; name: string }
interface LocationRow { id: string; unit_id: string; sector_id: string | null }
interface RegisterRow { id: string; unit_id: string }
interface FinanceRow {
  installment_id: string;
  unit_id: string;
  sector_id: string | null;
  nominal_amount: number | string;
  net_paid_amount: number | string;
  balance_amount: number | string;
  payment_status: DashboardFinanceRow["status"];
  due_date: string;
}
interface CashRow {
  id: string;
  cash_register_id: string;
  business_date: string;
  status: DashboardCashRow["status"];
  cash_difference: number | string | null;
}
interface PurchaseRow {
  id: string;
  stock_location_id: string;
  status: DashboardPurchaseRow["status"];
  expected_delivery_date: string | null;
}
interface TransferRow {
  id: string;
  source_location_id: string;
  destination_location_id: string;
  status: DashboardTransferRow["status"];
}
interface InventoryCountRow {
  id: string;
  stock_location_id: string;
  status: DashboardInventoryCountRow["status"];
}
interface ExpiryRow {
  id: string;
  stock_location_id: string;
  expiration_date: string;
}
interface StockMinimumPolicyRow {
  id: string;
  stock_item_id: string;
  stock_location_id: string;
  minimum_quantity: number | string;
}
interface InventoryBalanceRow {
  stock_item_id: string;
  stock_location_id: string;
  quantity_on_hand: number | string;
}

function queryError(scope: string, message: string): Error {
  return new Error(`Não foi possível carregar ${scope}: ${message}`);
}

function shiftIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function money(value: number | string): Money {
  return Money.fromDecimal(String(value));
}

function earlierIsoDate(left: string, right: string): string {
  return left < right ? left : right;
}

function laterIsoDate(left: string, right: string): string {
  return left > right ? left : right;
}

export function validateDashboardSelection(
  units: readonly DashboardUnit[],
  sectors: readonly DashboardSector[],
  input: Pick<DashboardQueryInput, "unitId" | "sectorId">,
): void {
  if (input.unitId && !units.some((unit) => unit.id === input.unitId)) {
    throw new Error("DASHBOARD_UNIT_NOT_AVAILABLE");
  }

  if (!input.sectorId) return;

  const sector = sectors.find((candidate) => candidate.id === input.sectorId);
  if (!sector) {
    throw new Error("DASHBOARD_SECTOR_NOT_AVAILABLE");
  }

  if (input.unitId && sector.unitId !== input.unitId) {
    throw new Error("DASHBOARD_SECTOR_UNIT_MISMATCH");
  }
}

export class SupabaseDashboardQuery {
  constructor(private readonly client: SupabaseClient) {}

  async load(
    organizationId: EntityId,
    input: DashboardQueryInput,
  ): Promise<DashboardSnapshot> {
    validateDashboardPeriod(input);

    const [organizationResult, unitsResult, sectorsResult, locationsResult, registersResult] = await Promise.all([
      this.client.from("organizations").select("timezone").eq("id", organizationId).single(),
      this.client.from("units").select("id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
      this.client.from("sectors").select("id, unit_id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
      this.client.from("stock_locations").select("id, unit_id, sector_id").eq("organization_id", organizationId).eq("status", "active"),
      this.client.from("cash_registers").select("id, unit_id").eq("organization_id", organizationId).eq("status", "active"),
    ]);

    if (organizationResult.error) throw queryError("o timezone da organização", organizationResult.error.message);
    if (unitsResult.error) throw queryError("as unidades", unitsResult.error.message);
    if (sectorsResult.error) throw queryError("os Setores", sectorsResult.error.message);
    if (locationsResult.error) throw queryError("os locais de estoque", locationsResult.error.message);
    if (registersResult.error) throw queryError("os caixas", registersResult.error.message);

    const organization = organizationResult.data as OrganizationRow;
    const units = ((unitsResult.data ?? []) as UnitRow[]).map((row) => Object.freeze({
      id: row.id as EntityId,
      name: row.name,
    }));
    const sectors = ((sectorsResult.data ?? []) as SectorRow[]).map((row) => Object.freeze({
      id: row.id as EntityId,
      unitId: row.unit_id as EntityId,
      name: row.name,
    }));

    validateDashboardSelection(units, sectors, input);

    const locations = (locationsResult.data ?? []) as LocationRow[];
    const registers = (registersResult.data ?? []) as RegisterRow[];
    const locationById = new Map(locations.map((row) => [row.id, row]));
    const registerUnit = new Map(registers.map((row) => [row.id, row.unit_id as EntityId]));

    const scopedLocations = locations.filter((row) => {
      if (input.unitId && row.unit_id !== input.unitId) return false;
      if (input.sectorId && row.sector_id !== input.sectorId) return false;
      return true;
    });
    const scopedLocationIds = scopedLocations.map((row) => row.id);
    const registerIds = input.unitId
      ? registers.filter((row) => row.unit_id === input.unitId).map((row) => row.id)
      : registers.map((row) => row.id);

    const today = localIsoDate(new Date(), organization.timezone);
    const historyStart = shiftIsoDate(today, -input.horizonDays);
    const horizonEnd = shiftIsoDate(today, input.horizonDays);
    const cashWindowStart = input.dateFrom ? earlierIsoDate(historyStart, input.dateFrom) : historyStart;
    const cashWindowEnd = input.dateTo ? laterIsoDate(today, input.dateTo) : today;
    const expiryUpperBound = input.dateTo ? laterIsoDate(horizonEnd, input.dateTo) : horizonEnd;

    let financeQuery = this.client
      .from("payable_installment_summary")
      .select("installment_id, unit_id, sector_id, nominal_amount, net_paid_amount, balance_amount, payment_status, due_date")
      .eq("organization_id", organizationId);
    if (input.unitId) financeQuery = financeQuery.eq("unit_id", input.unitId);
    if (input.sectorId) financeQuery = financeQuery.eq("sector_id", input.sectorId);
    if (input.dateFrom && input.dateTo) {
      financeQuery = financeQuery.gte("due_date", input.dateFrom).lte("due_date", input.dateTo);
    }

    const cashOpenPromise = registerIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("cash_sessions")
          .select("id, cash_register_id, business_date, status, cash_difference")
          .eq("organization_id", organizationId)
          .in("cash_register_id", registerIds)
          .eq("status", "open")
          .order("business_date", { ascending: false });

    const cashClosedPromise = registerIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("cash_sessions")
          .select("id, cash_register_id, business_date, status, cash_difference")
          .eq("organization_id", organizationId)
          .in("cash_register_id", registerIds)
          .eq("status", "closed")
          .gte("business_date", cashWindowStart)
          .lte("business_date", cashWindowEnd)
          .order("business_date", { ascending: false });

    const purchasesPromise = scopedLocationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("purchase_orders")
          .select("id, stock_location_id, status, expected_delivery_date")
          .eq("organization_id", organizationId)
          .in("stock_location_id", scopedLocationIds)
          .in("status", ["ordered", "partially_received"])
          .order("expected_delivery_date", { ascending: true, nullsFirst: false });

    const transfersPromise = (input.unitId || input.sectorId) && scopedLocationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("stock_transfers")
          .select("id, source_location_id, destination_location_id, status")
          .eq("organization_id", organizationId)
          .in("status", ["dispatched", "partially_received"]);

    const countsPromise = scopedLocationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("inventory_counts")
          .select("id, stock_location_id, status")
          .eq("organization_id", organizationId)
          .in("stock_location_id", scopedLocationIds)
          .in("status", ["counting", "review"]);

    const expiriesPromise = scopedLocationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("inventory_batches")
          .select("id, stock_location_id, expiration_date")
          .eq("organization_id", organizationId)
          .in("stock_location_id", scopedLocationIds)
          .eq("status", "active")
          .gt("remaining_quantity", 0)
          .not("expiration_date", "is", null)
          .lte("expiration_date", expiryUpperBound)
          .order("expiration_date");

    const stockMinimumPoliciesPromise = scopedLocationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("stock_minimum_policies")
          .select("id, stock_item_id, stock_location_id, minimum_quantity")
          .eq("organization_id", organizationId)
          .in("stock_location_id", scopedLocationIds)
          .eq("active", true);

    const inventoryBalancesPromise = scopedLocationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("inventory_balances")
          .select("stock_item_id, stock_location_id, quantity_on_hand")
          .eq("organization_id", organizationId)
          .in("stock_location_id", scopedLocationIds);

    const [
      financeResult,
      cashOpenResult,
      cashClosedResult,
      purchasesResult,
      transfersResult,
      countsResult,
      expiriesResult,
      stockMinimumPoliciesResult,
      inventoryBalancesResult,
    ] = await Promise.all([
      financeQuery,
      cashOpenPromise,
      cashClosedPromise,
      purchasesPromise,
      transfersPromise,
      countsPromise,
      expiriesPromise,
      stockMinimumPoliciesPromise,
      inventoryBalancesPromise,
    ]);

    if (financeResult.error) throw queryError("o financeiro", financeResult.error.message);
    if (cashOpenResult.error) throw queryError("os caixas abertos", cashOpenResult.error.message);
    if (cashClosedResult.error) throw queryError("os fechamentos de caixa", cashClosedResult.error.message);
    if (purchasesResult.error) throw queryError("as compras", purchasesResult.error.message);
    if (transfersResult.error) throw queryError("as transferências", transfersResult.error.message);
    if (countsResult.error) throw queryError("os inventários", countsResult.error.message);
    if (expiriesResult.error) throw queryError("as validades", expiriesResult.error.message);
    if (stockMinimumPoliciesResult.error) throw queryError("os estoques mínimos", stockMinimumPoliciesResult.error.message);
    if (inventoryBalancesResult.error) throw queryError("os saldos para estoque mínimo", inventoryBalancesResult.error.message);

    const finance: DashboardFinanceRow[] = ((financeResult.data ?? []) as FinanceRow[]).map((row) => Object.freeze({
      id: row.installment_id as EntityId,
      unitId: row.unit_id as EntityId,
      sectorId: row.sector_id ? row.sector_id as EntityId : undefined,
      nominalAmount: money(row.nominal_amount),
      netPaidAmount: money(row.net_paid_amount),
      balanceAmount: money(row.balance_amount),
      status: row.payment_status,
      dueDate: row.due_date,
    }));

    const cashRows = [
      ...((cashOpenResult.data ?? []) as CashRow[]),
      ...((cashClosedResult.data ?? []) as CashRow[]),
    ];
    const cash: DashboardCashRow[] = cashRows.flatMap((row) => {
      const unitId = registerUnit.get(row.cash_register_id);
      if (!unitId) return [];
      return [Object.freeze({
        id: row.id as EntityId,
        unitId,
        businessDate: row.business_date,
        status: row.status,
        cashDifference: row.cash_difference === null ? undefined : money(row.cash_difference),
      })];
    });

    const purchases: DashboardPurchaseRow[] = ((purchasesResult.data ?? []) as PurchaseRow[]).flatMap((row) => {
      const location = locationById.get(row.stock_location_id);
      if (!location) return [];
      return [Object.freeze({
        id: row.id as EntityId,
        unitId: location.unit_id as EntityId,
        sectorId: location.sector_id ? location.sector_id as EntityId : undefined,
        status: row.status,
        expectedDeliveryDate: row.expected_delivery_date ?? undefined,
      })];
    });

    const transfers: DashboardTransferRow[] = ((transfersResult.data ?? []) as TransferRow[]).flatMap((row) => {
      const source = locationById.get(row.source_location_id);
      const destination = locationById.get(row.destination_location_id);
      if (!source || !destination) return [];

      const sourceMatches = (!input.unitId || source.unit_id === input.unitId)
        && (!input.sectorId || source.sector_id === input.sectorId);
      const destinationMatches = (!input.unitId || destination.unit_id === input.unitId)
        && (!input.sectorId || destination.sector_id === input.sectorId);
      if ((input.unitId || input.sectorId) && !sourceMatches && !destinationMatches) return [];

      return [Object.freeze({
        id: row.id as EntityId,
        sourceUnitId: source.unit_id as EntityId,
        sourceSectorId: source.sector_id ? source.sector_id as EntityId : undefined,
        destinationUnitId: destination.unit_id as EntityId,
        destinationSectorId: destination.sector_id ? destination.sector_id as EntityId : undefined,
        status: row.status,
      })];
    });

    const inventoryCounts: DashboardInventoryCountRow[] = ((countsResult.data ?? []) as InventoryCountRow[]).flatMap((row) => {
      const location = locationById.get(row.stock_location_id);
      if (!location) return [];
      return [Object.freeze({
        id: row.id as EntityId,
        unitId: location.unit_id as EntityId,
        sectorId: location.sector_id ? location.sector_id as EntityId : undefined,
        status: row.status,
      })];
    });

    const expiries: DashboardExpiryRow[] = ((expiriesResult.data ?? []) as ExpiryRow[]).flatMap((row) => {
      const location = locationById.get(row.stock_location_id);
      if (!location) return [];
      return [Object.freeze({
        id: row.id as EntityId,
        unitId: location.unit_id as EntityId,
        sectorId: location.sector_id ? location.sector_id as EntityId : undefined,
        expirationDate: row.expiration_date,
      })];
    });

    const balanceByKey = new Map(
      ((inventoryBalancesResult.data ?? []) as InventoryBalanceRow[]).map((row) => [
        `${row.stock_location_id}:${row.stock_item_id}`,
        row,
      ]),
    );
    const stockMinimums: DashboardStockMinimumRow[] = ((stockMinimumPoliciesResult.data ?? []) as StockMinimumPolicyRow[]).flatMap((row) => {
      const location = locationById.get(row.stock_location_id);
      const balance = balanceByKey.get(`${row.stock_location_id}:${row.stock_item_id}`);
      if (!location || !balance) return [];
      return [Object.freeze({
        id: row.id as EntityId,
        unitId: location.unit_id as EntityId,
        sectorId: location.sector_id ? location.sector_id as EntityId : undefined,
        quantityOnHand: Quantity.fromDecimal(String(balance.quantity_on_hand)),
        minimumQuantity: Quantity.fromDecimal(String(row.minimum_quantity)),
      })];
    });

    return Object.freeze({
      timeZone: organization.timezone,
      today,
      units: Object.freeze(units),
      sectors: Object.freeze(sectors),
      data: Object.freeze({
        finance: Object.freeze(finance),
        cash: Object.freeze(cash),
        purchases: Object.freeze(purchases),
        transfers: Object.freeze(transfers),
        inventoryCounts: Object.freeze(inventoryCounts),
        expiries: Object.freeze(expiries),
        stockMinimums: Object.freeze(stockMinimums),
      }),
    });
  }
}
