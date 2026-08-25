import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import {
  hasSupplierTermValues,
  normalizeSupplierCommercialTermsDraft,
  type SupplierCommercialTerms,
  type SupplierCommercialTermsDraft,
} from "@/lib/suppliers/commercial-terms";

interface SupplierNotesRow {
  notes: string | null;
}

interface SupplierTermRow {
  id: string;
  minimum_order_value: string | number | null;
  payment_terms: string | null;
  order_schedule: string | null;
  delivery_schedule: string | null;
}

function gatewayError(message: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", message);
}

export class SupabaseSupplierCommercialTermsGateway {
  constructor(private readonly client: SupabaseClient) {}

  async load(
    organizationId: EntityId,
    supplierId: EntityId,
  ): Promise<SupplierCommercialTerms> {
    const [supplierResult, termResult] = await Promise.all([
      this.client
        .from("suppliers")
        .select("notes")
        .eq("organization_id", organizationId)
        .eq("id", supplierId)
        .maybeSingle(),
      this.client
        .from("supplier_terms")
        .select("id, minimum_order_value, payment_terms, order_schedule, delivery_schedule")
        .eq("organization_id", organizationId)
        .eq("supplier_id", supplierId)
        .is("valid_to", null)
        .order("valid_from", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (supplierResult.error) {
      throw gatewayError("Não foi possível carregar as observações do fornecedor.");
    }
    if (!supplierResult.data) {
      throw new DomainError("SUPPLIER_NOT_FOUND", "Fornecedor não encontrado.");
    }
    if (termResult.error) {
      throw gatewayError("Não foi possível carregar as condições comerciais do fornecedor.");
    }

    const supplier = supplierResult.data as SupplierNotesRow;
    const term = termResult.data as SupplierTermRow | null;

    return Object.freeze({
      supplierId,
      termId: term?.id as EntityId | undefined,
      notes: supplier.notes ?? undefined,
      minimumOrderValue: term?.minimum_order_value == null
        ? undefined
        : Money.fromDecimal(String(term.minimum_order_value)),
      paymentTerms: term?.payment_terms ?? undefined,
      orderSchedule: term?.order_schedule ?? undefined,
      deliverySchedule: term?.delivery_schedule ?? undefined,
    });
  }

  async save(
    organizationId: EntityId,
    supplierId: EntityId,
    input: SupplierCommercialTermsDraft,
  ): Promise<SupplierCommercialTerms> {
    const normalized = normalizeSupplierCommercialTermsDraft(input);
    const current = await this.load(organizationId, supplierId);

    const { error: supplierError } = await this.client
      .from("suppliers")
      .update({ notes: normalized.notes ?? null })
      .eq("organization_id", organizationId)
      .eq("id", supplierId);

    if (supplierError) {
      throw gatewayError("Não foi possível salvar as observações do fornecedor.");
    }

    const termPayload = {
      minimum_order_value: normalized.minimumOrderValue?.toDecimal() ?? null,
      payment_terms: normalized.paymentTerms ?? null,
      order_schedule: normalized.orderSchedule ?? null,
      delivery_schedule: normalized.deliverySchedule ?? null,
    };

    if (current.termId) {
      const { error } = await this.client
        .from("supplier_terms")
        .update(termPayload)
        .eq("organization_id", organizationId)
        .eq("supplier_id", supplierId)
        .eq("id", current.termId);

      if (error) {
        throw gatewayError("Não foi possível salvar as condições comerciais do fornecedor.");
      }
    } else if (hasSupplierTermValues(normalized)) {
      const { error } = await this.client.from("supplier_terms").insert({
        id: newEntityId(),
        organization_id: organizationId,
        supplier_id: supplierId,
        ...termPayload,
      });

      if (error) {
        throw gatewayError("Não foi possível criar as condições comerciais do fornecedor.");
      }
    }

    return this.load(organizationId, supplierId);
  }
}
