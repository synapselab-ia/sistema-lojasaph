import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Employee } from "../domain/employee";
import { EmployeeRepository } from "../repositories/employee-repository";

interface EmployeeRow {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  status: "active" | "inactive";
  default_unit_id: string | null;
  default_sector_id: string | null;
  auth_user_id: string | null;
}

function persistenceError(message: string, cause?: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseEmployeeRepository implements EmployeeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<Employee | null> {
    const { data, error } = await this.client
      .from("employees")
      .select("id, organization_id, name, code, status, default_unit_id, default_sector_id, auth_user_id")
      .eq("id", id)
      .maybeSingle();

    if (error) throw persistenceError("Failed to load employee", error.message);
    return data ? this.mapRow(data as EmployeeRow) : null;
  }

  async listByOrganization(organizationId: EntityId): Promise<readonly Employee[]> {
    const { data, error } = await this.client
      .from("employees")
      .select("id, organization_id, name, code, status, default_unit_id, default_sector_id, auth_user_id")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    if (error) throw persistenceError("Failed to list employees", error.message);
    return ((data ?? []) as EmployeeRow[]).map((row) => this.mapRow(row));
  }

  async save(employee: Employee): Promise<void> {
    const { error } = await this.client.from("employees").upsert({
      id: employee.id,
      organization_id: employee.organizationId,
      name: employee.name,
      code: employee.code ?? null,
      status: employee.active ? "active" : "inactive",
      default_unit_id: employee.defaultUnitId ?? null,
      default_sector_id: employee.defaultSectorId ?? null,
      auth_user_id: employee.linkedUserId ?? null,
    });

    if (error) throw persistenceError("Failed to save employee", error.message);
  }

  private mapRow(row: EmployeeRow): Employee {
    return Object.freeze({
      id: row.id as EntityId,
      organizationId: row.organization_id as EntityId,
      name: row.name,
      code: row.code ?? undefined,
      active: row.status === "active",
      defaultUnitId: row.default_unit_id ? (row.default_unit_id as EntityId) : undefined,
      defaultSectorId: row.default_sector_id ? (row.default_sector_id as EntityId) : undefined,
      linkedUserId: row.auth_user_id ? (row.auth_user_id as EntityId) : undefined,
    });
  }
}
