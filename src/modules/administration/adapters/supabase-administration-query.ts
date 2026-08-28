import type { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import {
  AdministrationAccess,
  AdministrationBusiness,
  AdministrationEmployee,
  AdministrationMembershipScope,
  AdministrationRole,
  AdministrationSector,
  AdministrationStatus,
  AdministrationStockLocation,
  AdministrationStructure,
  AdministrationUnit,
  StockLocationType,
} from "../domain/administration";

interface BusinessRow {
  id: string;
  name: string;
  code: string;
  status: AdministrationStatus;
}

interface UnitRow {
  id: string;
  business_id: string;
  name: string;
  code: string;
  status: AdministrationStatus;
}

interface SectorRow {
  id: string;
  unit_id: string;
  name: string;
  code: string;
  status: AdministrationStatus;
}

interface StockLocationRow {
  id: string;
  unit_id: string;
  sector_id: string | null;
  name: string;
  code: string;
  location_type: StockLocationType;
  allow_negative_stock: boolean;
  status: AdministrationStatus;
}

interface MembershipScopeRow {
  role: AdministrationRole;
  business_id: string | null;
  unit_id: string | null;
  sector_id: string | null;
  active: boolean;
}

interface AccessRow {
  membership_id: string;
  user_id: string;
  email: string;
  email_confirmed: boolean;
  role: AdministrationRole;
  business_id: string | null;
  unit_id: string | null;
  sector_id: string | null;
  active: boolean;
  employee_id: string | null;
  employee_name: string | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  code: string;
  status: AdministrationStatus;
  auth_user_id: string | null;
}

function queryError(message: string, error?: { message?: string } | null): DomainError {
  return new DomainError(
    "ADMINISTRATION_QUERY_ERROR",
    error?.message ? `${message}: ${error.message}` : message,
  );
}

export async function loadAdministrationStructure(
  client: SupabaseClient,
  organizationId: EntityId,
  currentUserId: EntityId,
): Promise<AdministrationStructure> {
  const [businessResult, unitResult, sectorResult, locationResult, membershipResult] = await Promise.all([
    client
      .from("businesses")
      .select("id, name, code, status")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    client
      .from("units")
      .select("id, business_id, name, code, status")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    client
      .from("sectors")
      .select("id, unit_id, name, code, status")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    client
      .from("stock_locations")
      .select("id, unit_id, sector_id, name, code, location_type, allow_negative_stock, status")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    client
      .from("organization_memberships")
      .select("role, business_id, unit_id, sector_id, active")
      .eq("organization_id", organizationId)
      .eq("user_id", currentUserId)
      .eq("active", true),
  ]);

  if (businessResult.error) throw queryError("Não foi possível carregar os negócios visíveis", businessResult.error);
  if (unitResult.error) throw queryError("Não foi possível carregar as unidades visíveis", unitResult.error);
  if (sectorResult.error) throw queryError("Não foi possível carregar os setores visíveis", sectorResult.error);
  if (locationResult.error) throw queryError("Não foi possível carregar os locais de estoque visíveis", locationResult.error);
  if (membershipResult.error) throw queryError("Não foi possível carregar seu escopo administrativo", membershipResult.error);

  const businesses: AdministrationBusiness[] = ((businessResult.data ?? []) as BusinessRow[]).map((row) => ({
    id: row.id as EntityId,
    name: row.name,
    code: row.code,
    status: row.status,
  }));
  const units: AdministrationUnit[] = ((unitResult.data ?? []) as UnitRow[]).map((row) => ({
    id: row.id as EntityId,
    businessId: row.business_id as EntityId,
    name: row.name,
    code: row.code,
    status: row.status,
  }));
  const sectors: AdministrationSector[] = ((sectorResult.data ?? []) as SectorRow[]).map((row) => ({
    id: row.id as EntityId,
    unitId: row.unit_id as EntityId,
    name: row.name,
    code: row.code,
    status: row.status,
  }));
  const stockLocations: AdministrationStockLocation[] = ((locationResult.data ?? []) as StockLocationRow[]).map((row) => ({
    id: row.id as EntityId,
    unitId: row.unit_id as EntityId,
    sectorId: row.sector_id ? (row.sector_id as EntityId) : undefined,
    name: row.name,
    code: row.code,
    locationType: row.location_type,
    allowNegativeStock: row.allow_negative_stock,
    status: row.status,
  }));
  const ownMemberships: AdministrationMembershipScope[] = ((membershipResult.data ?? []) as MembershipScopeRow[]).map((row) => ({
    role: row.role,
    businessId: row.business_id ? (row.business_id as EntityId) : undefined,
    unitId: row.unit_id ? (row.unit_id as EntityId) : undefined,
    sectorId: row.sector_id ? (row.sector_id as EntityId) : undefined,
    active: row.active,
  }));

  return { businesses, units, sectors, stockLocations, ownMemberships };
}

export async function loadAdministrationAccess(
  client: SupabaseClient,
  organizationId: EntityId,
): Promise<readonly AdministrationAccess[]> {
  const { data, error } = await client.rpc("admin_list_organization_access", {
    target_organization_id: organizationId,
  });
  if (error) throw queryError("Não foi possível carregar os acessos da organização", error);

  return ((data ?? []) as AccessRow[]).map((row) => ({
    membershipId: row.membership_id as EntityId,
    userId: row.user_id as EntityId,
    email: row.email,
    emailConfirmed: row.email_confirmed,
    role: row.role,
    businessId: row.business_id ? (row.business_id as EntityId) : undefined,
    unitId: row.unit_id ? (row.unit_id as EntityId) : undefined,
    sectorId: row.sector_id ? (row.sector_id as EntityId) : undefined,
    active: row.active,
    employeeId: row.employee_id ? (row.employee_id as EntityId) : undefined,
    employeeName: row.employee_name ?? undefined,
  }));
}

export async function loadAdministrationEmployees(
  client: SupabaseClient,
  organizationId: EntityId,
): Promise<readonly AdministrationEmployee[]> {
  const { data, error } = await client
    .from("employees")
    .select("id, name, code, status, auth_user_id")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  if (error) throw queryError("Não foi possível carregar os funcionários da organização", error);

  return ((data ?? []) as EmployeeRow[]).map((row) => ({
    id: row.id as EntityId,
    name: row.name,
    code: row.code,
    status: row.status,
    linkedUserId: row.auth_user_id ? (row.auth_user_id as EntityId) : undefined,
  }));
}
