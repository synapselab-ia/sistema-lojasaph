import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Supplier, SupplierContact } from "../domain/supplier";
import { SupplierRepository } from "../repositories/supplier-repository";

interface SupplierRow {
  id: string;
  organization_id: string;
  trade_name: string;
  tax_id: string | null;
  status: "active" | "inactive";
}

interface ContactRow {
  id: string;
  supplier_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

function persistenceError(message: string, cause?: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

export class SupabaseSupplierRepository implements SupplierRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: EntityId): Promise<Supplier | null> {
    const { data, error } = await this.client
      .from("suppliers")
      .select("id, organization_id, trade_name, tax_id, status")
      .eq("id", id)
      .maybeSingle();

    if (error) throw persistenceError("Failed to load supplier", error.message);
    if (!data) return null;

    const row = data as SupplierRow;
    const contacts = await this.listContacts([row.id]);
    return this.mapRow(row, contacts.get(row.id) ?? []);
  }

  async listByOrganization(organizationId: EntityId): Promise<readonly Supplier[]> {
    const { data, error } = await this.client
      .from("suppliers")
      .select("id, organization_id, trade_name, tax_id, status")
      .eq("organization_id", organizationId)
      .order("trade_name", { ascending: true });

    if (error) throw persistenceError("Failed to list suppliers", error.message);
    const rows = (data ?? []) as SupplierRow[];
    const contacts = await this.listContacts(rows.map((row) => row.id));
    return rows.map((row) => this.mapRow(row, contacts.get(row.id) ?? []));
  }

  async save(supplier: Supplier): Promise<void> {
    const { error: supplierError } = await this.client.from("suppliers").upsert({
      id: supplier.id,
      organization_id: supplier.organizationId,
      trade_name: supplier.tradeName,
      tax_id: supplier.taxId ?? null,
      status: supplier.active ? "active" : "inactive",
    });
    if (supplierError) throw persistenceError("Failed to save supplier", supplierError.message);

    const { error: deactivateError } = await this.client
      .from("supplier_contacts")
      .update({ active: false, is_primary: false })
      .eq("organization_id", supplier.organizationId)
      .eq("supplier_id", supplier.id)
      .eq("active", true);
    if (deactivateError) throw persistenceError("Failed to retire previous supplier contacts", deactivateError.message);

    if (supplier.contacts.length === 0) return;

    const { error: contactsError } = await this.client.from("supplier_contacts").upsert(
      supplier.contacts.map((contact) => ({
        id: contact.id,
        organization_id: supplier.organizationId,
        supplier_id: supplier.id,
        name: contact.name,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        is_primary: contact.isPrimary,
        active: true,
      })),
    );
    if (contactsError) throw persistenceError("Failed to save supplier contacts", contactsError.message);
  }

  private mapRow(row: SupplierRow, contacts: readonly SupplierContact[]): Supplier {
    return Object.freeze({
      id: row.id as EntityId,
      organizationId: row.organization_id as EntityId,
      tradeName: row.trade_name,
      taxId: row.tax_id ?? undefined,
      active: row.status === "active",
      contacts,
    });
  }

  private async listContacts(supplierIds: readonly string[]): Promise<Map<string, readonly SupplierContact[]>> {
    if (supplierIds.length === 0) return new Map();

    const { data, error } = await this.client
      .from("supplier_contacts")
      .select("id, supplier_id, name, phone, email, is_primary")
      .in("supplier_id", [...supplierIds])
      .eq("active", true)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw persistenceError("Failed to load supplier contacts", error.message);
    const result = new Map<string, SupplierContact[]>();
    for (const row of (data ?? []) as ContactRow[]) {
      const contact: SupplierContact = Object.freeze({
        id: row.id as EntityId,
        name: row.name,
        phone: row.phone ?? undefined,
        email: row.email ?? undefined,
        isPrimary: row.is_primary,
      });
      const contacts = result.get(row.supplier_id) ?? [];
      contacts.push(contact);
      result.set(row.supplier_id, contacts);
    }
    return result;
  }
}
