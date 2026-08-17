import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { StockItem, StockItemType } from "../domain/stock-item";
import { StockItemRepository } from "../repositories/stock-item-repository";

interface StockItemRow {
  id: string;
  organization_id: string;
  category_id: string | null;
  base_unit_id: string;
  name: string;
  item_type: StockItemType;
  active: boolean;
  track_expiration: boolean;
  track_batch: boolean;
  is_returnable: boolean;
}

interface UnitRow {
  id: string;
  code: string;
}

function persistenceError(message: string, cause?: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseStockItemRepository implements StockItemRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<StockItem | null> {
    const { data, error } = await this.client
      .from("stock_items")
      .select("id, organization_id, category_id, base_unit_id, name, item_type, active, track_expiration, track_batch, is_returnable")
      .eq("id", id)
      .maybeSingle();

    if (error) throw persistenceError("Failed to load stock item", error.message);
    if (!data) return null;

    const row = data as StockItemRow;
    const unitCode = await this.getUnitCode(row.base_unit_id);
    return this.mapRow(row, unitCode);
  }

  async listByOrganization(organizationId: EntityId): Promise<readonly StockItem[]> {
    const { data, error } = await this.client
      .from("stock_items")
      .select("id, organization_id, category_id, base_unit_id, name, item_type, active, track_expiration, track_batch, is_returnable")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    if (error) throw persistenceError("Failed to list stock items", error.message);
    const rows = (data ?? []) as StockItemRow[];
    const unitIds = [...new Set(rows.map((row) => row.base_unit_id))];
    const units = await this.getUnitCodes(unitIds);

    return rows.map((row) => {
      const code = units.get(row.base_unit_id);
      if (!code) throw persistenceError(`Unit of measure not found for stock item ${row.id}`);
      return this.mapRow(row, code);
    });
  }

  async save(item: StockItem): Promise<void> {
    const baseUnitId = await this.findUnitId(item.organizationId, item.baseUnitCode);
    const { error } = await this.client.from("stock_items").upsert({
      id: item.id,
      organization_id: item.organizationId,
      category_id: item.categoryId ?? null,
      base_unit_id: baseUnitId,
      name: item.name,
      item_type: item.type,
      active: item.active,
      track_expiration: item.trackExpiration,
      track_batch: item.trackBatch,
      is_returnable: item.isReturnable,
    });

    if (error) throw persistenceError("Failed to save stock item", error.message);
  }

  private mapRow(row: StockItemRow, baseUnitCode: string): StockItem {
    return Object.freeze({
      id: row.id as EntityId,
      organizationId: row.organization_id as EntityId,
      categoryId: row.category_id ? (row.category_id as EntityId) : undefined,
      name: row.name,
      baseUnitCode,
      type: row.item_type,
      active: row.active,
      trackExpiration: row.track_expiration,
      trackBatch: row.track_batch,
      isReturnable: row.is_returnable,
    });
  }

  private async getUnitCode(id: string): Promise<string> {
    const { data, error } = await this.client.from("units_of_measure").select("code").eq("id", id).single();
    if (error) throw persistenceError("Failed to load unit of measure", error.message);
    return (data as { code: string }).code;
  }

  private async getUnitCodes(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const { data, error } = await this.client.from("units_of_measure").select("id, code").in("id", [...ids]);
    if (error) throw persistenceError("Failed to load units of measure", error.message);
    return new Map(((data ?? []) as UnitRow[]).map((row) => [row.id, row.code]));
  }

  private async findUnitId(organizationId: EntityId, code: string): Promise<string> {
    const { data, error } = await this.client
      .from("units_of_measure")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (error) throw persistenceError("Failed to resolve unit of measure", error.message);
    if (!data) throw new DomainError("UNIT_OF_MEASURE_NOT_FOUND", `Unit of measure '${code}' is not configured.`);
    return (data as { id: string }).id;
  }
}
