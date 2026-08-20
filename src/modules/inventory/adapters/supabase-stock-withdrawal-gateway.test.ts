import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { SupabaseStockWithdrawalGateway } from "./supabase-stock-withdrawal-gateway";

const organizationId = "10000000-0000-4000-8000-000000000001" as EntityId;
const stockItemId = "10000000-0000-4000-8000-000000000002" as EntityId;
const stockLocationId = "10000000-0000-4000-8000-000000000003" as EntityId;
const sectorId = "10000000-0000-4000-8000-000000000004" as EntityId;
const commandId = "10000000-0000-4000-8000-000000000005" as EntityId;

const input = {
  organizationId,
  stockItemId,
  stockLocationId,
  sectorId,
  quantity: "1.000",
  notes: "Consumo cozinha",
};

const successfulRow = {
  data: [{ movement_id: commandId, quantity_on_hand: "4.000", average_cost: "2.50" }],
  error: null,
};

describe("SupabaseStockWithdrawalGateway", () => {
  it("sends the explicit sector to the withdrawal RPC", async () => {
    const rpc = vi.fn().mockResolvedValue(successfulRow);
    const gateway = new SupabaseStockWithdrawalGateway({ rpc } as unknown as SupabaseClient);

    await gateway.record({ commandId, ...input });

    expect(rpc).toHaveBeenCalledWith("record_stock_withdrawal", {
      p_command_id: commandId,
      p_organization_id: organizationId,
      p_stock_item_id: stockItemId,
      p_stock_location_id: stockLocationId,
      p_sector_id: sectorId,
      p_quantity: "1",
      p_preferred_batch_id: null,
      p_notes: "Consumo cozinha",
    });
  });

  it("reuses the generated command id after an ambiguous persistence failure", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: "network request failed after send" } })
      .mockResolvedValueOnce(successfulRow);
    const gateway = new SupabaseStockWithdrawalGateway({ rpc } as unknown as SupabaseClient);

    await expect(gateway.record(input)).rejects.toMatchObject({ code: "SUPABASE_PERSISTENCE_ERROR" });
    await expect(gateway.record(input)).resolves.toBeDefined();

    const firstArgs = rpc.mock.calls[0]?.[1] as { p_command_id: EntityId };
    const secondArgs = rpc.mock.calls[1]?.[1] as { p_command_id: EntityId };
    expect(firstArgs.p_command_id).toBe(secondArgs.p_command_id);
  });

  it("keeps idempotency conflicts visible for reconciliation", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "duplicate key: IDEMPOTENCY_KEY_CONFLICT" },
    });
    const gateway = new SupabaseStockWithdrawalGateway({ rpc } as unknown as SupabaseClient);

    await expect(gateway.record(input)).rejects.toMatchObject({
      code: "IDEMPOTENCY_KEY_CONFLICT",
    });
  });

  it("rejects a missing sector before calling persistence", async () => {
    const rpc = vi.fn();
    const gateway = new SupabaseStockWithdrawalGateway({ rpc } as unknown as SupabaseClient);

    await expect(gateway.record({
      commandId,
      organizationId,
      stockItemId,
      stockLocationId,
      sectorId: "" as EntityId,
      quantity: "1.000",
    })).rejects.toMatchObject({ code: "STOCK_WITHDRAWAL_SECTOR_REQUIRED" });

    expect(rpc).not.toHaveBeenCalled();
  });
});
