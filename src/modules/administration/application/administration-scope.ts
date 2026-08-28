import { EntityId, asEntityId } from "@/domain/common/entity-id";

export interface AdministrationScopeSelection {
  readonly businessId?: EntityId;
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
}

export function parseAdministrationScope(value: string): AdministrationScopeSelection | null {
  const normalized = value.trim();
  if (normalized === "organization") return {};

  const separator = normalized.indexOf(":");
  if (separator <= 0) return null;
  const kind = normalized.slice(0, separator);
  const id = normalized.slice(separator + 1);

  try {
    const entityId = asEntityId(id);
    if (kind === "business") return { businessId: entityId };
    if (kind === "unit") return { unitId: entityId };
    if (kind === "sector") return { sectorId: entityId };
  } catch {
    return null;
  }

  return null;
}

export function administrationScopeValue(scope: AdministrationScopeSelection): string {
  if (scope.sectorId) return `sector:${scope.sectorId}`;
  if (scope.unitId) return `unit:${scope.unitId}`;
  if (scope.businessId) return `business:${scope.businessId}`;
  return "organization";
}
