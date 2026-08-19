import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { InventoryBalance } from "../domain/inventory";

export interface RecordSupabaseStockWithdrawalInput {
  commandId?: EntityId;
  organizationId: EntityId;
  stockItemId: EntityId;
  stockLocationId: EntityId;
  sectorId: EntityId;
  quantity: string;
  preferredBatchId?: EntityId;
  notes?: string;
}

export interface RecordSupabaseStockWithdrawalResult {
  movementId: EntityId;
  balance: InventoryBalance;
}

interface StockWithdrawalRpcRow {
  movement_id: string;
  quantity_on_hand: number | string;
  average_cost: number | string;
}

function persistenceError(message: string, cause?: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseStockWithdrawalGateway {
  constructor(private readonly client: SupabaseClient) {}

  async record(input: RecordSupabaseStockWithdrawalInput): Promise<RecordSupabaseStockWithdrawalResult> {
    const commandId = input.commandId ?? newEntityId();
    const quantity = Quantity.fromDecimal(input.quantity);

    if (!input.sectorId?.trim()) {
      throw new DomainError("STOCK_WITHDRAWAL_SECTOR_REQUIRED", "Stock withdrawal sector is required.");
    }

    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity must be greater than zero.");
    }

    const { data, error } = await this.client.rpc("record_stock_withdrawal", {
      p_command_id: commandId,
      p_organization_id: input.organizationId,
      p_stock_item_id: input.stockItemId,
      p_stock_location_id: input.stockLocationId,
      p_sector_id: input.sectorId,
      p_quantity: quantity.toDecimal(),
      p_preferred_batch_id: input.preferredBatchId ?? null,
      p_notes: input.notes?.trim() || null,
    });

    if (error) throw persistenceError("Failed to record stock withdrawal", error.message);
    const row = (data as StockWithdrawalRpcRow[] | null)?.[0];
    if (!row) throw persistenceError("Stock withdrawal RPC returned no result");

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
