import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import {
  InstallmentPaymentStatus,
  PayableLifecycleStatus,
  PaymentEventType,
  RuntimeInstallmentSummary,
  RuntimePayableDocument,
  RuntimePaymentEvent,
  RuntimePaymentInstruction,
} from "./supabase-finance-gateway";

export type FinanceDocumentDetail = {
  readonly document: RuntimePayableDocument;
  readonly unitName?: string;
  readonly sectorName?: string;
  readonly installments: readonly RuntimeInstallmentSummary[];
  readonly instructions: readonly RuntimePaymentInstruction[];
  readonly payments: readonly RuntimePaymentEvent[];
};

type DocumentRow = {
  id: string;
  unit_id: string;
  sector_id: string | null;
  supplier_id: string;
  document_type: string;
  document_number: string | null;
  series: string | null;
  access_key: string | null;
  issued_at: string | null;
  description: string | null;
  total_amount: number | string;
  lifecycle_status: PayableLifecycleStatus;
  created_at: string;
};

type SummaryRow = {
  installment_id: string;
  payable_document_id: string;
  installment_number: number;
  installment_count: number;
  nominal_amount: number | string;
  due_date: string;
  net_paid_amount: number | string;
  balance_amount: number | string;
  payment_status: InstallmentPaymentStatus;
};

type InstructionRow = {
  id: string;
  installment_id: string;
  raw_reference: string;
  label: string | null;
};

type PaymentRow = {
  id: string;
  installment_id: string;
  event_type: PaymentEventType;
  amount: number | string;
  paid_at: string;
  payment_reference: string | null;
  notes: string | null;
  reverses_payment_id: string | null;
};

export class SupabaseFinanceDetailGateway {
  constructor(private readonly client: SupabaseClient) {}

  async getDocument(organizationId: EntityId, payableDocumentId: EntityId): Promise<FinanceDocumentDetail | null> {
    const documentResult = await this.client
      .from("payable_documents")
      .select("id, unit_id, sector_id, supplier_id, document_type, document_number, series, access_key, issued_at, description, total_amount, lifecycle_status, created_at")
      .eq("organization_id", organizationId)
      .eq("id", payableDocumentId)
      .maybeSingle();

    if (documentResult.error) throw new Error("Não foi possível carregar o documento financeiro.");
    if (!documentResult.data) return null;

    const documentRow = documentResult.data as DocumentRow;
    const installmentsResult = await this.client
      .from("payable_installment_summary")
      .select("installment_id, payable_document_id, installment_number, installment_count, nominal_amount, due_date, net_paid_amount, balance_amount, payment_status")
      .eq("organization_id", organizationId)
      .eq("payable_document_id", payableDocumentId)
      .order("installment_number", { ascending: true });

    if (installmentsResult.error) throw new Error("Não foi possível carregar as parcelas deste documento.");

    const installmentRows = (installmentsResult.data ?? []) as SummaryRow[];
    const installmentIds = installmentRows.map((row) => row.installment_id);

    const [unitResult, sectorResult, instructionsResult, paymentsResult] = await Promise.all([
      this.client.from("units").select("name").eq("organization_id", organizationId).eq("id", documentRow.unit_id).maybeSingle(),
      documentRow.sector_id
        ? this.client.from("sectors").select("name").eq("organization_id", organizationId).eq("id", documentRow.sector_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      installmentIds.length > 0
        ? this.client
            .from("payment_instructions")
            .select("id, installment_id, raw_reference, label")
            .eq("organization_id", organizationId)
            .in("installment_id", installmentIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      installmentIds.length > 0
        ? this.client
            .from("payments")
            .select("id, installment_id, event_type, amount, paid_at, payment_reference, notes, reverses_payment_id")
            .eq("organization_id", organizationId)
            .in("installment_id", installmentIds)
            .order("paid_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (unitResult.error) throw new Error("Não foi possível carregar a unidade deste documento.");
    if (sectorResult.error) throw new Error("Não foi possível carregar o setor deste documento.");
    if (instructionsResult.error) throw new Error("Não foi possível carregar as referências de pagamento.");
    if (paymentsResult.error) throw new Error("Não foi possível carregar o histórico de pagamentos.");

    const document: RuntimePayableDocument = Object.freeze({
      id: documentRow.id as EntityId,
      unitId: documentRow.unit_id as EntityId,
      sectorId: documentRow.sector_id ? documentRow.sector_id as EntityId : undefined,
      supplierId: documentRow.supplier_id as EntityId,
      documentType: documentRow.document_type,
      documentNumber: documentRow.document_number ?? undefined,
      series: documentRow.series ?? undefined,
      accessKey: documentRow.access_key ?? undefined,
      issuedAt: documentRow.issued_at ?? undefined,
      description: documentRow.description ?? undefined,
      totalAmount: Money.fromDecimal(String(documentRow.total_amount)),
      lifecycleStatus: documentRow.lifecycle_status,
      createdAt: documentRow.created_at,
    });

    const installments = Object.freeze(installmentRows.map((row) => Object.freeze({
      id: row.installment_id as EntityId,
      payableDocumentId: row.payable_document_id as EntityId,
      installmentNumber: row.installment_number,
      installmentCount: row.installment_count,
      nominalAmount: Money.fromDecimal(String(row.nominal_amount)),
      dueDate: row.due_date,
      netPaidAmount: Money.fromDecimal(String(row.net_paid_amount)),
      balanceAmount: Money.fromDecimal(String(row.balance_amount)),
      paymentStatus: row.payment_status,
    })));

    const instructions = Object.freeze(((instructionsResult.data ?? []) as InstructionRow[]).map((row) => Object.freeze({
      id: row.id as EntityId,
      installmentId: row.installment_id as EntityId,
      rawReference: row.raw_reference,
      label: row.label ?? undefined,
    })));

    const payments = Object.freeze(((paymentsResult.data ?? []) as PaymentRow[]).map((row) => Object.freeze({
      id: row.id as EntityId,
      installmentId: row.installment_id as EntityId,
      eventType: row.event_type,
      amount: Money.fromDecimal(String(row.amount)),
      paidAt: row.paid_at,
      paymentReference: row.payment_reference ?? undefined,
      notes: row.notes ?? undefined,
      reversesPaymentId: row.reverses_payment_id ? row.reverses_payment_id as EntityId : undefined,
    })));

    return Object.freeze({
      document,
      unitName: (unitResult.data as { name: string } | null)?.name,
      sectorName: (sectorResult.data as { name: string } | null)?.name,
      installments,
      instructions,
      payments,
    });
  }
}
