import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { InventoryBalance } from "../domain/inventory";

export interface RecordSupabaseStockEntryInput {
  commandId?: EntityId;
  organizationId: EntityId;
  stockItemId: EntityId;
  stockLocationId: EntityId;
  quantity: string;
  unitCost: string;
  batchCode?: string;
  expirationDate?: string;
  notes?: string;
}

export interface RecordSupabaseStockEntryResult {
  movementId: EntityId;
  balance: InventoryBalance;
}

interface StockEntryRpcRow {
  movement_id: string;
  quantity_on_hand: number | string;
  average_cost: number | string;
}

function persistenceError(message: string, cause?: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseStockEntryGateway {
  constructor(private readonly client: SupabaseClient) {}

  async record(input: RecordSupabaseStockEntryInput): Promise<RecordSupabaseStockEntryResult> {
    const commandId = input.commandId ?? newEntityId();
    const quantity = Quantity.fromDecimal(input.quantity);
    const unitCost = Money.fromDecimal(input.unitCost);

    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity must be greater than zero.");
    }
    if (unitCost.isNegative()) {
      throw new DomainError("INVALID_STOCK_COST", "Unit cost cannot be negative.");
    }

    const { data, error } = await this.client.rpc("record_stock_entry", {
      p_command_id: commandId,
      p_organization_id: input.organizationId,
      p_stock_item_id: input.stockItemId,
      p_stock_location_id: input.stockLocationId,
      p_quantity: quantity.toDecimal(),
      p_unit_cost: unitCost.toDecimal(),
      p_batch_code: input.batchCode?.trim() || null,
      p_expiration_date: input.expirationDate?.trim() || null,
      p_notes: input.notes?.trim() || null,
    });

    if (error) throw persistenceError("Failed to record stock entry", error.message);
    const row = (data as StockEntryRpcRow[] | null)?.[0];
    if (!row) throw persistenceError("Stock entry RPC returned no result");

    return {
      movementId: row.movement_id as EntityId,
      balance: Object.freeze({
        stockItemId: input.stockItemId,
        stockLocationId: input.stockLocationId,
        quantity: Quantity.fromDecimal(String(row.quantity_on_hand)),
        averageCost: Money.fromDecimal(String(row.average_cost)),
      }),
    };
  }
}
