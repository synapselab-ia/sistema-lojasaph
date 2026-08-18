import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import {
  DashboardCashRow,
  DashboardExpiryRow,
  DashboardFinanceRow,
  DashboardInventoryCountRow,
  DashboardPurchaseRow,
  DashboardRawData,
  DashboardTransferRow,
  localIsoDate,
} from "../application/dashboard-summary";

export interface DashboardUnit {
  readonly id: EntityId;
  readonly name: string;
}

export interface DashboardSnapshot {
  readonly timeZone: string;
  readonly today: string;
  readonly units: readonly DashboardUnit[];
  readonly data: DashboardRawData;
}

interface OrganizationRow { timezone: string }
interface UnitRow { id: string; name: string }
interface LocationRow { id: string; unit_id: string }
interface RegisterRow { id: string; unit_id: string }
interface FinanceRow {
  installment_id: string;
  unit_id: string;
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

export class SupabaseDashboardQuery {
  constructor(private readonly client: SupabaseClient) {}

  async load(
    organizationId: EntityId,
    input: { readonly unitId?: EntityId; readonly horizonDays: number },
  ): Promise<DashboardSnapshot> {
    const [organizationResult, unitsResult, locationsResult, registersResult] = await Promise.all([
      this.client.from("organizations").select("timezone").eq("id", organizationId).single(),
      this.client.from("units").select("id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
      this.client.from("stock_locations").select("id, unit_id").eq("organization_id", organizationId).eq("status", "active"),
      this.client.from("cash_registers").select("id, unit_id").eq("organization_id", organizationId).eq("status", "active"),
    ]);

    if (organizationResult.error) throw queryError("o timezone da organização", organizationResult.error.message);
    if (unitsResult.error) throw queryError("as unidades", unitsResult.error.message);
    if (locationsResult.error) throw queryError("os locais de estoque", locationsResult.error.message);
    if (registersResult.error) throw queryError("os caixas", registersResult.error.message);

    const organization = organizationResult.data as OrganizationRow;
    const units = ((unitsResult.data ?? []) as UnitRow[]).map((row) => Object.freeze({ id: row.id as EntityId, name: row.name }));
    const locations = (locationsResult.data ?? []) as LocationRow[];
    const registers = (registersResult.data ?? []) as RegisterRow[];
    const locationUnit = new Map(locations.map((row) => [row.id, row.unit_id as EntityId]));
    const registerUnit = new Map(registers.map((row) => [row.id, row.unit_id as EntityId]));
    const locationIds = input.unitId ? locations.filter((row) => row.unit_id === input.unitId).map((row) => row.id) : locations.map((row) => row.id);
    const registerIds = input.unitId ? registers.filter((row) => row.unit_id === input.unitId).map((row) => row.id) : registers.map((row) => row.id);
    const today = localIsoDate(new Date(), organization.timezone);
    const historyStart = shiftIsoDate(today, -input.horizonDays);
    const horizonEnd = shiftIsoDate(today, input.horizonDays);

    let financeQuery = this.client
      .from("payable_installment_summary")
      .select("installment_id, unit_id, nominal_amount, net_paid_amount, balance_amount, payment_status, due_date")
      .eq("organization_id", organizationId);
    if (input.unitId) financeQuery = financeQuery.eq("unit_id", input.unitId);

    const cashPromise = registerIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("cash_sessions")
          .select("id, cash_register_id, business_date, status, cash_difference")
          .eq("organization_id", organizationId)
          .in("cash_register_id", registerIds)
          .or(`status.eq.open,business_date.gte.${historyStart}`)
          .order("business_date", { ascending: false });

    const purchasesPromise = locationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("purchase_orders")
          .select("id, stock_location_id, status, expected_delivery_date")
          .eq("organization_id", organizationId)
          .in("stock_location_id", locationIds)
          .in("status", ["ordered", "partially_received"])
          .order("expected_delivery_date", { ascending: true, nullsFirst: false });

    const transfersPromise = locationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("stock_transfers")
          .select("id, source_location_id, destination_location_id, status")
          .eq("organization_id", organizationId)
          .in("status", ["dispatched", "partially_received"]);

    const countsPromise = locationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("inventory_counts")
          .select("id, stock_location_id, status")
          .eq("organization_id", organizationId)
          .in("stock_location_id", locationIds)
          .in("status", ["counting", "review"]);

    const expiriesPromise = locationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[], error: null })
      : this.client
          .from("inventory_batches")
          .select("id, stock_location_id, expiration_date")
          .eq("organization_id", organizationId)
          .in("stock_location_id", locationIds)
          .eq("status", "active")
          .gt("remaining_quantity", 0)
          .not("expiration_date", "is", null)
          .lte("expiration_date", horizonEnd)
          .order("expiration_date");

