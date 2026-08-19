import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { SupabaseStockWithdrawalGateway } from "./supabase-stock-withdrawal-gateway";

const organizationId = "10000000-0000-4000-8000-000000000001" as EntityId;
const stockItemId = "10000000-0000-4000-8000-000000000002" as EntityId;
const stockLocationId = "10000000-0000-4000-8000-000000000003" as EntityId;
const sectorId = "10000000-0000-4000-8000-000000000004" as EntityId;
const commandId = "10000000-0000-4000-8000-000000000005" as EntityId;

describe("SupabaseStockWithdrawalGateway", () => {
  it("sends the explicit sector to the withdrawal RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ movement_id: commandId, quantity_on_hand: "4.000", average_cost: "2.50" }],
      error: null,
    });
    const gateway = new SupabaseStockWithdrawalGateway({ rpc } as unknown as SupabaseClient);

    await gateway.record({
      commandId,
      organizationId,
      stockItemId,
      stockLocationId,
      sectorId,
      quantity: "1.000",
      notes: "Consumo cozinha",
    });

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
