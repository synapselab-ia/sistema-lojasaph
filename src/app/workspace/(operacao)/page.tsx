"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabaseDashboardQuery, DashboardSnapshot } from "@/modules/dashboard/adapters/supabase-dashboard-query";
import { buildDashboardSummary, DashboardAttentionItem } from "@/modules/dashboard/application/dashboard-summary";
import { PurchaseOverviewSection } from "@/modules/dashboard/ui/purchase-overview-section";
import { StockOverviewSection } from "@/modules/dashboard/ui/stock-overview-section";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function formatMoney(value: Money): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value.cents / 100);
}

function attentionClass(item: DashboardAttentionItem): string {
  return item.severity === "high"
    ? "border-red-200 bg-red-50 text-red-950"
    : "border-amber-200 bg-amber-50 text-amber-950";
}

export default function WorkspacePage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabaseDashboardQuery(createBrowserSupabaseClient()), []);
  const requestSequence = useRef(0);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [unitId, setUnitId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [horizonDays, setHorizonDays] = useState(7);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const organizationId = workspace.organizationId;

  useEffect(() => {
    let active = true;
    const requestId = ++requestSequence.current;
    void gateway.load(organizationId, { horizonDays: 7 })
      .then((next) => {
        if (!active || requestId !== requestSequence.current) return;
        setSnapshot(next);
        setError(null);
      })
      .catch((reason) => {
        if (active && requestId === requestSequence.current) setError(reason instanceof Error ? reason.message : "Não foi possível carregar o dashboard.");
      })
      .finally(() => {
        if (active && requestId === requestSequence.current) setLoading(false);
      });
    return () => { active = false; };
  }, [gateway, organizationId]);

  function reload(
    nextUnitId: string,
    nextSectorId: string,
    nextHorizonDays: number,
    nextDateFrom: string,
    nextDateTo: string,
  ) {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    void gateway.load(organizationId, {
      unitId: nextUnitId ? nextUnitId as EntityId : undefined,
      sectorId: nextSectorId ? nextSectorId as EntityId : undefined,
      horizonDays: nextHorizonDays,
      dateFrom: nextDateFrom || undefined,
      dateTo: nextDateTo || undefined,
    })
      .then((next) => {
        if (requestId === requestSequence.current) setSnapshot(next);
      })
      .catch((reason) => {
        if (requestId === requestSequence.current) setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o dashboard.");
      })
      .finally(() => {
        if (requestId === requestSequence.current) setLoading(false);
      });
  }

  function applyPeriod() {
    if (!dateFrom || !dateTo) {
      setError("Informe a data inicial e a data final para aplicar o período gerencial.");
      return;
    }
    if (dateFrom > dateTo) {
      setError("A data inicial do período não pode ser posterior à data final.");
      return;
    }

    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    reload(unitId, sectorId, horizonDays, dateFrom, dateTo);
  }

  function clearPeriod() {
    setDateFrom("");
    setDateTo("");
    setAppliedDateFrom("");
    setAppliedDateTo("");
    reload(unitId, sectorId, horizonDays, "", "");
  }

  const availableSectors = (snapshot?.sectors ?? []).filter((sector) => !unitId || sector.unitId === unitId);
  const selectedSector = (snapshot?.sectors ?? []).find((sector) => sector.id === sectorId);
  const hasAppliedPeriod = Boolean(appliedDateFrom && appliedDateTo);

  const summary = snapshot ? buildDashboardSummary(snapshot.data, {
    today: snapshot.today,
    horizonDays,
    unitId: unitId ? unitId as EntityId : undefined,
    sectorId: sectorId ? sectorId as EntityId : undefined,
    dateFrom: appliedDateFrom || undefined,
    dateTo: appliedDateTo || undefined,
  }) : null;

  const financeCards = summary ? [
    { label: "Total nominal", value: formatMoney(summary.finance.nominal), href: "/workspace/financeiro" },
    { label: hasAppliedPeriod ? "Pago líquido acumulado" : "Pago líquido", value: formatMoney(summary.finance.paid), href: "/workspace/financeiro" },
    { label: "Saldo em aberto", value: formatMoney(summary.finance.openBalance), href: "/workspace/financeiro" },
    { label: "Parcelas vencidas", value: String(summary.finance.overdueCount), href: "/workspace/financeiro" },
  ] : [];

  const operationalCards = summary ? [
    { label: "Caixas abertos", value: String(summary.cash.openCount), href: "/workspace/caixa", unitOnly: true, currentState: true },
    { label: hasAppliedPeriod ? "Divergências no período" : "Divergências no horizonte", value: String(summary.cash.discrepancyCount), href: "/workspace/caixa", unitOnly: true, currentState: false },
    { label: "Pedidos pendentes", value: String(summary.purchases.pendingCount), href: "/workspace/compras", unitOnly: false, currentState: true },
  ] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Atenção operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{workspace.organizationName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">Pendências e KPIs derivados dos módulos persistentes. O painel é somente leitura: cada alerta leva ao fluxo transacional que continua sendo a fonte de verdade.</p>
          {snapshot && <p className="mt-2 text-xs text-neutral-500">Data de negócio: {snapshot.today} · timezone {snapshot.timeZone}</p>}
        </div>

        <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3 xl:min-w-[700px]">
          <label className="text-xs font-semibold text-neutral-600">Unidade
            <select
              value={unitId}
              onChange={(event) => {
                const nextUnitId = event.target.value;
                const sectorRemainsCompatible = !sectorId
                  || (snapshot?.sectors ?? []).some((sector) => sector.id === sectorId && (!nextUnitId || sector.unitId === nextUnitId));
                const nextSectorId = sectorRemainsCompatible ? sectorId : "";
                setUnitId(nextUnitId);
                setSectorId(nextSectorId);
                reload(nextUnitId, nextSectorId, horizonDays, appliedDateFrom, appliedDateTo);
              }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value="">Todas as unidades</option>
              {(snapshot?.units ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-neutral-600">Setor
            <select
              value={sectorId}
              onChange={(event) => {
                const nextSectorId = event.target.value;
                setSectorId(nextSectorId);
                reload(unitId, nextSectorId, horizonDays, appliedDateFrom, appliedDateTo);
              }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value="">Todos os Setores autorizados</option>
              {availableSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-neutral-600">Horizonte de alertas
            <select
              value={horizonDays}
              onChange={(event) => {
                const next = Number(event.target.value);
                setHorizonDays(next);
                reload(unitId, sectorId, next, appliedDateFrom, appliedDateTo);
              }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </label>

          <div className="grid gap-3 border-t border-neutral-100 pt-3 sm:col-span-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-semibold text-neutral-600">Período — de
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
              />
            </label>
            <label className="text-xs font-semibold text-neutral-600">Período — até
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={applyPeriod} disabled={loading} className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Aplicar período</button>
              {hasAppliedPeriod && <button type="button" onClick={clearPeriod} disabled={loading} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50">Limpar</button>}
            </div>
          </div>

          <div className="sm:col-span-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600">
            <strong>Horizonte</strong> controla janelas relativas de alertas próximos/recentes. <strong>Período</strong> é um intervalo gerencial explícito e só atua em métricas com data de negócio comprovada.
            {hasAppliedPeriod && <> Período ativo: <strong className="text-neutral-800">{appliedDateFrom} a {appliedDateTo}</strong>.</>}
          </div>
          {sectorId && (
            <div className="sm:col-span-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600">
              Setor ativo: <strong className="text-neutral-800">{selectedSector?.name ?? "selecionado"}</strong>. Financeiro, Compras e Estoque usam somente vínculos setoriais explícitos. Caixa continua no escopo de Unidade; quando há período, seus fechamentos usam `business_date`.
            </div>
          )}
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><strong>Dashboard indisponível.</strong> {error}</div>}
      {loading && !snapshot && <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-sm text-neutral-500">Carregando indicadores persistentes...</div>}

      {summary && (
        <>
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">O que precisa de atenção</h2><p className="mt-1 text-sm text-neutral-500">Somente sinais com ocorrência aparecem nesta fila.{sectorId ? " Sinais de Caixa permanecem no escopo de Unidade." : ""}{hasAppliedPeriod ? " Caixas abertos, pedidos pendentes, transferências e inventários permanecem indicadores de estado atual." : ""}</p></div>{loading && <span className="text-xs text-neutral-500">Atualizando...</span>}</div>
            {summary.attention.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">Nenhuma pendência disponível para os filtros atuais.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {summary.attention.map((item) => (
                  <Link key={item.key} href={item.href} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition hover:shadow-sm ${attentionClass(item)}`}>
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-lg font-semibold">{item.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div><h2 className="text-xl font-semibold">Financeiro</h2><p className="mt-1 text-sm text-neutral-500">Valores usam o read model de parcelas; status não é recalculado na interface.{sectorId ? " O filtro de Setor usa o sector_id explícito do documento financeiro." : ""}{hasAppliedPeriod ? " O período seleciona obrigações pelo vencimento. Pago líquido continua sendo o acumulado dessas obrigações, não pagamentos efetuados dentro do período." : ""}</p></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {financeCards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"><p className="text-sm text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-semibold">{card.value}</p></Link>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/workspace/financeiro" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Vencendo hoje{hasAppliedPeriod ? " · dentro do período" : ""}</span><strong className="mt-1 block text-xl">{summary.finance.dueTodayCount}</strong></Link>
              <Link href="/workspace/financeiro" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Próximos {horizonDays} dias{hasAppliedPeriod ? " · dentro do período" : ""}</span><strong className="mt-1 block text-xl">{summary.finance.dueSoonCount}</strong></Link>
              <Link href="/workspace/caixa" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Caixas fechados no horizonte{hasAppliedPeriod ? " · dentro do período" : ""}{sectorId ? " · escopo Unidade" : ""}</span><strong className="mt-1 block text-xl">{summary.cash.recentClosedCount}</strong></Link>
            </div>
          </section>

          {snapshot && (
            <StockOverviewSection
              organizationId={organizationId}
              unitId={unitId ? unitId as EntityId : undefined}
              sectorId={sectorId ? sectorId as EntityId : undefined}
              dateFrom={appliedDateFrom || undefined}
              dateTo={appliedDateTo || undefined}
              timeZone={snapshot.timeZone}
              horizonDays={horizonDays}
              transfersInTransitCount={summary.stock.transfersInTransitCount}
              openInventoryCount={summary.stock.openInventoryCount}
              expiredBatchCount={summary.stock.expiredBatchCount}
              expiringSoonCount={summary.stock.expiringSoonCount}
              belowMinimumCount={summary.stock.belowMinimumCount}
            />
          )}

          {snapshot && (
            <PurchaseOverviewSection
              organizationId={organizationId}
              unitId={unitId ? unitId as EntityId : undefined}
              sectorId={sectorId ? sectorId as EntityId : undefined}
              dateFrom={appliedDateFrom || undefined}
              dateTo={appliedDateTo || undefined}
              timeZone={snapshot.timeZone}
            />
          )}

          <section className="space-y-4">
            <div><h2 className="text-xl font-semibold">Operação</h2><p className="mt-1 text-sm text-neutral-500">Caixa e Compras mantêm seus próprios sinais operacionais; os indicadores de Estoque ficam consolidados na seção específica acima.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {operationalCards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"><p className="text-sm text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-semibold">{card.value}</p>{hasAppliedPeriod && card.currentState && <p className="mt-2 text-xs text-neutral-500">Escopo temporal: estado atual</p>}{sectorId && card.unitOnly && <p className="mt-2 text-xs text-neutral-500">Escopo organizacional: Unidade</p>}</Link>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/workspace/compras" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Entregas atrasadas{hasAppliedPeriod ? " no período" : ""}</span><strong className="mt-1 block text-xl">{summary.purchases.lateDeliveryCount}</strong></Link>
              <Link href="/workspace/compras" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Entregas em até {horizonDays} dias{hasAppliedPeriod ? " · dentro do período" : ""}</span><strong className="mt-1 block text-xl">{summary.purchases.deliverySoonCount}</strong></Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
