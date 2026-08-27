import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import type { RuntimeWorkspaceInitialData } from "./runtime-workspace-provider";
import {
  hydrateRuntimeWorkspaceInitialData,
  serializeRuntimeWorkspaceInitialData,
} from "./runtime-workspace-wire";

const itemId = "00000000-0000-0000-0000-000000000001" as EntityId;
const locationId = "00000000-0000-0000-0000-000000000002" as EntityId;
const destinationId = "00000000-0000-0000-0000-000000000003" as EntityId;
const batchId = "00000000-0000-0000-0000-000000000004" as EntityId;
const transferId = "00000000-0000-0000-0000-000000000005" as EntityId;
const lossId = "00000000-0000-0000-0000-000000000006" as EntityId;
const minimumId = "00000000-0000-0000-0000-000000000007" as EntityId;

function fixture(): RuntimeWorkspaceInitialData {
  return {
    categories: [],
    unitsOfMeasure: [],
    units: [],
    sectors: [],
    stockLocations: [],
    stockItems: [],
    suppliers: [],
    employees: [],
    stockLossReasons: [],
    balances: [{
      stockItemId: itemId,
      stockLocationId: locationId,
      quantity: Quantity.fromMilliunits(1250),
      averageCost: Money.fromCents(450),
    }],
    batches: [{
      id: batchId,
      stockItemId: itemId,
      stockLocationId: locationId,
      receivedAt: "2026-08-20T10:00:00.000Z",
      originalQuantity: Quantity.fromMilliunits(2000),
      remainingQuantity: Quantity.fromMilliunits(1250),
      unitCost: Money.fromCents(450),
      sourceType: "entry",
    }],
    transfers: [{
      id: transferId,
      stockItemId: itemId,
      sourceLocationId: locationId,
      destinationLocationId: destinationId,
      status: "dispatched",
      requestedAt: "2026-08-20T10:00:00.000Z",
      dispatchedQuantity: Quantity.fromMilliunits(500),
      receivedQuantity: Quantity.zero(),
      unitCostSnapshot: Money.fromCents(450),
    }],
    stockLosses: [{
      id: lossId,
      stockItemId: itemId,
      stockLocationId: locationId,
      quantity: Quantity.fromMilliunits(250),
      unitCostSnapshot: Money.fromCents(450),
      movementType: "loss",
      reasonCode: "damage",
      occurredAt: "2026-08-20T10:00:00.000Z",
    }],
    stockMinimumPolicies: [{
      id: minimumId,
      stockItemId: itemId,
      stockLocationId: locationId,
      minimumQuantity: Quantity.fromMilliunits(1500),
      active: true,
    }],
  };
}

describe("runtime workspace wire boundary", () => {
  it("serializes Money and Quantity into plain objects for React server-to-client props", () => {
    const wire = serializeRuntimeWorkspaceInitialData(fixture());

    expect(Object.getPrototypeOf(wire.balances[0].quantity)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(wire.balances[0].averageCost)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(wire.batches[0].remainingQuantity)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(wire.transfers[0].unitCostSnapshot)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(wire.stockLosses[0].quantity)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(wire.stockMinimumPolicies[0].minimumQuantity)).toBe(Object.prototype);
  });

  it("hydrates the domain value objects again on the client side", () => {
    const hydrated = hydrateRuntimeWorkspaceInitialData(
      serializeRuntimeWorkspaceInitialData(fixture()),
    );

    expect(hydrated.balances[0].quantity.toDecimal()).toBe("1.25");
    expect(hydrated.balances[0].averageCost.toDecimal()).toBe("4.50");
    expect(hydrated.batches[0].remainingQuantity.toDecimal()).toBe("1.25");
    expect(hydrated.transfers[0].dispatchedQuantity.toDecimal()).toBe("0.5");
    expect(hydrated.stockLosses[0].unitCostSnapshot.toDecimal()).toBe("4.50");
    expect(hydrated.stockMinimumPolicies[0].minimumQuantity.toDecimal()).toBe("1.5");
  });
});
