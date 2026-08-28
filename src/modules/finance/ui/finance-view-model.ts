import { Money } from "@/domain/common/money";
import {
  InstallmentPaymentStatus,
  RuntimeInstallmentSummary,
  RuntimePayableDocument,
} from "@/modules/finance/adapters/supabase-finance-gateway";

export type FinanceDocumentSituation = "cancelled" | "overdue" | "due_today" | "paid" | "open";

export type FinanceDocumentSummary = {
  readonly nominalAmount: Money;
  readonly netPaidAmount: Money;
  readonly balanceAmount: Money;
  readonly nextDueDate?: string;
  readonly situation: FinanceDocumentSituation;
};

export const installmentStatusLabel: Record<InstallmentPaymentStatus, string> = {
  cancelled: "Cancelada",
  paid: "Paga",
  overdue: "Vencida",
  due_today: "Vence hoje",
  upcoming: "A vencer",
};

export const documentSituationLabel: Record<FinanceDocumentSituation, string> = {
  cancelled: "Cancelado",
  overdue: "Com vencimento em atraso",
  due_today: "Vence hoje",
  paid: "Pago",
  open: "Em aberto",
};

export function moneyLabel(value: Money): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value.toDecimal()));
}

export function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

export function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function installmentsForDocument(
  installments: readonly RuntimeInstallmentSummary[],
  documentId: string,
): RuntimeInstallmentSummary[] {
  return installments
    .filter((installment) => installment.payableDocumentId === documentId)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);
}

export function summarizeDocument(
  document: RuntimePayableDocument,
  installments: readonly RuntimeInstallmentSummary[],
): FinanceDocumentSummary {
  const related = installmentsForDocument(installments, document.id);
  const nominalAmount = related.reduce((sum, installment) => sum.add(installment.nominalAmount), Money.zero());
  const netPaidAmount = related.reduce((sum, installment) => sum.add(installment.netPaidAmount), Money.zero());
  const balanceAmount = related.reduce((sum, installment) => sum.add(installment.balanceAmount), Money.zero());
  const openInstallments = related.filter((installment) => installment.paymentStatus !== "paid" && installment.paymentStatus !== "cancelled");
  const nextDueDate = [...openInstallments].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate;

  let situation: FinanceDocumentSituation = "open";
  if (document.lifecycleStatus === "cancelled") situation = "cancelled";
  else if (related.some((installment) => installment.paymentStatus === "overdue")) situation = "overdue";
  else if (related.some((installment) => installment.paymentStatus === "due_today")) situation = "due_today";
  else if (related.length > 0 && related.every((installment) => installment.paymentStatus === "paid")) situation = "paid";

  return Object.freeze({ nominalAmount, netPaidAmount, balanceAmount, nextDueDate, situation });
}

export function filterFinanceDocuments(
  documents: readonly RuntimePayableDocument[],
  installments: readonly RuntimeInstallmentSummary[],
  search: string,
  situation: FinanceDocumentSituation | "all",
  labels: ReadonlyMap<string, string>,
): RuntimePayableDocument[] {
  const query = search.trim().toLocaleLowerCase("pt-BR");

  return documents.filter((document) => {
    const summary = summarizeDocument(document, installments);
    if (situation !== "all" && summary.situation !== situation) return false;
    if (!query) return true;

    const searchable = [
      labels.get(document.supplierId),
      labels.get(document.unitId),
      document.documentType,
      document.documentNumber,
      document.series,
      document.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return searchable.includes(query);
  });
}
