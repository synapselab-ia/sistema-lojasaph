import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";
import { InventoryBalance } from "../domain/inventory";

export type RuntimeStockLossMovementType = "loss" | "expiration";

export interface RuntimeStockLossReason {
  readonly code: string;
  readonly label: string;
  readonly movementType: RuntimeStockLossMovementType;
  readonly active: boolean;
}

export interface RuntimeStockLoss {
  readonly id: EntityId;
  readonly stockItemId: EntityId;
  readonly stockLocationId: EntityId;
  readonly quantity: Quantity;
  readonly unitCostSnapshot: Money;
  readonly movementType: RuntimeStockLossMovementType;
  readonly reasonCode: string;
  readonly occurredAt: string;
  readonly notes?: string;
}

export interface RecordSupabaseStockLossInput {
  commandId?: EntityId;
  organizationId: EntityId;
  stockItemId: EntityId;
  stockLocationId: EntityId;
  quantity: string;
  reasonCode: string;
  preferredBatchId?: EntityId;
  notes?: string;
}

export interface RecordSupabaseStockLossResult {
  movementId: EntityId;
  movementType: RuntimeStockLossMovementType;
  reasonCode: string;
  balance: InventoryBalance;
}

interface StockLossRpcRow {
  movement_id: string;
  movement_type: RuntimeStockLossMovementType;
  reason_code: string;
  quantity_on_hand: number | string;
  average_cost: number | string;
}

interface StockLossReasonRow {
  code: string;
  label: string;
  movement_type: RuntimeStockLossMovementType;
  active: boolean;
}

interface StockLossMovementRow {
  id: string;
  movement_type: RuntimeStockLossMovementType;
  occurred_at: string;
  source_location_id: string | null;
  reason_code: string | null;
  notes: string | null;
}

interface StockLossMovementItemRow {
  movement_id: string;
  stock_item_id: string;
  quantity: number | string;
  unit_cost_snapshot: number | string;
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

export class SupabaseStockLossGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async listReasons(organizationId: EntityId): Promise<readonly RuntimeStockLossReason[]> {
    const { data, error } = await this.client
      .from("stock_loss_reasons")
      .select("code, label, movement_type, active")
      .eq("organization_id", organizationId)
      .order("label");

    if (error) throw persistenceError("Failed to load stock-loss reasons", error.message);
    return ((data ?? []) as StockLossReasonRow[]).map((row) => Object.freeze({
      code: row.code,
      label: row.label,
      movementType: row.movement_type,
      active: row.active,
    }));
  }

  async listRecent(organizationId: EntityId): Promise<readonly RuntimeStockLoss[]> {
    const { data: movementData, error: movementError } = await this.client
      .from("stock_movements")
      .select("id, movement_type, occurred_at, source_location_id, reason_code, notes")
      .eq("organization_id", organizationId)
      .in("movement_type", ["loss", "expiration"])
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (movementError) throw persistenceError("Failed to load stock-loss history", movementError.message);
    const movements = (movementData ?? []) as StockLossMovementRow[];
    if (movements.length === 0) return [];

    const { data: itemData, error: itemError } = await this.client
      .from("stock_movement_items")
      .select("movement_id, stock_item_id, quantity, unit_cost_snapshot")
      .eq("organization_id", organizationId)
      .in("movement_id", movements.map((movement) => movement.id));

    if (itemError) throw persistenceError("Failed to load stock-loss movement items", itemError.message);
    const items = new Map(((itemData ?? []) as StockLossMovementItemRow[]).map((item) => [item.movement_id, item]));

    return movements.flatMap((movement): RuntimeStockLoss[] => {
      const item = items.get(movement.id);
      if (!item || !movement.source_location_id || !movement.reason_code) return [];
      return [Object.freeze({
        id: movement.id as EntityId,
        stockItemId: item.stock_item_id as EntityId,
        stockLocationId: movement.source_location_id as EntityId,
        quantity: Quantity.fromDecimal(String(item.quantity)),
        unitCostSnapshot: Money.fromDecimal(String(item.unit_cost_snapshot)),
        movementType: movement.movement_type,
        reasonCode: movement.reason_code,
        occurredAt: movement.occurred_at,
        notes: movement.notes ?? undefined,
      })];
    });
  }

  async record(input: RecordSupabaseStockLossInput): Promise<RecordSupabaseStockLossResult> {
    const quantity = Quantity.fromDecimal(input.quantity);
    const reasonCode = input.reasonCode.trim().toLowerCase();

    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity must be greater than zero.");
    }
    if (!reasonCode) {
      throw new DomainError("STOCK_LOSS_REASON_REQUIRED", "A structured stock-loss reason is required.");
    }

    const semanticPayload = {
      organizationId: input.organizationId,
      stockItemId: input.stockItemId,
      stockLocationId: input.stockLocationId,
      quantity: quantity.toDecimal(),
      reasonCode,
      preferredBatchId: input.preferredBatchId ?? null,
      notes: input.notes?.trim() || null,
    };

    const execute = async (commandId: EntityId): Promise<RecordSupabaseStockLossResult> => {
      const { data, error } = await this.client.rpc("record_stock_loss", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_stock_item_id: semanticPayload.stockItemId,
        p_stock_location_id: semanticPayload.stockLocationId,
        p_quantity: semanticPayload.quantity,
        p_reason_code: semanticPayload.reasonCode,
        p_preferred_batch_id: semanticPayload.preferredBatchId,
        p_notes: semanticPayload.notes,
      });

      if (error) throw persistenceError("Failed to record stock loss", error.message);
      const row = (data as StockLossRpcRow[] | null)?.[0];
      if (!row) throw persistenceError("Stock loss RPC returned no result");

      return {
        movementId: row.movement_id as EntityId,
        movementType: row.movement_type,
        reasonCode: row.reason_code,
        balance: Object.freeze({
          stockItemId: input.stockItemId,
          stockLocationId: input.stockLocationId,
          quantity: Quantity.fromDecimal(String(row.quantity_on_hand)),
          averageCost: Money.fromDecimal(String(row.average_cost)),
        }),
      };
    };

    if (input.commandId) return execute(input.commandId);
    return this.commands.execute("stock-loss:record", semanticPayload, execute);
  }
}
