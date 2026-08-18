import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { RuntimeTransferStatus } from "@/modules/inventory/adapters/supabase-stock-transfer-gateway";
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

export interface RuntimeUnit {
  readonly id: EntityId;
  readonly name: string;
}

export interface RuntimeSector {
  readonly id: EntityId;
  readonly name: string;
  readonly unitId: EntityId;
  readonly unitName: string;
}

export interface RuntimeStockLocation {
  readonly id: EntityId;
  readonly name: string;
  readonly unitName: string;
}

export interface RuntimeStockTransfer {
  readonly id: EntityId;
  readonly stockItemId: EntityId;
  readonly sourceLocationId: EntityId;
  readonly destinationLocationId: EntityId;
  readonly status: RuntimeTransferStatus;
  readonly requestedAt: string;
  readonly dispatchedAt?: string;
  readonly receivedAt?: string;
  readonly dispatchedQuantity: Quantity;
  readonly receivedQuantity: Quantity;
  readonly unitCostSnapshot: Money;
  readonly notes?: string;
}

export interface WorkspaceReferenceData {
  readonly categories: readonly RuntimeCategory[];
  readonly unitsOfMeasure: readonly RuntimeUnitOfMeasure[];
  readonly units: readonly RuntimeUnit[];
  readonly sectors: readonly RuntimeSector[];
  readonly stockLocations: readonly RuntimeStockLocation[];
  readonly balances: readonly InventoryBalance[];
  readonly batches: readonly InventoryBatch[];
  readonly transfers: readonly RuntimeStockTransfer[];
}

interface CategoryRow { id: string; name: string }
interface UnitOfMeasureRow { id: string; code: string; name: string }
interface UnitRow { id: string; name: string }
interface SectorRow { id: string; name: string; unit_id: string }
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
interface TransferRow {
  id: string;
  source_location_id: string;
  destination_location_id: string;
  status: RuntimeTransferStatus;
  requested_at: string;
  dispatched_at: string | null;
  received_at: string | null;
  notes: string | null;
}
interface TransferItemRow {
  transfer_id: string;
  stock_item_id: string;
  dispatched_quantity: number | string;
  received_quantity: number | string;
  unit_cost_snapshot: number | string;
}

function queryError(scope: string, message: string): Error {
  return new Error(`Não foi possível carregar ${scope}: ${message}`);
}

export async function loadWorkspaceReferenceData(
  client: SupabaseClient,
  organizationId: EntityId,
): Promise<WorkspaceReferenceData> {
  const [categoriesResult, unitsOfMeasureResult, unitsResult, sectorsResult, locationsResult, balancesResult, batchesResult, transfersResult] = await Promise.all([
    client.from("item_categories").select("id, name").eq("organization_id", organizationId).eq("active", true).order("name"),
    client.from("units_of_measure").select("id, code, name").eq("organization_id", organizationId).eq("active", true).order("code"),
    client.from("units").select("id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
    client.from("sectors").select("id, name, unit_id").eq("organization_id", organizationId).eq("status", "active").order("name"),
    client.from("stock_locations").select("id, name, unit_id").eq("organization_id", organizationId).eq("status", "active").order("name"),
    client.from("inventory_balances").select("stock_item_id, stock_location_id, quantity_on_hand, average_cost").eq("organization_id", organizationId),
    client
      .from("inventory_batches")
      .select("id, stock_item_id, stock_location_id, batch_code, expiration_date, received_at, original_quantity, remaining_quantity, unit_cost, source_type, source_reference_id")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .gt("remaining_quantity", 0),
    client
      .from("stock_transfers")
      .select("id, source_location_id, destination_location_id, status, requested_at, dispatched_at, received_at, notes")
      .eq("organization_id", organizationId)
      .in("status", ["dispatched", "partially_received", "received"])
      .order("requested_at", { ascending: false })
      .limit(50),
  ]);

  if (categoriesResult.error) throw queryError("as categorias", categoriesResult.error.message);
  if (unitsOfMeasureResult.error) throw queryError("as unidades de medida", unitsOfMeasureResult.error.message);
  if (unitsResult.error) throw queryError("as unidades", unitsResult.error.message);
  if (sectorsResult.error) throw queryError("os setores", sectorsResult.error.message);
  if (locationsResult.error) throw queryError("os locais de estoque", locationsResult.error.message);
  if (balancesResult.error) throw queryError("os saldos", balancesResult.error.message);
  if (batchesResult.error) throw queryError("os lotes", batchesResult.error.message);
  if (transfersResult.error) throw queryError("as transferências", transfersResult.error.message);

  const transferRows = (transfersResult.data ?? []) as TransferRow[];
  const transferIds = transferRows.map((transfer) => transfer.id);
  let transferItemRows: TransferItemRow[] = [];

  if (transferIds.length > 0) {
    const { data, error } = await client
      .from("stock_transfer_items")
      .select("transfer_id, stock_item_id, dispatched_quantity, received_quantity, unit_cost_snapshot")
      .eq("organization_id", organizationId)
      .in("transfer_id", transferIds);
    if (error) throw queryError("os itens das transferências", error.message);
    transferItemRows = (data ?? []) as TransferItemRow[];
  }

  const transferItemsByTransfer = new Map(transferItemRows.map((item) => [item.transfer_id, item]));
  const unitRows = (unitsResult.data ?? []) as UnitRow[];
  const unitNames = new Map(unitRows.map((unit) => [unit.id, unit.name]));
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

  const transfers = transferRows.map((transfer): RuntimeStockTransfer => {
    const item = transferItemsByTransfer.get(transfer.id);
    if (!item) throw queryError("as transferências", `transferência ${transfer.id} sem item persistido`);
    return Object.freeze({
      id: transfer.id as EntityId,
      stockItemId: item.stock_item_id as EntityId,
      sourceLocationId: transfer.source_location_id as EntityId,
      destinationLocationId: transfer.destination_location_id as EntityId,
      status: transfer.status,
      requestedAt: transfer.requested_at,
      dispatchedAt: transfer.dispatched_at ?? undefined,
      receivedAt: transfer.received_at ?? undefined,
      dispatchedQuantity: Quantity.fromDecimal(String(item.dispatched_quantity)),
      receivedQuantity: Quantity.fromDecimal(String(item.received_quantity)),
      unitCostSnapshot: Money.fromDecimal(String(item.unit_cost_snapshot)),
      notes: transfer.notes ?? undefined,
    });
  });

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
    units: unitRows.map((unit) => ({ id: unit.id as EntityId, name: unit.name })),
    sectors: ((sectorsResult.data ?? []) as SectorRow[]).map((sector) => ({
      id: sector.id as EntityId,
      name: sector.name,
      unitId: sector.unit_id as EntityId,
      unitName: unitNames.get(sector.unit_id) ?? "Unidade indisponível",
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
    transfers,
  };
}
