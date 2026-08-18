import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";

export type PayableLifecycleStatus = "active" | "cancelled";
export type InstallmentPaymentStatus = "cancelled" | "paid" | "overdue" | "due_today" | "upcoming";
export type PaymentEventType = "payment" | "reversal";

export interface FinanceUnit {
  readonly id: EntityId;
  readonly name: string;
}

export interface FinanceSector {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly name: string;
}

export interface RuntimePayableDocument {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly sectorId?: EntityId;
  readonly supplierId: EntityId;
  readonly documentType: string;
  readonly documentNumber?: string;
  readonly series?: string;
  readonly accessKey?: string;
  readonly issuedAt?: string;
  readonly description?: string;
  readonly totalAmount: Money;
  readonly lifecycleStatus: PayableLifecycleStatus;
  readonly createdAt: string;
}

export interface RuntimeInstallmentSummary {
  readonly id: EntityId;
  readonly payableDocumentId: EntityId;
  readonly installmentNumber: number;
  readonly installmentCount: number;
  readonly nominalAmount: Money;
  readonly dueDate: string;
  readonly netPaidAmount: Money;
  readonly balanceAmount: Money;
  readonly paymentStatus: InstallmentPaymentStatus;
}

export interface RuntimePaymentInstruction {
  readonly id: EntityId;
  readonly installmentId: EntityId;
  readonly rawReference: string;
  readonly label?: string;
}

export interface RuntimePaymentEvent {
  readonly id: EntityId;
  readonly installmentId: EntityId;
  readonly eventType: PaymentEventType;
  readonly amount: Money;
  readonly paidAt: string;
  readonly paymentReference?: string;
  readonly notes?: string;
  readonly reversesPaymentId?: EntityId;
}

export interface FinanceState {
  readonly units: readonly FinanceUnit[];
  readonly sectors: readonly FinanceSector[];
  readonly documents: readonly RuntimePayableDocument[];
  readonly installments: readonly RuntimeInstallmentSummary[];
  readonly instructions: readonly RuntimePaymentInstruction[];
  readonly payments: readonly RuntimePaymentEvent[];
}

interface UnitRow { id: string; name: string }
interface SectorRow { id: string; unit_id: string; name: string }
interface DocumentRow {
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
}
interface SummaryRow {
  installment_id: string;
  payable_document_id: string;
  installment_number: number;
  installment_count: number;
  nominal_amount: number | string;
  due_date: string;
  net_paid_amount: number | string;
  balance_amount: number | string;
  payment_status: InstallmentPaymentStatus;
}
interface InstructionRow {
  id: string;
  installment_id: string;
  raw_reference: string;
  label: string | null;
}
interface PaymentRow {
  id: string;
  installment_id: string;
  event_type: PaymentEventType;
  amount: number | string;
  paid_at: string;
  payment_reference: string | null;
  notes: string | null;
  reverses_payment_id: string | null;
}

function financeError(scope: string, message: string): DomainError {
  const known: Record<string, string> = {
    DOCUMENT_TYPE_REQUIRED: "Informe o tipo do documento financeiro.",
    INSTALLMENTS_REQUIRED: "Adicione pelo menos uma parcela.",
    INVALID_INSTALLMENT_NUMBER: "A numeração das parcelas é inválida.",
    INVALID_INSTALLMENT_COUNT: "A quantidade total de parcelas é inválida.",
    INCONSISTENT_INSTALLMENT_COUNT: "Todas as parcelas devem informar o mesmo total de parcelas.",
    INSTALLMENT_SET_INCOMPLETE: "O conjunto de parcelas está incompleto.",
    DUPLICATE_INSTALLMENT_NUMBER: "A mesma parcela não pode aparecer duas vezes.",
    INVALID_INSTALLMENT_AMOUNT: "O valor da parcela deve ser válido e usar no máximo duas casas decimais.",
    INSTALLMENT_DUE_DATE_REQUIRED: "Informe o vencimento de todas as parcelas.",
    UNIT_NOT_AVAILABLE: "A unidade selecionada está indisponível.",
    SECTOR_NOT_AVAILABLE: "O setor não pertence à unidade selecionada ou está indisponível.",
    SUPPLIER_NOT_AVAILABLE: "O fornecedor selecionado está indisponível.",
    INVALID_PAYMENT_AMOUNT: "O valor do pagamento deve ser maior que zero e usar no máximo duas casas decimais.",
    PAYMENT_DATE_REQUIRED: "Informe a data do pagamento.",
    INSTALLMENT_NOT_FOUND: "A parcela não foi encontrada.",
    PAYABLE_DOCUMENT_NOT_ACTIVE: "O documento financeiro não está ativo para esta operação.",
    PAYMENT_NOT_FOUND: "O pagamento não foi encontrado.",
    PAYMENT_NOT_REVERSIBLE: "Somente um evento de pagamento pode ser estornado.",
    PAYMENT_ALREADY_REVERSED: "Este pagamento já foi estornado.",
    REVERSAL_DATE_REQUIRED: "Informe a data do estorno.",
    PAYABLE_DOCUMENT_NOT_FOUND: "O documento financeiro não foi encontrado.",
    PAYABLE_DOCUMENT_ALREADY_CANCELLED: "O documento financeiro já foi cancelado.",
    PAYABLE_DOCUMENT_HAS_NET_PAYMENTS: "Estorne os pagamentos líquidos antes de cancelar o documento.",
    INSUFFICIENT_ROLE: "Seu perfil não possui permissão para esta operação financeira.",
    IDEMPOTENCY_KEY_CONFLICT: "A operação foi repetida com dados diferentes. Atualize a tela antes de tentar novamente.",
  };
  const code = Object.keys(known).find((candidate) => message.includes(candidate));
  return new DomainError(code ?? "SUPABASE_PERSISTENCE_ERROR", code ? known[code] : `${scope}: ${message}`);
}

