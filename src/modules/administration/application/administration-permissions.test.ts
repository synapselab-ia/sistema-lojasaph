import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { AdministrationMembershipScope } from "../domain/administration";
import {
  canManageBusiness,
  canManageOrganizationAccess,
  canManageSector,
  canManageStockLocation,
  canManageUnit,
} from "./administration-permissions";

const businessA = "00000000-0000-4000-8000-000000000010" as EntityId;
const businessB = "00000000-0000-4000-8000-000000000020" as EntityId;
const unitA = "00000000-0000-4000-8000-000000000100" as EntityId;
const unitB = "00000000-0000-4000-8000-000000000200" as EntityId;
const sectorA = "00000000-0000-4000-8000-000000000110" as EntityId;

function membership(patch: Partial<AdministrationMembershipScope> = {}): AdministrationMembershipScope {
  return {
    role: "manager",
    active: true,
    ...patch,
  };
}

describe("administration permissions", () => {
  it("requires Organization-wide management role for Business maintenance", () => {
    expect(canManageBusiness([membership()])).toBe(true);
    expect(canManageBusiness([membership({ businessId: businessA })])).toBe(false);
    expect(canManageBusiness([membership({ role: "viewer" })])).toBe(false);
  });

  it("allows Unit maintenance from Organization or matching Business scope", () => {
    expect(canManageUnit([membership()], businessA)).toBe(true);
    expect(canManageUnit([membership({ businessId: businessA })], businessA)).toBe(true);
    expect(canManageUnit([membership({ businessId: businessB })], businessA)).toBe(false);
    expect(canManageUnit([membership({ unitId: unitA })], businessA)).toBe(false);
  });

  it("allows Sector and StockLocation maintenance only within effective scope", () => {
    const target = { businessId: businessA, unitId: unitA, sectorId: sectorA };
    expect(canManageSector([membership()], target)).toBe(true);
    expect(canManageSector([membership({ businessId: businessA })], target)).toBe(true);
    expect(canManageSector([membership({ unitId: unitA })], target)).toBe(true);
    expect(canManageSector([membership({ sectorId: sectorA })], target)).toBe(true);
    expect(canManageSector([membership({ unitId: unitB })], target)).toBe(false);
    expect(canManageStockLocation([membership({ sectorId: sectorA })], target)).toBe(true);
  });

  it("requires Organization-wide owner/admin for access administration", () => {
    expect(canManageOrganizationAccess(["owner"])).toBe(true);
    expect(canManageOrganizationAccess(["admin"])).toBe(true);
    expect(canManageOrganizationAccess(["manager", "owner-scoped"])).toBe(false);
  });
});
