import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";
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
  if (cause?.includes("IDEMPOTENCY_KEY_CONFLICT")) {
    return new DomainError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "A operação foi repetida com dados diferentes. Atualize a tela antes de tentar novamente.",
    );
  }
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseStockEntryGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async record(input: RecordSupabaseStockEntryInput): Promise<RecordSupabaseStockEntryResult> {
    const quantity = Quantity.fromDecimal(input.quantity);
    const unitCost = Money.fromDecimal(input.unitCost);

    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity must be greater than zero.");
    }
    if (unitCost.isNegative()) {
      throw new DomainError("INVALID_STOCK_COST", "Unit cost cannot be negative.");
    }

    const semanticPayload = {
      organizationId: input.organizationId,
      stockItemId: input.stockItemId,
      stockLocationId: input.stockLocationId,
      quantity: quantity.toDecimal(),
      unitCost: unitCost.toDecimal(),
      batchCode: input.batchCode?.trim() || null,
      expirationDate: input.expirationDate?.trim() || null,
      notes: input.notes?.trim() || null,
    };

    const execute = async (commandId: EntityId): Promise<RecordSupabaseStockEntryResult> => {
      const { data, error } = await this.client.rpc("record_stock_entry", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_stock_item_id: semanticPayload.stockItemId,
        p_stock_location_id: semanticPayload.stockLocationId,
        p_quantity: semanticPayload.quantity,
        p_unit_cost: semanticPayload.unitCost,
        p_batch_code: semanticPayload.batchCode,
        p_expiration_date: semanticPayload.expirationDate,
        p_notes: semanticPayload.notes,
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
    };

    if (input.commandId) return execute(input.commandId);
    return this.commands.execute("stock-entry:record", semanticPayload, execute);
  }
}
