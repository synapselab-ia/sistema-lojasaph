import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Quantity } from "@/domain/common/quantity";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";

export type RuntimeTransferStatus = "dispatched" | "partially_received" | "received" | "cancelled";

export interface DispatchSupabaseStockTransferInput {
  commandId?: EntityId;
  organizationId: EntityId;
  stockItemId: EntityId;
  sourceLocationId: EntityId;
  destinationLocationId: EntityId;
  quantity: string;
  preferredBatchId?: EntityId;
  notes?: string;
}

export interface ReceiveSupabaseStockTransferInput {
  commandId?: EntityId;
  organizationId: EntityId;
  transferId: EntityId;
  quantity?: string;
}

export interface SupabaseStockTransferResult {
  transferId: EntityId;
  status: RuntimeTransferStatus;
  dispatchedQuantity: Quantity;
  receivedQuantity: Quantity;
  receivedNow?: Quantity;
}

interface DispatchRpcRow {
  transfer_id: string;
  transfer_status: RuntimeTransferStatus;
  dispatched_quantity: number | string;
  received_quantity: number | string;
}

interface ReceiveRpcRow extends DispatchRpcRow {
  received_now: number | string;
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

export class SupabaseStockTransferGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async dispatch(input: DispatchSupabaseStockTransferInput): Promise<SupabaseStockTransferResult> {
    const quantity = Quantity.fromDecimal(input.quantity);
    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Transfer quantity must be greater than zero.");
    }
    if (input.sourceLocationId === input.destinationLocationId) {
      throw new DomainError("SAME_TRANSFER_LOCATION", "Transfer source and destination must be different.");
    }

    const semanticPayload = {
      organizationId: input.organizationId,
      stockItemId: input.stockItemId,
      sourceLocationId: input.sourceLocationId,
      destinationLocationId: input.destinationLocationId,
      quantity: quantity.toDecimal(),
      preferredBatchId: input.preferredBatchId ?? null,
      notes: input.notes?.trim() || null,
    };

    const execute = async (commandId: EntityId): Promise<SupabaseStockTransferResult> => {
      const { data, error } = await this.client.rpc("dispatch_stock_transfer", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_stock_item_id: semanticPayload.stockItemId,
        p_source_location_id: semanticPayload.sourceLocationId,
        p_destination_location_id: semanticPayload.destinationLocationId,
        p_quantity: semanticPayload.quantity,
        p_preferred_batch_id: semanticPayload.preferredBatchId,
        p_notes: semanticPayload.notes,
      });

      if (error) throw persistenceError("Failed to dispatch stock transfer", error.message);
      const row = (data as DispatchRpcRow[] | null)?.[0];
      if (!row) throw persistenceError("Transfer dispatch RPC returned no result");

      return {
        transferId: row.transfer_id as EntityId,
        status: row.transfer_status,
        dispatchedQuantity: Quantity.fromDecimal(String(row.dispatched_quantity)),
        receivedQuantity: Quantity.fromDecimal(String(row.received_quantity)),
      };
    };

    if (input.commandId) return execute(input.commandId);
    return this.commands.execute("stock-transfer:dispatch", semanticPayload, execute);
  }

  async receive(input: ReceiveSupabaseStockTransferInput): Promise<SupabaseStockTransferResult> {
    const quantity = input.quantity?.trim() ? Quantity.fromDecimal(input.quantity) : undefined;
    if (quantity && !quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Receipt quantity must be greater than zero.");
    }

    const semanticPayload = {
      organizationId: input.organizationId,
      transferId: input.transferId,
      quantity: quantity?.toDecimal() ?? null,
    };

    const execute = async (commandId: EntityId): Promise<SupabaseStockTransferResult> => {
      const { data, error } = await this.client.rpc("receive_stock_transfer", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_transfer_id: semanticPayload.transferId,
        p_quantity: semanticPayload.quantity,
      });

      if (error) throw persistenceError("Failed to receive stock transfer", error.message);
      const row = (data as ReceiveRpcRow[] | null)?.[0];
      if (!row) throw persistenceError("Transfer receive RPC returned no result");

      return {
        transferId: row.transfer_id as EntityId,
        status: row.transfer_status,
        dispatchedQuantity: Quantity.fromDecimal(String(row.dispatched_quantity)),
        receivedQuantity: Quantity.fromDecimal(String(row.received_quantity)),
        receivedNow: Quantity.fromDecimal(String(row.received_now)),
      };
    };

    if (input.commandId) return execute(input.commandId);
    return this.commands.execute(`stock-transfer:receive:${input.transferId}`, semanticPayload, execute);
  }
}
