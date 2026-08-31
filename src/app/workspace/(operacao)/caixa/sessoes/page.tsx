"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { CashSessionStatus } from "@/modules/cash/adapters/supabase-cash-gateway";
import { cashSessionStatusLabel, cashSessionStatusTone, dateLabel, filterCashSessions, moneyLabel } from "@/modules/cash/ui/cash-view-model";
import { useCashState } from "@/modules/cash/ui/use-cash-state";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function CashSessionsPage() {
  const workspace = useRuntimeWorkspace();
  const { state, loading, error } = useCashState(workspace.organizationId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CashSessionStatus | "all">("all");

  const registerById = useMemo(() => new Map(state.registers.map((register) => [register.id, register])), [state.registers]);
  const unitNameById = useMemo(() => new Map(state.units.map((unit) => [unit.id, unit.name])), [state.units]);
  const filtered = useMemo(
    () => filterCashSessions(state.sessions, search, status, registerById, unitNameById),
    [registerById, search, state.sessions, status, unitNameById],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Caixa"
        title="Sessões"
        description="Consulte sessões abertas, fechadas e canceladas no seu escopo. Abra a sessão para registrar totais, movimentos ou fechamento quando ela ainda estiver aberta."
        actions={workspace.permissions.operateCash ? <Link href="/workspace/caixa/sessoes/nova" className="inline-flex min-h-11 items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Abrir sessão</Link> : undefined}
      />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}

      <Panel as="section">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <FormField id="cash-session-search" label="Buscar" hint="Caixa, código, unidade, data, situação ou observação.">
            {(field) => <Input {...field} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: balcão, loja centro..." />}
          </FormField>
          <FormField id="cash-session-status" label="Situação">
            {(field) => (
              <Select {...field} value={status} onChange={(event) => setStatus(event.target.value as CashSessionStatus | "all")}>
                <option value="all">Todas</option>
                <option value="open">Abertas</option>
                <option value="closed">Fechadas</option>
                <option value="cancelled">Canceladas</option>
              </Select>
            )}
          </FormField>
        </div>
      </Panel>

      {loading && state.sessions.length === 0 ? (
        <Panel><p className="text-sm text-neutral-500">Carregando sessões...</p></Panel>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={state.sessions.length === 0 ? "Nenhuma sessão registrada" : "Nenhuma sessão encontrada"}
          description={state.sessions.length === 0 ? "As sessões disponíveis no seu escopo aparecerão aqui." : "Ajuste a busca ou o filtro de situação."}
          action={workspace.permissions.operateCash && state.sessions.length === 0 ? <Link href="/workspace/caixa/sessoes/nova" className="font-semibold underline">Abrir primeira sessão</Link> : undefined}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Caixa / unidade</th><th className="px-4 py-3 font-medium">Data de negócio</th><th className="px-4 py-3 font-medium">Sessão</th><th className="px-4 py-3 font-medium">Fundo inicial</th><th className="px-4 py-3 font-medium">Contado</th><th className="px-4 py-3 font-medium">Divergência</th><th className="px-4 py-3 font-medium">Situação</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((session) => {
                  const register = registerById.get(session.cashRegisterId);
                  return (
                    <tr key={session.id}>
                      <td className="px-4 py-3"><Link href={`/workspace/caixa/sessoes/${session.id}`} className="font-semibold underline-offset-4 hover:underline">{register?.name ?? "Caixa indisponível"}</Link><p className="mt-1 text-xs text-neutral-500">{register ? unitNameById.get(register.unitId) ?? "Unidade indisponível" : "Unidade indisponível"}{register?.code ? ` · ${register.code}` : ""}</p></td>
                      <td className="px-4 py-3">{dateLabel(session.businessDate)}</td>
                      <td className="px-4 py-3">{session.sequence}</td>
                      <td className="px-4 py-3">{moneyLabel(session.openingFloat)}</td>
                      <td className="px-4 py-3">{moneyLabel(session.countedCashAmount)}</td>
                      <td className="px-4 py-3">{moneyLabel(session.cashDifference)}</td>
                      <td className="px-4 py-3"><StatusBadge tone={cashSessionStatusTone[session.status]}>{cashSessionStatusLabel[session.status]}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map((session) => {
              const register = registerById.get(session.cashRegisterId);
              return (
                <Link key={session.id} href={`/workspace/caixa/sessoes/${session.id}`} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{register?.name ?? "Caixa indisponível"}</p><p className="mt-1 text-xs text-neutral-500">{register ? unitNameById.get(register.unitId) ?? "Unidade indisponível" : "Unidade indisponível"}</p></div><StatusBadge tone={cashSessionStatusTone[session.status]}>{cashSessionStatusLabel[session.status]}</StatusBadge></div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Data</dt><dd className="mt-1 font-medium">{dateLabel(session.businessDate)}</dd></div><div><dt className="text-xs text-neutral-500">Sessão</dt><dd className="mt-1 font-medium">{session.sequence}</dd></div><div><dt className="text-xs text-neutral-500">Fundo inicial</dt><dd className="mt-1 font-medium">{moneyLabel(session.openingFloat)}</dd></div><div><dt className="text-xs text-neutral-500">Divergência</dt><dd className="mt-1 font-medium">{moneyLabel(session.cashDifference)}</dd></div></dl>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