export class SupabaseFinanceGateway {
  constructor(private readonly client: SupabaseClient) {}

  async listState(organizationId: EntityId): Promise<FinanceState> {
    const [unitsResult, sectorsResult, documentsResult, summariesResult, instructionsResult, paymentsResult] = await Promise.all([
      this.client.from("units").select("id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
      this.client.from("sectors").select("id, unit_id, name").eq("organization_id", organizationId).eq("status", "active").order("name"),
      this.client
        .from("payable_documents")
        .select("id, unit_id, sector_id, supplier_id, document_type, document_number, series, access_key, issued_at, description, total_amount, lifecycle_status, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100),
      this.client
        .from("payable_installment_summary")
        .select("installment_id, payable_document_id, installment_number, installment_count, nominal_amount, due_date, net_paid_amount, balance_amount, payment_status")
        .eq("organization_id", organizationId)
        .order("due_date", { ascending: true }),
      this.client
        .from("payment_instructions")
        .select("id, installment_id, raw_reference, label")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true }),
      this.client
        .from("payments")
        .select("id, installment_id, event_type, amount, paid_at, payment_reference, notes, reverses_payment_id")
        .eq("organization_id", organizationId)
        .order("paid_at", { ascending: false }),
    ]);

    if (unitsResult.error) throw financeError("Não foi possível carregar as unidades", unitsResult.error.message);
    if (sectorsResult.error) throw financeError("Não foi possível carregar os setores", sectorsResult.error.message);
    if (documentsResult.error) throw financeError("Não foi possível carregar os documentos", documentsResult.error.message);
    if (summariesResult.error) throw financeError("Não foi possível carregar as parcelas", summariesResult.error.message);
    if (instructionsResult.error) throw financeError("Não foi possível carregar as instruções de pagamento", instructionsResult.error.message);
    if (paymentsResult.error) throw financeError("Não foi possível carregar os pagamentos", paymentsResult.error.message);

    return Object.freeze({
      units: Object.freeze(((unitsResult.data ?? []) as UnitRow[]).map((row) => Object.freeze({
        id: row.id as EntityId,
        name: row.name,
      }))),
      sectors: Object.freeze(((sectorsResult.data ?? []) as SectorRow[]).map((row) => Object.freeze({
        id: row.id as EntityId,
        unitId: row.unit_id as EntityId,
        name: row.name,
      }))),
      documents: Object.freeze(((documentsResult.data ?? []) as DocumentRow[]).map((row) => Object.freeze({
        id: row.id as EntityId,
        unitId: row.unit_id as EntityId,
        sectorId: row.sector_id ? row.sector_id as EntityId : undefined,
        supplierId: row.supplier_id as EntityId,
        documentType: row.document_type,
        documentNumber: row.document_number ?? undefined,
        series: row.series ?? undefined,
        accessKey: row.access_key ?? undefined,
        issuedAt: row.issued_at ?? undefined,
        description: row.description ?? undefined,
        totalAmount: Money.fromDecimal(String(row.total_amount)),
        lifecycleStatus: row.lifecycle_status,
        createdAt: row.created_at,
      }))),
      installments: Object.freeze(((summariesResult.data ?? []) as SummaryRow[]).map((row) => Object.freeze({
        id: row.installment_id as EntityId,
        payableDocumentId: row.payable_document_id as EntityId,
        installmentNumber: row.installment_number,
        installmentCount: row.installment_count,
        nominalAmount: Money.fromDecimal(String(row.nominal_amount)),
        dueDate: row.due_date,
        netPaidAmount: Money.fromDecimal(String(row.net_paid_amount)),
        balanceAmount: Money.fromDecimal(String(row.balance_amount)),
        paymentStatus: row.payment_status,
      }))),
      instructions: Object.freeze(((instructionsResult.data ?? []) as InstructionRow[]).map((row) => Object.freeze({
        id: row.id as EntityId,
        installmentId: row.installment_id as EntityId,
        rawReference: row.raw_reference,
        label: row.label ?? undefined,
      }))),
      payments: Object.freeze(((paymentsResult.data ?? []) as PaymentRow[]).map((row) => Object.freeze({
        id: row.id as EntityId,
        installmentId: row.installment_id as EntityId,
        eventType: row.event_type,
        amount: Money.fromDecimal(String(row.amount)),
        paidAt: row.paid_at,
        paymentReference: row.payment_reference ?? undefined,
        notes: row.notes ?? undefined,
        reversesPaymentId: row.reverses_payment_id ? row.reverses_payment_id as EntityId : undefined,
      }))),
    });
  }

