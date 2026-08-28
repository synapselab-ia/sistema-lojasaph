"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { PaymentEventType } from "@/modules/finance/adapters/supabase-finance-gateway";
import { dateTimeLabel, moneyLabel } from "@/modules/finance/ui/finance-view-model";
import { useFinanceState } from "@/modules/finance/ui/use-finance-state";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function FinancePaymentsPage() {
  const workspace = useRuntimeWorkspace();
  const { state, loading, error } = useFinanceState(workspace.organizationId);
  const [eventType, setEventType] = useState<PaymentEventType | "all">("all");
  const [search, setSearch] = useState("");

  const installmentById = useMemo(() => new Map(state.installments.map((installment) => [installment.id, installment])), [state.installments]);
  const documentById = useMemo(() => new Map(state.documents.map((document) => [document.id, document])), [state.documents]);
  const supplierById = useMemo(() => new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier.tradeName])), [workspace.suppliers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return state.payments.filter((payment) => {
      if (eventType !== "all" && payment.eventType !== eventType) return false;
      if (!query) return true;
      const installment = installmentById.get(payment.installmentId);
      const document = installment ? documentById.get(installment.payableDocumentId) : undefined;
      const searchable = [
        document ? supplierById.get(document.supplierId) : undefined,
        document?.documentNumber,
        document?.documentType,
        payment.paymentReference,
        payment.notes,
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return searchable.includes(query);
    });
  }, [documentById, eventType, installmentById, search, state.payments, supplierById]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Financeiro"
        title="Pagamentos"
        description="Consulte pagamentos e estornos como eventos separados. O histórico não apaga o evento original quando um pagamento é estornado."
      />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}

      <Panel as="section">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <FormField id="payment-search" label="Buscar" hint="Fornecedor, documento, referência ou observação.">
            {(field) => <Input {...field} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: fornecedor, referência..." />}
          </FormField>
          <FormField id="payment-event-type" label="Evento">
            {(field) => (
              <Select {...field} value={eventType} onChange={(event) => setEventType(event.target.value as PaymentEventType | "all")}>
                <option value="all">Todos</option>
                <option value="payment">Pagamentos</option>
                <option value="reversal">Estornos</option>
              </Select>
            )}
          </FormField>
        </div>
      </Panel>

      {loading && state.payments.length === 0 ? (
        <Panel><p className="text-sm text-neutral-500">Carregando pagamentos...</p></Panel>
      ) : filtered.length === 0 ? (
        <EmptyState title={state.payments.length === 0 ? "Nenhum pagamento registrado" : "Nenhum evento encontrado"} description={state.payments.length === 0 ? "Pagamentos e estornos disponíveis no seu escopo aparecerão aqui." : "Ajuste a busca ou o filtro de evento."} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Evento</th><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Fornecedor / documento</th><th className="px-4 py-3 font-medium">Parcela</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Referência / observação</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((payment) => {
                  const installment = installmentById.get(payment.installmentId);
                  const document = installment ? documentById.get(installment.payableDocumentId) : undefined;
                  return (
                    <tr key={payment.id}>
                      <td className="px-4 py-3"><StatusBadge tone={payment.eventType === "payment" ? "success" : "neutral"}>{payment.eventType === "payment" ? "Pagamento" : "Estorno"}</StatusBadge></td>
                      <td className="px-4 py-3">{dateTimeLabel(payment.paidAt)}</td>
                      <td className="px-4 py-3">
                        {installment ? <Link href={`/workspace/financeiro/contas/${installment.payableDocumentId}`} className="font-semibold underline-offset-4 hover:underline">{document ? supplierById.get(document.supplierId) ?? "Fornecedor indisponível" : "Documento financeiro"}</Link> : <span className="font-semibold">Documento indisponível</span>}
                        <p className="mt-1 text-xs text-neutral-500">{document?.documentNumber ? `Documento ${document.documentNumber}` : document?.documentType ?? "Abra para consultar"}</p>
                      </td>
                      <td className="px-4 py-3">{installment ? `${installment.installmentNumber}/${installment.installmentCount}` : "—"}</td>
                      <td className="px-4 py-3 font-medium">{moneyLabel(payment.amount)}</td>
                      <td className="max-w-sm px-4 py-3 text-neutral-600">{payment.paymentReference ?? payment.notes ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((payment) => {
              const installment = installmentById.get(payment.installmentId);
              const document = installment ? documentById.get(installment.payableDocumentId) : undefined;
              const content = (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><StatusBadge tone={payment.eventType === "payment" ? "success" : "neutral"}>{payment.eventType === "payment" ? "Pagamento" : "Estorno"}</StatusBadge><p className="mt-2 font-semibold">{document ? supplierById.get(document.supplierId) ?? "Fornecedor indisponível" : "Documento financeiro"}</p><p className="mt-1 text-xs text-neutral-500">{dateTimeLabel(payment.paidAt)}{installment ? ` · parcela ${installment.installmentNumber}/${installment.installmentCount}` : ""}</p></div><p className="font-semibold">{moneyLabel(payment.amount)}</p></div>
                  {(payment.paymentReference || payment.notes) && <p className="mt-3 break-words text-sm text-neutral-600">{payment.paymentReference ?? payment.notes}</p>}
                </div>
              );
              return installment ? <Link key={payment.id} href={`/workspace/financeiro/contas/${installment.payableDocumentId}`}>{content}</Link> : <div key={payment.id}>{content}</div>;
            })}
          </div>
        </>
      )}
    </div>
  );
}
