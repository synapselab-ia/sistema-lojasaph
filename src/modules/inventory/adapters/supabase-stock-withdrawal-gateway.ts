import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";
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
  if (cause?.includes("IDEMPOTENCY_KEY_CONFLICT")) {
    return new DomainError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "A operação foi repetida com dados diferentes. Atualize a tela antes de tentar novamente.",
    );
  }
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseStockWithdrawalGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async record(input: RecordSupabaseStockWithdrawalInput): Promise<RecordSupabaseStockWithdrawalResult> {
    const quantity = Quantity.fromDecimal(input.quantity);

    if (!input.sectorId?.trim()) {
      throw new DomainError("STOCK_WITHDRAWAL_SECTOR_REQUIRED", "Stock withdrawal sector is required.");
    }
    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity must be greater than zero.");
    }

    const semanticPayload = {
      organizationId: input.organizationId,
      stockItemId: input.stockItemId,
      stockLocationId: input.stockLocationId,
      sectorId: input.sectorId,
      quantity: quantity.toDecimal(),
      preferredBatchId: input.preferredBatchId ?? null,
      notes: input.notes?.trim() || null,
    };

    const execute = async (commandId: EntityId): Promise<RecordSupabaseStockWithdrawalResult> => {
      const { data, error } = await this.client.rpc("record_stock_withdrawal", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_stock_item_id: semanticPayload.stockItemId,
        p_stock_location_id: semanticPayload.stockLocationId,
        p_sector_id: semanticPayload.sectorId,
        p_quantity: semanticPayload.quantity,
        p_preferred_batch_id: semanticPayload.preferredBatchId,
        p_notes: semanticPayload.notes,
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
    };

    if (input.commandId) return execute(input.commandId);
    return this.commands.execute("stock-withdrawal:record", semanticPayload, execute);
  }
}
