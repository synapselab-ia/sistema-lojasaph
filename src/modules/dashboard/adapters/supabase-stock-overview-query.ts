import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { validateDashboardPeriod } from "../application/dashboard-summary";

export interface StockOverviewQueryInput {
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly timeZone: string;
}

export interface StockOverviewSnapshot {
  readonly balancePositionCount: number;
  readonly movementCount: number;
  readonly lossMovementCount: number;
}

interface IdRow {
  readonly id: string;
}

function queryError(scope: string, message: string): Error {
  return new Error(`Não foi possível carregar ${scope}: ${message}`);
}

function shiftIsoDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function localMidnightUtc(value: string, timeZone: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, 0, 0, 0);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const parts = new Map(
      formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]),
    );
    const observed = Date.UTC(
      Number(parts.get("year")),
      Number(parts.get("month")) - 1,
      Number(parts.get("day")),
      Number(parts.get("hour")),
      Number(parts.get("minute")),
      Number(parts.get("second")),
    );
    const correction = target - observed;
    candidate += correction;
    if (correction === 0) break;
  }

  return new Date(candidate).toISOString();
}

export function stockPeriodUtcBounds(
  dateFrom: string,
  dateTo: string,
  timeZone: string,
): Readonly<{ startInclusive: string; endExclusive: string }> {
  validateDashboardPeriod({ dateFrom, dateTo });
  return Object.freeze({
    startInclusive: localMidnightUtc(dateFrom, timeZone),
    endExclusive: localMidnightUtc(shiftIsoDate(dateTo, 1), timeZone),
  });
}

export function buildStockMovementScopeFilter(
  locationIds: readonly string[],
  sectorIds: readonly string[],
): string | undefined {
  const filters: string[] = [];
  if (locationIds.length > 0) {
    const values = locationIds.join(",");
    filters.push(`source_location_id.in.(${values})`);
    filters.push(`destination_location_id.in.(${values})`);
  }
  if (sectorIds.length > 0) {
    filters.push(`sector_id.in.(${sectorIds.join(",")})`);
  }
  return filters.length > 0 ? filters.join(",") : undefined;
}

export class SupabaseStockOverviewQuery {
  constructor(private readonly client: SupabaseClient) {}

  async load(
    organizationId: EntityId,
    input: StockOverviewQueryInput,
  ): Promise<StockOverviewSnapshot> {
    validateDashboardPeriod(input);

    let locationsQuery = this.client
      .from("stock_locations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("status", "active");
    if (input.unitId) locationsQuery = locationsQuery.eq("unit_id", input.unitId);
    if (input.sectorId) locationsQuery = locationsQuery.eq("sector_id", input.sectorId);

    const needsSectorScope = Boolean(input.unitId || input.sectorId);
    const sectorsPromise = needsSectorScope
      ? (() => {
          let query = this.client
            .from("sectors")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("status", "active");
          if (input.unitId) query = query.eq("unit_id", input.unitId);
          if (input.sectorId) query = query.eq("id", input.sectorId);
          return query;
        })()
      : Promise.resolve({ data: [] as unknown[], error: null });

    const [locationsResult, sectorsResult] = await Promise.all([locationsQuery, sectorsPromise]);
    if (locationsResult.error) throw queryError("os locais do resumo de estoque", locationsResult.error.message);
    if (sectorsResult.error) throw queryError("os Setores do resumo de estoque", sectorsResult.error.message);

    const locationIds = ((locationsResult.data ?? []) as IdRow[]).map((row) => row.id);
    const sectorIds = ((sectorsResult.data ?? []) as IdRow[]).map((row) => row.id);
    const hasExplicitScope = Boolean(input.unitId || input.sectorId);
    const movementScope = hasExplicitScope
      ? buildStockMovementScopeFilter(locationIds, sectorIds)
      : undefined;

    if (hasExplicitScope && !movementScope) {
      return Object.freeze({ balancePositionCount: 0, movementCount: 0, lossMovementCount: 0 });
    }

    const balancePromise = hasExplicitScope && locationIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : (() => {
          let query = this.client
            .from("inventory_balances")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId)
            .neq("quantity_on_hand", 0);
          if (hasExplicitScope) query = query.in("stock_location_id", locationIds);
          return query;
        })();

    let movementQuery = this.client
      .from("stock_movements")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "confirmed");
    let lossQuery = this.client
      .from("stock_movements")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "confirmed")
      .in("movement_type", ["loss", "expiration"]);

    if (movementScope) {
      movementQuery = movementQuery.or(movementScope);
      lossQuery = lossQuery.or(movementScope);
    }

    if (input.dateFrom && input.dateTo) {
      const bounds = stockPeriodUtcBounds(input.dateFrom, input.dateTo, input.timeZone);
      movementQuery = movementQuery
        .gte("occurred_at", bounds.startInclusive)
        .lt("occurred_at", bounds.endExclusive);
      lossQuery = lossQuery
        .gte("occurred_at", bounds.startInclusive)
        .lt("occurred_at", bounds.endExclusive);
    }

    const [balanceResult, movementResult, lossResult] = await Promise.all([
      balancePromise,
      movementQuery,
      lossQuery,
    ]);

    if (balanceResult.error) throw queryError("as posições de saldo", balanceResult.error.message);
    if (movementResult.error) throw queryError("as movimentações de estoque", movementResult.error.message);
    if (lossResult.error) throw queryError("as perdas de estoque", lossResult.error.message);

    return Object.freeze({
      balancePositionCount: balanceResult.count ?? 0,
      movementCount: movementResult.count ?? 0,
      lossMovementCount: lossResult.count ?? 0,
    });
  }
}
