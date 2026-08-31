"use client";

import Link from "next/link";
import { useMemo } from "react";
import { EmptyState, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { cashSessionStatusLabel, cashSessionStatusTone, dateLabel, moneyLabel } from "@/modules/cash/ui/cash-view-model";
import { useCashState } from "@/modules/cash/ui/use-cash-state";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const shortcutClass = "block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow";

export default function RuntimeCashPage() {
  const workspace = useRuntimeWorkspace();
  const { state, loading, error } = useCashState(workspace.organizationId);

  const registerById = useMemo(() => new Map(state.registers.map((register) => [register.id, register])), [state.registers]);
  const unitById = useMemo(() => new Map(state.units.map((unit) => [unit.id, unit.name])), [state.units]);
  const openSessions = state.sessions.filter((session) => session.status === "open");
  const closedSessions = state.sessions.filter((session) => session.status === "closed");
  const recentSessions = state.sessions.slice(0, 6);
  const differences = closedSessions.filter((session) => session.cashDifference && session.cashDifference.cents !== 0).length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Caixa"
        title="Visão do caixa"
        description="Acompanhe sessões, fechamento e configuração sem misturar a operação diária com cadastros. O valor esperado, o contado e a divergência são definidos no fechamento da sessão."
        actions={workspace.permissions.operateCash ? (
          <Link href="/workspace/caixa/sessoes/nova" className="inline-flex min-h-11 items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Abrir sessão</Link>
        ) : undefined}
      />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores do Caixa">
        <Panel tone={openSessions.length > 0 ? "attention" : "neutral"}><p className="text-sm text-neutral-500">Sessões abertas</p><p className="mt-2 text-2xl font-semibold">{openSessions.length}</p></Panel>
        <Panel><p className="text-sm text-neutral-500">Sessões fechadas visíveis</p><p className="mt-2 text-2xl font-semibold">{closedSessions.length}</p></Panel>
        <Panel><p className="text-sm text-neutral-500">Caixas ativos</p><p className="mt-2 text-2xl font-semibold">{state.registers.filter((register) => register.status === "active").length}</p></Panel>
        <Panel tone={differences > 0 ? "attention" : "neutral"}><p className="text-sm text-neutral-500">Fechamentos com divergência</p><p className="mt-2 text-2xl font-semibold">{differences}</p></Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Jornadas do Caixa">
        <Link href="/workspace/caixa/sessoes" className={shortcutClass}>
          <h2 className="font-semibold">Sessões</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Consulte sessões por caixa, unidade e situação e abra o detalhe para totais, movimentos e fechamento.</p>
        </Link>
        <Link href="/workspace/caixa/configuracao" className={shortcutClass}>
          <h2 className="font-semibold">Configuração</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Gerencie caixas físicos, meios de pagamento e regras de taxa conforme suas permissões.</p>
        </Link>
      </section>

      <Panel as="section">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Sessões recentes</h2><p className="mt-1 text-sm text-neutral-500">Últimas sessões disponíveis no seu acesso.</p></div>
          <Link href="/workspace/caixa/sessoes" className="text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline">Ver todas</Link>
        </div>

        {loading && state.sessions.length === 0 ? (
          <p className="mt-5 text-sm text-neutral-500">Carregando sessões...</p>
        ) : recentSessions.length === 0 ? (
          <div className="mt-5"><EmptyState title="Nenhuma sessão registrada" description="As sessões abertas ou encerradas disponíveis para você aparecerão aqui." action={workspace.permissions.operateCash ? <Link href="/workspace/caixa/sessoes/nova" className="font-semibold underline">Abrir primeira sessão</Link> : undefined} /></div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {recentSessions.map((session) => {
              const register = registerById.get(session.cashRegisterId);
              const unitName = register ? unitById.get(register.unitId) : undefined;
              return (
                <Link key={session.id} href={`/workspace/caixa/sessoes/${session.id}`} className="rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold">{register?.name ?? "Caixa indisponível"}</p><p className="mt-1 text-xs text-neutral-500">{unitName ?? "Unidade indisponível"} · {dateLabel(session.businessDate)} · sessão {session.sequence}</p></div>
                    <StatusBadge tone={cashSessionStatusTone[session.status]}>{cashSessionStatusLabel[session.status]}</StatusBadge>
                  </div>
                  {session.status === "closed" && <p className="mt-3 text-sm text-neutral-600">Contado: <strong>{moneyLabel(session.countedCashAmount)}</strong> · divergência: <strong>{moneyLabel(session.cashDifference)}</strong></p>}
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
