"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { SemanticTone } from "@/components/ui";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import {
  documentSituationLabel,
  filterFinanceDocuments,
  FinanceDocumentSituation,
  moneyLabel,
  summarizeDocument,
  dateLabel,
} from "@/modules/finance/ui/finance-view-model";
import { useFinanceState } from "@/modules/finance/ui/use-finance-state";

function situationTone(situation: FinanceDocumentSituation): SemanticTone {
  if (situation === "overdue") return "danger";
  if (situation === "due_today") return "attention";
  if (situation === "paid") return "success";
  return "neutral";
}

export default function FinanceAccountsPage() {
  const workspace = useRuntimeWorkspace();
  const { state, loading, error } = useFinanceState(workspace.organizationId);
  const [search, setSearch] = useState("");
  const [situation, setSituation] = useState<FinanceDocumentSituation | "all">("all");

  const supplierById = useMemo(
    () => new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier.tradeName])),
    [workspace.suppliers],
  );
  const unitById = useMemo(() => new Map(state.units.map((unit) => [unit.id, unit.name])), [state.units]);
  const labels = useMemo(() => new Map([...supplierById, ...unitById]), [supplierById, unitById]);
  const filtered = useMemo(
    () => filterFinanceDocuments(state.documents, state.installments, search, situation, labels),
    [labels, search, situation, state.documents, state.installments],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Financeiro"
        title="Contas a pagar"
        description="Consulte documentos e obrigações no seu escopo. Abra um documento para ver parcelas, anexos, pagamentos e ações financeiras no contexto correto."
        actions={workspace.permissions.manageFinance ? (
          <Link href="/workspace/financeiro/contas/nova" className="inline-flex min-h-11 items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Novo documento</Link>
        ) : undefined}
      />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}

      <Panel as="section">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <FormField label="Buscar" htmlFor="finance-search" help="Fornecedor, unidade, número, tipo, série ou observação.">
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: fornecedor, NF-123..." />}
          </FormField>
          <FormField label="Situação" htmlFor="finance-situation">
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} value={situation} onChange={(event) => setSituation(event.target.value as FinanceDocumentSituation | "all")}>
                <option value="all">Todas</option>
                <option value="overdue">Com vencimento em atraso</option>
                <option value="due_today">Vence hoje</option>
                <option value="open">Em aberto</option>
                <option value="paid">Pago</option>
                <option value="cancelled">Cancelado</option>
              </Select>
            )}
          </FormField>
        </div>
      </Panel>

      {loading && state.documents.length === 0 ? (
        <Panel><p className="text-sm text-neutral-500">Carregando contas...</p></Panel>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={state.documents.length === 0 ? "Nenhum documento financeiro registrado" : "Nenhuma conta encontrada"}
          description={state.documents.length === 0 ? "Os documentos financeiros disponíveis no seu escopo aparecerão aqui." : "Ajuste a busca ou o filtro de situação."}
          action={workspace.permissions.manageFinance && state.documents.length === 0 ? <Link href="/workspace/financeiro/contas/nova" className="font-semibold underline">Registrar primeiro documento</Link> : undefined}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Fornecedor / documento</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Próximo vencimento</th>
                  <th className="px-4 py-3 font-medium">Nominal</th>
                  <th className="px-4 py-3 font-medium">Saldo/diferença</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((document) => {
                  const summary = summarizeDocument(document, state.installments);
                  return (
                    <tr key={document.id}>
                      <td className="px-4 py-3">
                        <Link href={`/workspace/financeiro/contas/${document.id}`} className="font-semibold underline-offset-4 hover:underline">{supplierById.get(document.supplierId) ?? "Fornecedor indisponível"}</Link>
                        <p className="mt-1 text-xs text-neutral-500">{document.documentNumber ? `Documento ${document.documentNumber}` : document.documentType}{document.series ? ` · série ${document.series}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">{unitById.get(document.unitId) ?? "Unidade indisponível"}</td>
                      <td className="px-4 py-3">{summary.nextDueDate ? dateLabel(summary.nextDueDate) : "—"}</td>
                      <td className="px-4 py-3">{moneyLabel(summary.nominalAmount)}</td>
                      <td className="px-4 py-3">{moneyLabel(summary.balanceAmount)}</td>
                      <td className="px-4 py-3"><StatusBadge tone={situationTone(summary.situation)}>{documentSituationLabel[summary.situation]}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((document) => {
              const summary = summarizeDocument(document, state.installments);
              return (
                <Link key={document.id} href={`/workspace/financeiro/contas/${document.id}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{supplierById.get(document.supplierId) ?? "Fornecedor indisponível"}</p>
                      <p className="mt-1 text-xs text-neutral-500">{document.documentNumber ? `Documento ${document.documentNumber}` : document.documentType}</p>
                    </div>
                    <StatusBadge tone={situationTone(summary.situation)}>{documentSituationLabel[summary.situation]}</StatusBadge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-neutral-500">Unidade</dt><dd className="mt-1 font-medium">{unitById.get(document.unitId) ?? "Indisponível"}</dd></div>
                    <div><dt className="text-xs text-neutral-500">Próximo vencimento</dt><dd className="mt-1 font-medium">{summary.nextDueDate ? dateLabel(summary.nextDueDate) : "—"}</dd></div>
                    <div><dt className="text-xs text-neutral-500">Nominal</dt><dd className="mt-1 font-medium">{moneyLabel(summary.nominalAmount)}</dd></div>
                    <div><dt className="text-xs text-neutral-500">Saldo/diferença</dt><dd className="mt-1 font-medium">{moneyLabel(summary.balanceAmount)}</dd></div>
                  </dl>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