  async createDocument(input: {
    organizationId: EntityId;
    unitId: EntityId;
    sectorId?: EntityId;
    supplierId: EntityId;
    documentType: string;
    documentNumber?: string;
    series?: string;
    accessKey?: string;
    issuedAt?: string;
    description?: string;
    installments: readonly {
      amount: string;
      dueDate: string;
      paymentReference?: string;
      paymentLabel?: string;
    }[];
  }): Promise<EntityId> {
    const commandId = newEntityId();
    const count = input.installments.length;
    const installments = input.installments.map((installment, index) => ({
      number: index + 1,
      count,
      amount: Money.fromDecimal(installment.amount).toDecimal(),
      due_date: installment.dueDate,
      payment_reference: installment.paymentReference?.trim() || null,
      payment_label: installment.paymentLabel?.trim() || null,
    }));

    const { data, error } = await this.client.rpc("create_payable_document", {
      p_command_id: commandId,
      p_organization_id: input.organizationId,
      p_unit_id: input.unitId,
      p_sector_id: input.sectorId ?? null,
      p_supplier_id: input.supplierId,
      p_document_type: input.documentType.trim(),
      p_document_number: input.documentNumber?.trim() || null,
      p_series: input.series?.trim() || null,
      p_access_key: input.accessKey?.trim() || null,
      p_issued_at: input.issuedAt?.trim() || null,
      p_description: input.description?.trim() || null,
      p_installments: installments,
    });
    if (error) throw financeError("Não foi possível criar o documento financeiro", error.message);
    const row = (data as { payable_document_id: string }[] | null)?.[0];
    if (!row) throw new DomainError("SUPABASE_PERSISTENCE_ERROR", "O comando não retornou o documento criado.");
    return row.payable_document_id as EntityId;
  }

  async recordPayment(input: {
    organizationId: EntityId;
    installmentId: EntityId;
    amount: string;
    paidAt: string;
    paymentReference?: string;
    notes?: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("record_installment_payment", {
      p_command_id: newEntityId(),
      p_organization_id: input.organizationId,
      p_installment_id: input.installmentId,
      p_amount: Money.fromDecimal(input.amount).toDecimal(),
      p_paid_at: input.paidAt,
      p_payment_reference: input.paymentReference?.trim() || null,
      p_notes: input.notes?.trim() || null,
    });
    if (error) throw financeError("Não foi possível registrar o pagamento", error.message);
  }

  async reversePayment(input: {
    organizationId: EntityId;
    paymentId: EntityId;
    reversedAt: string;
    reason?: string;
  }): Promise<void> {
    const { error } = await this.client.rpc("reverse_installment_payment", {
      p_command_id: newEntityId(),
      p_organization_id: input.organizationId,
      p_payment_id: input.paymentId,
      p_reversed_at: input.reversedAt,
      p_reason: input.reason?.trim() || null,
    });
    if (error) throw financeError("Não foi possível estornar o pagamento", error.message);
  }

  async cancelDocument(organizationId: EntityId, payableDocumentId: EntityId, reason?: string): Promise<void> {
    const { error } = await this.client.rpc("cancel_payable_document", {
      p_command_id: newEntityId(),
      p_organization_id: organizationId,
      p_payable_document_id: payableDocumentId,
      p_reason: reason?.trim() || null,
    });
    if (error) throw financeError("Não foi possível cancelar o documento financeiro", error.message);
  }
}
