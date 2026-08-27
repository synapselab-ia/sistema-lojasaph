import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import {
  parseStockMinimumQuantity,
  StockMinimumPolicy,
} from "../domain/stock-minimum";

interface StockMinimumPolicyRow {
  id: string;
  stock_item_id: string;
  stock_location_id: string;
  minimum_quantity: number | string;
  active: boolean;
}

function persistenceError(message: string): Error {
  return new Error(`Não foi possível manter o estoque mínimo: ${message}`);
}

export class SupabaseStockMinimumPolicyGateway {
  constructor(private readonly client: SupabaseClient) {}

  async listByOrganization(organizationId: EntityId): Promise<readonly StockMinimumPolicy[]> {
    const { data, error } = await this.client
      .from("stock_minimum_policies")
      .select("id, stock_item_id, stock_location_id, minimum_quantity, active")
      .eq("organization_id", organizationId)
      .order("stock_location_id")
      .order("stock_item_id");

    if (error) throw persistenceError(error.message);

    return ((data ?? []) as StockMinimumPolicyRow[]).map((row) => Object.freeze({
      id: row.id as EntityId,
      stockItemId: row.stock_item_id as EntityId,
      stockLocationId: row.stock_location_id as EntityId,
      minimumQuantity: parseStockMinimumQuantity(String(row.minimum_quantity)),
      active: row.active,
    }));
  }

  async save(input: {
    organizationId: EntityId;
    stockItemId: EntityId;
    stockLocationId: EntityId;
    minimumQuantity: string;
  }): Promise<void> {
    const minimumQuantity = parseStockMinimumQuantity(input.minimumQuantity);
    const { error } = await this.client
      .from("stock_minimum_policies")
      .upsert({
        organization_id: input.organizationId,
        stock_item_id: input.stockItemId,
        stock_location_id: input.stockLocationId,
        minimum_quantity: minimumQuantity.toDecimal(),
        active: true,
      }, {
        onConflict: "organization_id,stock_item_id,stock_location_id",
      });

    if (error) throw persistenceError(error.message);
  }

  async deactivate(input: {
    organizationId: EntityId;
    stockItemId: EntityId;
    stockLocationId: EntityId;
  }): Promise<void> {
    const { error } = await this.client
      .from("stock_minimum_policies")
      .update({ active: false })
      .eq("organization_id", input.organizationId)
      .eq("stock_item_id", input.stockItemId)
      .eq("stock_location_id", input.stockLocationId);

    if (error) throw persistenceError(error.message);
  }
}
