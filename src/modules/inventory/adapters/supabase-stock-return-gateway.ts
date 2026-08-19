import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import {
  RecordStockReturnInput,
  RecordStockReturnResult,
  RuntimeStockReturn,
  RuntimeStockReturnCandidate,
  RuntimeStockReturnOverview,
} from "../domain/stock-return";
import { StockReturnGateway } from "../repositories/stock-return-gateway";

interface StockMovementRow {
  id: string;
  occurred_at: string;
  source_location_id: string | null;
  destination_location_id: string | null;
  reversal_of_movement_id: string | null;
  notes: string | null;
}

interface StockMovementItemRow {
  movement_id: string;
  stock_item_id: string;
  quantity: number | string;
  unit_cost_snapshot: number | string;
}

interface StockReturnRpcRow {
  movement_id: string;
  withdrawal_movement_id: string;
  stock_item_id: string;
  stock_location_id: string;
  returned_quantity: number | string;
  remaining_returnable_quantity: number | string;
  quantity_on_hand: number | string;
  average_cost: number | string;
}

function persistenceError(message: string, cause?: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseStockReturnGateway implements StockReturnGateway {
  constructor(private readonly client: SupabaseClient) {}

  async loadOverview(organizationId: EntityId): Promise<RuntimeStockReturnOverview> {
    const { data: withdrawalData, error: withdrawalError } = await this.client
      .from("stock_movements")
      .select("id, occurred_at, source_location_id, destination_location_id, reversal_of_movement_id, notes")
      .eq("organization_id", organizationId)
      .eq("movement_type", "withdrawal")
      .eq("status", "confirmed")
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (withdrawalError) {
      throw persistenceError("Failed to load returnable withdrawals", withdrawalError.message);
    }

    const withdrawals = (withdrawalData ?? []) as StockMovementRow[];
    if (withdrawals.length === 0) {
      return Object.freeze({ candidates: [], recent: [] });
    }

    const withdrawalIds = withdrawals.map((movement) => movement.id);

    const [{ data: returnData, error: returnError }, { data: withdrawalItemData, error: withdrawalItemError }] = await Promise.all([
      this.client
        .from("stock_movements")
        .select("id, occurred_at, source_location_id, destination_location_id, reversal_of_movement_id, notes")
        .eq("organization_id", organizationId)
        .eq("movement_type", "return_in")
        .eq("status", "confirmed")
        .in("reversal_of_movement_id", withdrawalIds)
        .order("occurred_at", { ascending: false })
        .limit(100),
      this.client
        .from("stock_movement_items")
        .select("movement_id, stock_item_id, quantity, unit_cost_snapshot")
        .eq("organization_id", organizationId)
        .in("movement_id", withdrawalIds),
    ]);

    if (returnError) throw persistenceError("Failed to load stock-return history", returnError.message);
    if (withdrawalItemError) throw persistenceError("Failed to load withdrawal items", withdrawalItemError.message);

    const returns = (returnData ?? []) as StockMovementRow[];
    const returnIds = returns.map((movement) => movement.id);

    let returnItems: StockMovementItemRow[] = [];
    if (returnIds.length > 0) {
      const { data, error } = await this.client
        .from("stock_movement_items")
        .select("movement_id, stock_item_id, quantity, unit_cost_snapshot")
        .eq("organization_id", organizationId)
        .in("movement_id", returnIds);

      if (error) throw persistenceError("Failed to load stock-return items", error.message);
      returnItems = (data ?? []) as StockMovementItemRow[];
    }

    const withdrawalItems = new Map(
      ((withdrawalItemData ?? []) as StockMovementItemRow[]).map((item) => [item.movement_id, item]),
    );
    const returnItemsByMovement = new Map(returnItems.map((item) => [item.movement_id, item]));
    const returnedByWithdrawal = new Map<string, Quantity>();

    for (const movement of returns) {
      if (!movement.reversal_of_movement_id) continue;
      const item = returnItemsByMovement.get(movement.id);
      if (!item) continue;
      const previous = returnedByWithdrawal.get(movement.reversal_of_movement_id) ?? Quantity.zero();
      returnedByWithdrawal.set(
        movement.reversal_of_movement_id,
        previous.add(Quantity.fromDecimal(String(item.quantity))),
      );
    }

    const candidates = withdrawals.flatMap((movement): RuntimeStockReturnCandidate[] => {
      const item = withdrawalItems.get(movement.id);
      if (!item || !movement.source_location_id) return [];

      const withdrawnQuantity = Quantity.fromDecimal(String(item.quantity));
      const returnedQuantity = returnedByWithdrawal.get(movement.id) ?? Quantity.zero();
      const remainingQuantity = withdrawnQuantity.subtract(returnedQuantity);
      if (!remainingQuantity.isPositive()) return [];

      return [Object.freeze({
        withdrawalMovementId: movement.id as EntityId,
        stockItemId: item.stock_item_id as EntityId,
        stockLocationId: movement.source_location_id as EntityId,
        withdrawnQuantity,
        returnedQuantity,
        remainingQuantity,
        unitCostSnapshot: Money.fromDecimal(String(item.unit_cost_snapshot)),
        occurredAt: movement.occurred_at,
        notes: movement.notes ?? undefined,
      })];
    });

    const recent = returns.flatMap((movement): RuntimeStockReturn[] => {
      const item = returnItemsByMovement.get(movement.id);
      if (!item || !movement.reversal_of_movement_id || !movement.destination_location_id) return [];

      return [Object.freeze({
        id: movement.id as EntityId,
        withdrawalMovementId: movement.reversal_of_movement_id as EntityId,
        stockItemId: item.stock_item_id as EntityId,
        stockLocationId: movement.destination_location_id as EntityId,
        quantity: Quantity.fromDecimal(String(item.quantity)),
        unitCostSnapshot: Money.fromDecimal(String(item.unit_cost_snapshot)),
        occurredAt: movement.occurred_at,
        notes: movement.notes ?? undefined,
      })];
    });

    return Object.freeze({ candidates, recent });
  }

  async record(input: RecordStockReturnInput): Promise<RecordStockReturnResult> {
    const commandId = input.commandId ?? newEntityId();

    const { data, error } = await this.client.rpc("record_stock_return", {
      p_command_id: commandId,
      p_organization_id: input.organizationId,
      p_withdrawal_movement_id: input.withdrawalMovementId,
      p_quantity: input.quantity,
      p_notes: input.notes ?? null,
    });

    if (error) throw persistenceError("Failed to record stock return", error.message);
    const row = (data as StockReturnRpcRow[] | null)?.[0];
    if (!row) throw persistenceError("Stock return RPC returned no result");

    return {
      movementId: row.movement_id as EntityId,
      withdrawalMovementId: row.withdrawal_movement_id as EntityId,
      returnedQuantity: Quantity.fromDecimal(String(row.returned_quantity)),
      remainingReturnableQuantity: Quantity.fromDecimal(String(row.remaining_returnable_quantity)),
      balance: Object.freeze({
        stockItemId: row.stock_item_id as EntityId,
        stockLocationId: row.stock_location_id as EntityId,
        quantity: Quantity.fromDecimal(String(row.quantity_on_hand)),
        averageCost: Money.fromDecimal(String(row.average_cost)),
      }),
    };
  }
}