    const [financeResult, cashResult, purchasesResult, transfersResult, countsResult, expiriesResult] = await Promise.all([
      financeQuery,
      cashPromise,
      purchasesPromise,
      transfersPromise,
      countsPromise,
      expiriesPromise,
    ]);

    if (financeResult.error) throw queryError("o financeiro", financeResult.error.message);
    if (cashResult.error) throw queryError("o caixa", cashResult.error.message);
    if (purchasesResult.error) throw queryError("as compras", purchasesResult.error.message);
    if (transfersResult.error) throw queryError("as transferências", transfersResult.error.message);
    if (countsResult.error) throw queryError("os inventários", countsResult.error.message);
    if (expiriesResult.error) throw queryError("as validades", expiriesResult.error.message);

    const finance: DashboardFinanceRow[] = ((financeResult.data ?? []) as FinanceRow[]).map((row) => Object.freeze({
      id: row.installment_id as EntityId,
      unitId: row.unit_id as EntityId,
      nominalAmount: money(row.nominal_amount),
      netPaidAmount: money(row.net_paid_amount),
      balanceAmount: money(row.balance_amount),
      status: row.payment_status,
      dueDate: row.due_date,
    }));

    const cash: DashboardCashRow[] = ((cashResult.data ?? []) as CashRow[]).flatMap((row) => {
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
      const unitId = locationUnit.get(row.stock_location_id);
      if (!unitId) return [];
      return [Object.freeze({ id: row.id as EntityId, unitId, status: row.status, expectedDeliveryDate: row.expected_delivery_date ?? undefined })];
    });

    const transfers: DashboardTransferRow[] = ((transfersResult.data ?? []) as TransferRow[]).flatMap((row) => {
      const sourceUnitId = locationUnit.get(row.source_location_id);
      const destinationUnitId = locationUnit.get(row.destination_location_id);
      if (!sourceUnitId || !destinationUnitId) return [];
      if (input.unitId && sourceUnitId !== input.unitId && destinationUnitId !== input.unitId) return [];
      return [Object.freeze({ id: row.id as EntityId, sourceUnitId, destinationUnitId, status: row.status })];
    });

    const inventoryCounts: DashboardInventoryCountRow[] = ((countsResult.data ?? []) as InventoryCountRow[]).flatMap((row) => {
      const unitId = locationUnit.get(row.stock_location_id);
      if (!unitId) return [];
      return [Object.freeze({ id: row.id as EntityId, unitId, status: row.status })];
    });

    const expiries: DashboardExpiryRow[] = ((expiriesResult.data ?? []) as ExpiryRow[]).flatMap((row) => {
      const unitId = locationUnit.get(row.stock_location_id);
      if (!unitId) return [];
      return [Object.freeze({ id: row.id as EntityId, unitId, expirationDate: row.expiration_date })];
    });

    return Object.freeze({
      timeZone: organization.timezone,
      today,
      units: Object.freeze(units),
      data: Object.freeze({
        finance: Object.freeze(finance),
        cash: Object.freeze(cash),
        purchases: Object.freeze(purchases),
        transfers: Object.freeze(transfers),
        inventoryCounts: Object.freeze(inventoryCounts),
        expiries: Object.freeze(expiries),
      }),
    });
  }
}
