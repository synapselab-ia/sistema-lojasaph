import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";

export interface Employee {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly code?: string;
  readonly active: boolean;
  readonly defaultUnitId?: EntityId;
  readonly defaultSectorId?: EntityId;
  readonly linkedUserId?: EntityId;
}

export interface CreateEmployeeInput {
  organizationId: EntityId;
  name: string;
  code?: string;
  defaultUnitId?: EntityId;
  defaultSectorId?: EntityId;
  linkedUserId?: EntityId;
}

export interface UpdateEmployeeInput {
  name: string;
  code?: string;
  active: boolean;
  defaultUnitId?: EntityId;
  defaultSectorId?: EntityId;
  linkedUserId?: EntityId;
}

function normalizeName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new DomainError("INVALID_EMPLOYEE_NAME", "Employee name is required.");
  }
  return name;
}

function normalizeOptional(value?: string): string | undefined {
  return value?.trim() || undefined;
}

export function createEmployee(input: CreateEmployeeInput): Employee {
  return Object.freeze({
    id: newEntityId(),
    organizationId: input.organizationId,
    name: normalizeName(input.name),
    code: normalizeOptional(input.code),
    active: true,
    defaultUnitId: input.defaultUnitId,
    defaultSectorId: input.defaultSectorId,
    linkedUserId: input.linkedUserId,
  });
}

export function updateEmployee(employee: Employee, input: UpdateEmployeeInput): Employee {
  return Object.freeze({
    ...employee,
    name: normalizeName(input.name),
    code: normalizeOptional(input.code),
    active: input.active,
    defaultUnitId: input.defaultUnitId,
    defaultSectorId: input.defaultSectorId,
    linkedUserId: input.linkedUserId,
  });
}
