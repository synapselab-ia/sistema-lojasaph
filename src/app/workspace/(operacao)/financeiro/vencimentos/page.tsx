"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, FormField, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { InstallmentPaymentStatus } from "@/modules/finance/adapters/supabase-finance-gateway";
import { dateLabel, installmentStatusLabel, moneyLabel } from "@/modules/finance/ui/finance-view-model";
import { useFinanceState } from "@/modules/finance/ui/use-finance-state";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function statusTone(status: InstallmentPaymentStatus) {
  if (status === "overdue") return "danger" as const;
  if (status === "due_today") return "attention" as const;
  if (status === "paid") return "success" as const;
  return "neutral" as const;
}

export default function FinanceDueDatesPage() {
  const workspace = useRuntimeWorkspace();
  const { state, loading, error } = useFinanceState(workspace.organizationId);
  const [status, setStatus] = useState<InstallmentPaymentStatus | "all">("all");

  const documentById = useMemo(() => new Map(state.documents.map((document) => [document.id, document])), [state.documents]);
  const supplierById = useMemo(() => new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier.tradeName])), [workspace.suppliers]);
  const unitById = useMemo(() => new Map(state.units.map((unit) => [unit.id, unit.name])), [state.units]);
  const filtered = useMemo(
    () => state.installments.filter((installment) => status === "all" || installment.paymentStatus === status),
    [state.installments, status],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Financeiro"
        title="Vencimentos"
        description="Consulte as parcelas pela situação derivada de vencimento e pagamentos. Nenhuma janela futura adicional é presumida nesta visão."
      />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}

      <Panel as="section">
        <div className="max-w-sm">
          <FormField id="due-status" label="Situação da parcela">
            {(field) => (
              <Select {...field} value={status} onChange={(event) => setStatus(event.target.value as InstallmentPaymentStatus | "all")}>
                <option value="all">Todas</option>
                <option value="overdue">Vencidas</option>
                <option value="due_today">Vence hoje</option>
                <option value="upcoming">A vencer</option>
                <option value="paid">Pagas</option>
                <option value="cancelled">Canceladas</option>
              </Select>
            )}
          </FormField>
        </div>
      </Panel>

      {loading && state.installments.length === 0 ? (
        <Panel><p className="text-sm text-neutral-500">Carregando vencimentos...</p></Panel>
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhuma parcela nesta situação" description="Altere o filtro para consultar outros vencimentos disponíveis no seu escopo." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Vencimento</th><th className="px-4 py-3 font-medium">Fornecedor / documento</th><th className="px-4 py-3 font-medium">Parcela</th><th className="px-4 py-3 font-medium">Nominal</th><th className="px-4 py-3 font-medium">Pago líquido</th><th className="px-4 py-3 font-medium">Saldo/diferença</th><th className="px-4 py-3 font-medium">Situação</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((installment) => {
                  const document = documentById.get(installment.payableDocumentId);
                  return (
                    <tr key={installment.id}>
                      <td className="px-4 py-3 font-medium">{dateLabel(installment.dueDate)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/workspace/financeiro/contas/${installment.payableDocumentId}`} className="font-semibold underline-offset-4 hover:underline">{document ? supplierById.get(document.supplierId) ?? "Fornecedor indisponível" : "Documento financeiro"}</Link>
                        <p className="mt-1 text-xs text-neutral-500">{document?.documentNumber ? `Documento ${document.documentNumber}` : document?.documentType ?? "Abra para consultar"}{document ? ` · ${unitById.get(document.unitId) ?? "Unidade indisponível"}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">{installment.installmentNumber}/{installment.installmentCount}</td>
                      <td className="px-4 py-3">{moneyLabel(installment.nominalAmount)}</td>
                      <td className="px-4 py-3">{moneyLabel(installment.netPaidAmount)}</td>
                      <td className="px-4 py-3">{moneyLabel(installment.balanceAmount)}</td>
                      <td className="px-4 py-3"><StatusBadge tone={statusTone(installment.paymentStatus)}>{installmentStatusLabel[installment.paymentStatus]}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((installment) => {
              const document = documentById.get(installment.payableDocumentId);
              return (
                <Link key={installment.id} href={`/workspace/financeiro/contas/${installment.payableDocumentId}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold">{document ? supplierById.get(document.supplierId) ?? "Fornecedor indisponível" : "Documento financeiro"}</p><p className="mt-1 text-xs text-neutral-500">Parcela {installment.installmentNumber}/{installment.installmentCount} · {dateLabel(installment.dueDate)}</p></div>
                    <StatusBadge tone={statusTone(installment.paymentStatus)}>{installmentStatusLabel[installment.paymentStatus]}</StatusBadge>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Nominal</dt><dd className="mt-1 font-medium">{moneyLabel(installment.nominalAmount)}</dd></div><div><dt className="text-xs text-neutral-500">Pago</dt><dd className="mt-1 font-medium">{moneyLabel(installment.netPaidAmount)}</dd></div><div><dt className="text-xs text-neutral-500">Saldo</dt><dd className="mt-1 font-medium">{moneyLabel(installment.balanceAmount)}</dd></div></dl>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
