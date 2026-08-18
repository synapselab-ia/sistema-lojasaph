import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Quantity } from "@/domain/common/quantity";

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
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseStockTransferGateway {
  constructor(private readonly client: SupabaseClient) {}

  async dispatch(input: DispatchSupabaseStockTransferInput): Promise<SupabaseStockTransferResult> {
    const quantity = Quantity.fromDecimal(input.quantity);
    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Transfer quantity must be greater than zero.");
    }
    if (input.sourceLocationId === input.destinationLocationId) {
      throw new DomainError("SAME_TRANSFER_LOCATION", "Transfer source and destination must be different.");
    }

    const { data, error } = await this.client.rpc("dispatch_stock_transfer", {
      p_command_id: input.commandId ?? newEntityId(),
      p_organization_id: input.organizationId,
      p_stock_item_id: input.stockItemId,
      p_source_location_id: input.sourceLocationId,
      p_destination_location_id: input.destinationLocationId,
      p_quantity: quantity.toDecimal(),
      p_preferred_batch_id: input.preferredBatchId ?? null,
      p_notes: input.notes?.trim() || null,
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
  }

  async receive(input: ReceiveSupabaseStockTransferInput): Promise<SupabaseStockTransferResult> {
    const quantity = input.quantity?.trim() ? Quantity.fromDecimal(input.quantity) : undefined;
    if (quantity && !quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "Receipt quantity must be greater than zero.");
    }

    const { data, error } = await this.client.rpc("receive_stock_transfer", {
      p_command_id: input.commandId ?? newEntityId(),
      p_organization_id: input.organizationId,
      p_transfer_id: input.transferId,
      p_quantity: quantity?.toDecimal() ?? null,
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
  }
}
