import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { InventoryBalance } from "@/modules/inventory/domain/inventory";

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

function queryError(scope: string, message: string): Error {
  return new Error(`Não foi possível carregar ${scope}: ${message}`);
}

export async function loadWorkspaceReferenceData(
  client: SupabaseClient,
  organizationId: EntityId,
): Promise<WorkspaceReferenceData> {
  const [categoriesResult, unitsOfMeasureResult, unitsResult, locationsResult, balancesResult] = await Promise.all([
    client.from("item_categories").select("id, name").eq("organization_id", organizationId).eq("active", true).order("name"),
    client.from("units_of_measure").select("id, code, name").eq("organization_id", organizationId).eq("active", true).order("code"),
    client.from("units").select("id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
    client.from("stock_locations").select("id, name, unit_id").eq("organization_id", organizationId).eq("status", "active").order("name"),
    client.from("inventory_balances").select("stock_item_id, stock_location_id, quantity_on_hand, average_cost").eq("organization_id", organizationId),
  ]);

  if (categoriesResult.error) throw queryError("as categorias", categoriesResult.error.message);
  if (unitsOfMeasureResult.error) throw queryError("as unidades de medida", unitsOfMeasureResult.error.message);
  if (unitsResult.error) throw queryError("as unidades", unitsResult.error.message);
  if (locationsResult.error) throw queryError("os locais de estoque", locationsResult.error.message);
  if (balancesResult.error) throw queryError("os saldos", balancesResult.error.message);

  const unitNames = new Map(((unitsResult.data ?? []) as UnitRow[]).map((unit) => [unit.id, unit.name]));

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
  };
}
