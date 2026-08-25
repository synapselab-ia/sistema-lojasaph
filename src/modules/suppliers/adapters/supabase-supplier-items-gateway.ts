import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Quantity } from "@/domain/common/quantity";
import {
  normalizeSupplierItemDraft,
  type SupplierItemDraft,
  type SupplierItemLink,
} from "@/lib/suppliers/supplier-items";

interface SupplierItemRow {
  id: string;
  stock_item_id: string;
  purchase_unit: string | null;
  units_per_package: string | number | null;
  active: boolean;
}

function gatewayError(message: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", message);
}

function mapRow(row: SupplierItemRow): SupplierItemLink {
  return Object.freeze({
    id: row.id as EntityId,
    stockItemId: row.stock_item_id as EntityId,
    purchaseUnit: row.purchase_unit ?? undefined,
    unitsPerPackage: row.units_per_package == null
      ? undefined
      : Quantity.fromDecimal(String(row.units_per_package)),
    active: row.active,
  });
}

export class SupabaseSupplierItemsGateway {
  constructor(private readonly client: SupabaseClient) {}

  async list(organizationId: EntityId, supplierId: EntityId): Promise<readonly SupplierItemLink[]> {
    const { data, error } = await this.client
      .from("supplier_items")
      .select("id, stock_item_id, purchase_unit, units_per_package, active")
      .eq("organization_id", organizationId)
      .eq("supplier_id", supplierId)
      .is("supplier_sku", null)
      .order("created_at", { ascending: true });

    if (error) throw gatewayError("Não foi possível carregar os produtos do fornecedor.");
    return Object.freeze(((data ?? []) as SupplierItemRow[]).map(mapRow));
  }

  async createOrReactivate(
    organizationId: EntityId,
    supplierId: EntityId,
    input: SupplierItemDraft,
  ): Promise<SupplierItemLink> {
    const normalized = normalizeSupplierItemDraft(input);

    const { data: existingData, error: existingError } = await this.client
      .from("supplier_items")
      .select("id, stock_item_id, purchase_unit, units_per_package, active")
      .eq("organization_id", organizationId)
      .eq("supplier_id", supplierId)
      .eq("stock_item_id", normalized.stockItemId)
      .is("supplier_sku", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingError) throw gatewayError("Não foi possível verificar o vínculo do produto com o fornecedor.");

    const payload = {
      purchase_unit: normalized.purchaseUnit ?? null,
      units_per_package: normalized.unitsPerPackage?.toDecimal() ?? null,
      active: normalized.active,
    };

    if (existingData) {
      const existing = existingData as SupplierItemRow;
      const { data, error } = await this.client
        .from("supplier_items")
        .update(payload)
        .eq("organization_id", organizationId)
        .eq("supplier_id", supplierId)
        .eq("id", existing.id)
        .select("id, stock_item_id, purchase_unit, units_per_package, active")
        .single();

      if (error) throw gatewayError("Não foi possível reativar o produto do fornecedor.");
      return mapRow(data as SupplierItemRow);
    }

    const { data, error } = await this.client
      .from("supplier_items")
      .insert({
        id: newEntityId(),
        organization_id: organizationId,
        supplier_id: supplierId,
        stock_item_id: normalized.stockItemId,
        supplier_sku: null,
        ...payload,
      })
      .select("id, stock_item_id, purchase_unit, units_per_package, active")
      .single();

    if (error) throw gatewayError("Não foi possível vincular o produto ao fornecedor.");
    return mapRow(data as SupplierItemRow);
  }

  async update(
    organizationId: EntityId,
    supplierId: EntityId,
    supplierItemId: EntityId,
    input: SupplierItemDraft,
  ): Promise<SupplierItemLink> {
    const normalized = normalizeSupplierItemDraft(input);
    const { data, error } = await this.client
      .from("supplier_items")
      .update({
        purchase_unit: normalized.purchaseUnit ?? null,
        units_per_package: normalized.unitsPerPackage?.toDecimal() ?? null,
        active: normalized.active,
      })
      .eq("organization_id", organizationId)
      .eq("supplier_id", supplierId)
      .eq("stock_item_id", normalized.stockItemId)
      .eq("id", supplierItemId)
      .is("supplier_sku", null)
      .select("id, stock_item_id, purchase_unit, units_per_package, active")
      .maybeSingle();

    if (error) throw gatewayError("Não foi possível atualizar o produto do fornecedor.");
    if (!data) throw new DomainError("SUPPLIER_ITEM_NOT_FOUND", "Produto do fornecedor não encontrado.");
    return mapRow(data as SupplierItemRow);
  }
}
