import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";

export interface SupplierContact {
  readonly id: EntityId;
  readonly name: string;
  readonly phone?: string;
  readonly email?: string;
  readonly isPrimary: boolean;
}

export interface Supplier {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly tradeName: string;
  readonly taxId?: string;
  readonly active: boolean;
  readonly contacts: readonly SupplierContact[];
}

export interface SupplierContactInput {
  name: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface CreateSupplierInput {
  organizationId: EntityId;
  tradeName: string;
  taxId?: string;
  contacts?: readonly SupplierContactInput[];
}

export interface UpdateSupplierInput {
  tradeName: string;
  taxId?: string;
  active: boolean;
  contacts: readonly SupplierContactInput[];
}

function normalizeTradeName(value: string): string {
  const name = value.trim();
  if (!name) {
    throw new DomainError("INVALID_SUPPLIER_NAME", "Supplier trade name is required.");
  }
  return name;
}

function createContacts(inputs: readonly SupplierContactInput[]): readonly SupplierContact[] {
  const normalized = inputs
    .filter((contact) => contact.name.trim())
    .map((contact, index) =>
      Object.freeze({
        id: newEntityId(),
        name: contact.name.trim(),
        phone: contact.phone?.trim() || undefined,
        email: contact.email?.trim() || undefined,
        isPrimary: contact.isPrimary ?? index === 0,
      }),
    );

  if (normalized.filter((contact) => contact.isPrimary).length > 1) {
    throw new DomainError("MULTIPLE_PRIMARY_CONTACTS", "A supplier can have only one primary contact.");
  }

  return normalized;
}

export function createSupplier(input: CreateSupplierInput): Supplier {
  return Object.freeze({
    id: newEntityId(),
    organizationId: input.organizationId,
    tradeName: normalizeTradeName(input.tradeName),
    taxId: input.taxId?.trim() || undefined,
    active: true,
    contacts: createContacts(input.contacts ?? []),
  });
}

export function updateSupplier(supplier: Supplier, input: UpdateSupplierInput): Supplier {
  return Object.freeze({
    ...supplier,
    tradeName: normalizeTradeName(input.tradeName),
    taxId: input.taxId?.trim() || undefined,
    active: input.active,
    contacts: createContacts(input.contacts),
  });
}
