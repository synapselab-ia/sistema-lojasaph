"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Money } from "@/domain/common/money";
import { EmptyState, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { PayablesCsvExportButton } from "@/modules/finance/ui/payables-csv-export-button";
import { dateLabel, installmentStatusLabel, moneyLabel } from "@/modules/finance/ui/finance-view-model";
import { useFinanceState } from "@/modules/finance/ui/use-finance-state";

const shortcutClass = "block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow";

export default function RuntimeFinancePage() {
  const workspace = useRuntimeWorkspace();
  const { state, loading, error } = useFinanceState(workspace.organizationId);

  const supplierById = useMemo(
    () => new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier.tradeName])),
    [workspace.suppliers],
  );
  const documentById = useMemo(
    () => new Map(state.documents.map((document) => [document.id, document])),
    [state.documents],
  );

  const totalNominal = useMemo(
    () => state.installments.reduce((sum, installment) => sum.add(installment.nominalAmount), Money.zero()),
    [state.installments],
  );
  const totalPaid = useMemo(
    () => state.installments.reduce((sum, installment) => sum.add(installment.netPaidAmount), Money.zero()),
    [state.installments],
  );
  const totalOpen = useMemo(
    () => state.installments.reduce(
      (sum, installment) => sum.add(Money.fromCents(Math.max(installment.balanceAmount.cents, 0))),
      Money.zero(),
    ),
    [state.installments],
  );
  const attention = useMemo(
    () => state.installments
      .filter((installment) => installment.paymentStatus === "overdue" || installment.paymentStatus === "due_today")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6),
    [state.installments],
  );
  const overdueCount = state.installments.filter((installment) => installment.paymentStatus === "overdue").length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Financeiro"
        title="Visão financeira"
        description="Acompanhe vencimentos, saldos e pagamentos sem misturar consulta com registro de documentos. Status e saldos continuam derivados dos eventos financeiros persistidos."
        actions={workspace.permissions.manageFinance ? <PayablesCsvExportButton organizationId={workspace.organizationId} /> : undefined}
      />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores financeiros">
        <Panel><p className="text-sm text-neutral-500">Total nominal</p><p className="mt-2 text-2xl font-semibold">{moneyLabel(totalNominal)}</p></Panel>
        <Panel><p className="text-sm text-neutral-500">Pago líquido</p><p className="mt-2 text-2xl font-semibold">{moneyLabel(totalPaid)}</p></Panel>
        <Panel><p className="text-sm text-neutral-500">Saldo em aberto</p><p className="mt-2 text-2xl font-semibold">{moneyLabel(totalOpen)}</p></Panel>
        <Panel tone={overdueCount > 0 ? "attention" : "neutral"}><p className="text-sm text-neutral-500">Parcelas vencidas</p><p className="mt-2 text-2xl font-semibold">{overdueCount}</p></Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Jornadas do Financeiro">
        <Link href="/workspace/financeiro/contas" className={shortcutClass}>
          <h2 className="font-semibold">Contas a pagar</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Consulte documentos, parcelas e saldos e abra o contexto completo de cada obrigação.</p>
        </Link>
        <Link href="/workspace/financeiro/vencimentos" className={shortcutClass}>
          <h2 className="font-semibold">Vencimentos</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Veja parcelas vencidas, vencendo hoje, a vencer e já pagas conforme o status derivado.</p>
        </Link>
        <Link href="/workspace/financeiro/pagamentos" className={shortcutClass}>
          <h2 className="font-semibold">Pagamentos</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Consulte pagamentos e estornos preservados como eventos auditáveis.</p>
        </Link>
      </section>

      <Panel as="section">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Precisa de atenção</h2>
            <p className="mt-1 text-sm text-neutral-500">Parcelas vencidas ou com vencimento hoje no seu escopo atual.</p>
          </div>
          <Link href="/workspace/financeiro/vencimentos" className="text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline">Ver vencimentos</Link>
        </div>

        {loading && state.installments.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-500">Carregando vencimentos...</p>
        ) : attention.length === 0 ? (
          <div className="mt-5"><EmptyState title="Nenhuma parcela exige atenção agora" description="Não há parcelas vencidas nem vencendo hoje entre os registros que você pode consultar." /></div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {attention.map((installment) => {
              const document = documentById.get(installment.payableDocumentId);
              const supplierName = document ? supplierById.get(document.supplierId) : undefined;
              return (
                <Link key={installment.id} href={`/workspace/financeiro/contas/${installment.payableDocumentId}`} className="rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{supplierName ?? "Fornecedor indisponível"}</p>
                    <StatusBadge tone={installment.paymentStatus === "overdue" ? "danger" : "attention"}>{installmentStatusLabel[installment.paymentStatus]}</StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">Parcela {installment.installmentNumber}/{installment.installmentCount} · vencimento {dateLabel(installment.dueDate)}</p>
                  <p className="mt-1 text-sm">Saldo/diferença: <strong>{moneyLabel(installment.balanceAmount)}</strong></p>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
