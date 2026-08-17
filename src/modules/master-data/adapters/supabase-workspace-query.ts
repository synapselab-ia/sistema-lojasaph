import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { sortBatchesFefo } from "@/modules/inventory/domain/expiry";
import { InventoryBalance, InventoryBatch, InventoryBatchSource } from "@/modules/inventory/domain/inventory";

export interface RuntimeCategory {
  readonly id: EntityId;
  readonly name: string;
}

export interface RuntimeUnitOfMeasure {
  readonly id: EntityId;
  readonly code: string;
  readonly name: string;
}

export interface RuntimeStockLocation {
  readonly id: EntityId;
  readonly name: string;
  readonly unitName: string;
}

export interface WorkspaceReferenceData {
  readonly categories: readonly RuntimeCategory[];
  readonly unitsOfMeasure: readonly RuntimeUnitOfMeasure[];
  readonly stockLocations: readonly RuntimeStockLocation[];
  readonly balances: readonly InventoryBalance[];
  readonly batches: readonly InventoryBatch[];
}

interface CategoryRow { id: string; name: string }
interface UnitOfMeasureRow { id: string; code: string; name: string }
interface UnitRow { id: string; name: string }
interface LocationRow { id: string; name: string; unit_id: string }
interface BalanceRow {
  stock_item_id: string;
  stock_location_id: string;
  quantity_on_hand: number | string;
  average_cost: number | string;
}
interface BatchRow {
  id: string;
  stock_item_id: string;
  stock_location_id: string;
  batch_code: string | null;
  expiration_date: string | null;
  received_at: string;
  original_quantity: number | string;
  remaining_quantity: number | string;
  unit_cost: number | string;
  source_type: InventoryBatchSource;
  source_reference_id: string | null;
}

function queryError(scope: string, message: string): Error {
  return new Error(`Não foi possível carregar ${scope}: ${message}`);
}

export async function loadWorkspaceReferenceData(
  client: SupabaseClient,
  organizationId: EntityId,
): Promise<WorkspaceReferenceData> {
  const [categoriesResult, unitsOfMeasureResult, unitsResult, locationsResult, balancesResult, batchesResult] = await Promise.all([
    client.from("item_categories").select("id, name").eq("organization_id", organizationId).eq("active", true).order("name"),
    client.from("units_of_measure").select("id, code, name").eq("organization_id", organizationId).eq("active", true).order("code"),
    client.from("units").select("id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
    client.from("stock_locations").select("id, name, unit_id").eq("organization_id", organizationId).eq("status", "active").order("name"),
    client.from("inventory_balances").select("stock_item_id, stock_location_id, quantity_on_hand, average_cost").eq("organization_id", organizationId),
    client
      .from("inventory_batches")
      .select("id, stock_item_id, stock_location_id, batch_code, expiration_date, received_at, original_quantity, remaining_quantity, unit_cost, source_type, source_reference_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .gt("remaining_quantity", 0),
  ]);

  if (categoriesResult.error) throw queryError("as categorias", categoriesResult.error.message);
  if (unitsOfMeasureResult.error) throw queryError("as unidades de medida", unitsOfMeasureResult.error.message);
  if (unitsResult.error) throw queryError("as unidades", unitsResult.error.message);
  if (locationsResult.error) throw queryError("os locais de estoque", locationsResult.error.message);
  if (balancesResult.error) throw queryError("os saldos", balancesResult.error.message);
  if (batchesResult.error) throw queryError("os lotes", batchesResult.error.message);

  const unitNames = new Map(((unitsResult.data ?? []) as UnitRow[]).map((unit) => [unit.id, unit.name]));
  const batches = ((batchesResult.data ?? []) as BatchRow[]).map((batch): InventoryBatch => Object.freeze({
    id: batch.id as EntityId,
    stockItemId: batch.stock_item_id as EntityId,
    stockLocationId: batch.stock_location_id as EntityId,
    batchCode: batch.batch_code ?? undefined,
    expirationDate: batch.expiration_date ?? undefined,
    receivedAt: batch.received_at,
    originalQuantity: Quantity.fromDecimal(String(batch.original_quantity)),
    remainingQuantity: Quantity.fromDecimal(String(batch.remaining_quantity)),
    unitCost: Money.fromDecimal(String(batch.unit_cost)),
    sourceType: batch.source_type,
    sourceReferenceId: batch.source_reference_id ? (batch.source_reference_id as EntityId) : undefined,
  }));

  return {
    categories: ((categoriesResult.data ?? []) as CategoryRow[]).map((category) => ({
      id: category.id as EntityId,
      name: category.name,
    })),
    unitsOfMeasure: ((unitsOfMeasureResult.data ?? []) as UnitOfMeasureRow[]).map((unit) => ({
      id: unit.id as EntityId,
      code: unit.code,
      name: unit.name,
    })),
    stockLocations: ((locationsResult.data ?? []) as LocationRow[]).map((location) => ({
      id: location.id as EntityId,
      name: location.name,
      unitName: unitNames.get(location.unit_id) ?? "Unidade indisponível",
    })),
    balances: ((balancesResult.data ?? []) as BalanceRow[]).map((balance) => ({
      stockItemId: balance.stock_item_id as EntityId,
      stockLocationId: balance.stock_location_id as EntityId,
      quantity: Quantity.fromDecimal(String(balance.quantity_on_hand)),
      averageCost: Money.fromDecimal(String(balance.average_cost)),
    })),
    batches: sortBatchesFefo(batches),
  };
}
