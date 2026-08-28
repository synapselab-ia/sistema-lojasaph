import { EntityId } from "@/domain/common/entity-id";
import { AdministrationMembershipScope } from "../domain/administration";

const MANAGEMENT_ROLES = new Set(["owner", "admin", "manager"]);

function isManagementMembership(membership: AdministrationMembershipScope): boolean {
  return membership.active && MANAGEMENT_ROLES.has(membership.role);
}

export function canManageBusiness(memberships: readonly AdministrationMembershipScope[]): boolean {
  return memberships.some((membership) =>
    isManagementMembership(membership)
    && !membership.businessId
    && !membership.unitId
    && !membership.sectorId,
  );
}

export function canManageUnit(
  memberships: readonly AdministrationMembershipScope[],
  businessId: EntityId,
): boolean {
  return memberships.some((membership) => {
    if (!isManagementMembership(membership) || membership.unitId || membership.sectorId) return false;
    return !membership.businessId || membership.businessId === businessId;
  });
}

export function canManageSector(
  memberships: readonly AdministrationMembershipScope[],
  input: { readonly businessId: EntityId; readonly unitId: EntityId; readonly sectorId?: EntityId },
): boolean {
  return memberships.some((membership) => {
    if (!isManagementMembership(membership)) return false;
    if (membership.sectorId) return Boolean(input.sectorId && membership.sectorId === input.sectorId);
    if (membership.unitId) return membership.unitId === input.unitId;
    if (membership.businessId) return membership.businessId === input.businessId;
    return true;
  });
}

export function canManageStockLocation(
  memberships: readonly AdministrationMembershipScope[],
  input: { readonly businessId: EntityId; readonly unitId: EntityId; readonly sectorId?: EntityId },
): boolean {
  return canManageSector(memberships, input);
}

export function canManageOrganizationAccess(organizationWideRoles: readonly string[]): boolean {
  return organizationWideRoles.some((role) => role === "owner" || role === "admin");
}
