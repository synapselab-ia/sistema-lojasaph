import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import {
  DashboardSector,
  DashboardUnit,
  validateDashboardSelection,
} from "./supabase-dashboard-query";

const unitA = "10000000-0000-4000-8000-000000000001" as EntityId;
const unitB = "10000000-0000-4000-8000-000000000002" as EntityId;
const sectorA = "11000000-0000-4000-8000-000000000001" as EntityId;
const sectorB = "11000000-0000-4000-8000-000000000002" as EntityId;
const hiddenSector = "11000000-0000-4000-8000-000000000099" as EntityId;

const units: readonly DashboardUnit[] = [
  { id: unitA, name: "Unidade A" },
  { id: unitB, name: "Unidade B" },
];

// This list represents only rows returned by the authenticated/RLS-protected
// sectors query. A Sector outside this list must never become a usable filter.
const visibleSectors: readonly DashboardSector[] = [
  { id: sectorA, unitId: unitA, name: "Setor A" },
  { id: sectorB, unitId: unitB, name: "Setor B" },
];

describe("dashboard query scope validation", () => {
  it("accepts an authorized Sector with its parent Unit", () => {
    expect(() => validateDashboardSelection(units, visibleSectors, {
      unitId: unitA,
      sectorId: sectorA,
    })).not.toThrow();
  });

  it("accepts an authorized Sector without forcing a Unit filter", () => {
    expect(() => validateDashboardSelection(units, visibleSectors, {
      sectorId: sectorA,
    })).not.toThrow();
  });

  it("rejects a Sector that is not visible through the authenticated query", () => {
    expect(() => validateDashboardSelection(units, visibleSectors, {
      sectorId: hiddenSector,
    })).toThrow("DASHBOARD_SECTOR_NOT_AVAILABLE");
  });

  it("rejects an incompatible Unit and Sector combination", () => {
    expect(() => validateDashboardSelection(units, visibleSectors, {
      unitId: unitA,
      sectorId: sectorB,
    })).toThrow("DASHBOARD_SECTOR_UNIT_MISMATCH");
  });

  it("rejects a Unit that is not visible to the authenticated user", () => {
    const hiddenUnit = "10000000-0000-4000-8000-000000000099" as EntityId;
    expect(() => validateDashboardSelection(units, visibleSectors, {
      unitId: hiddenUnit,
    })).toThrow("DASHBOARD_UNIT_NOT_AVAILABLE");
  });
});
