"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabaseDashboardQuery, DashboardSnapshot } from "@/modules/dashboard/adapters/supabase-dashboard-query";
import { buildDashboardSummary, DashboardAttentionItem } from "@/modules/dashboard/application/dashboard-summary";
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

  function reload(nextUnitId: string, nextSectorId: string, nextHorizonDays: number) {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    void gateway.load(organizationId, {
      unitId: nextUnitId ? nextUnitId as EntityId : undefined,
      sectorId: nextSectorId ? nextSectorId as EntityId : undefined,
      horizonDays: nextHorizonDays,
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

  const availableSectors = (snapshot?.sectors ?? []).filter((sector) => !unitId || sector.unitId === unitId);
  const selectedSector = (snapshot?.sectors ?? []).find((sector) => sector.id === sectorId);

  const summary = snapshot ? buildDashboardSummary(snapshot.data, {
    today: snapshot.today,
    horizonDays,
    unitId: unitId ? unitId as EntityId : undefined,
    sectorId: sectorId ? sectorId as EntityId : undefined,
  }) : null;

  const financeCards = summary ? [
    { label: "Total nominal", value: formatMoney(summary.finance.nominal), href: "/workspace/financeiro" },
    { label: "Pago líquido", value: formatMoney(summary.finance.paid), href: "/workspace/financeiro" },
    { label: "Saldo em aberto", value: formatMoney(summary.finance.openBalance), href: "/workspace/financeiro" },
    { label: "Parcelas vencidas", value: String(summary.finance.overdueCount), href: "/workspace/financeiro" },
  ] : [];

  const operationalCards = summary ? [
    { label: "Caixas abertos", value: String(summary.cash.openCount), href: "/workspace/caixa", unitOnly: true },
    { label: "Divergências no período", value: String(summary.cash.discrepancyCount), href: "/workspace/caixa", unitOnly: true },
    { label: "Pedidos pendentes", value: String(summary.purchases.pendingCount), href: "/workspace/compras", unitOnly: false },
    { label: "Transferências em trânsito", value: String(summary.stock.transfersInTransitCount), href: "/workspace/transferencias", unitOnly: false },
    { label: "Inventários em andamento", value: String(summary.stock.openInventoryCount), href: "/workspace/inventarios", unitOnly: false },
    { label: "Lotes vencidos", value: String(summary.stock.expiredBatchCount), href: "/workspace/estoque", unitOnly: false },
  ] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Atenção operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{workspace.organizationName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">Pendências e KPIs derivados dos módulos persistentes. O painel é somente leitura: cada alerta leva ao fluxo transacional que continua sendo a fonte de verdade.</p>
          {snapshot && <p className="mt-2 text-xs text-neutral-500">Data de negócio: {snapshot.today} · timezone {snapshot.timeZone}</p>}
        </div>

        <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3 xl:min-w-[660px]">
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
                reload(nextUnitId, nextSectorId, horizonDays);
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
                reload(unitId, nextSectorId, horizonDays);
              }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value="">Todos os Setores autorizados</option>
              {availableSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-neutral-600">Horizonte
            <select
              value={horizonDays}
              onChange={(event) => {
                const next = Number(event.target.value);
                setHorizonDays(next);
                reload(unitId, sectorId, next);
              }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-950"
            >
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
            </select>
          </label>
          {sectorId && (
            <div className="sm:col-span-3 rounded-lg bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-600">
              Setor ativo: <strong className="text-neutral-800">{selectedSector?.name ?? "selecionado"}</strong>. Financeiro, Compras e Estoque usam somente vínculos setoriais explícitos. Caixa não possui relação com Setor no modelo atual e continua seguindo apenas Unidade + horizonte.
            </div>
          )}
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><strong>Dashboard indisponível.</strong> {error}</div>}
      {loading && !snapshot && <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-sm text-neutral-500">Carregando indicadores persistentes...</div>}

      {summary && (
        <>
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">O que precisa de atenção</h2><p className="mt-1 text-sm text-neutral-500">Somente sinais com ocorrência aparecem nesta fila.{sectorId ? " Sinais de Caixa permanecem no escopo de Unidade, não de Setor." : ""}</p></div>{loading && <span className="text-xs text-neutral-500">Atualizando...</span>}</div>
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
            <div><h2 className="text-xl font-semibold">Financeiro</h2><p className="mt-1 text-sm text-neutral-500">Valores usam o read model de parcelas; status não é recalculado na interface.{sectorId ? " O filtro de Setor usa o sector_id explícito do documento financeiro." : ""}</p></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {financeCards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"><p className="text-sm text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-semibold">{card.value}</p></Link>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/workspace/financeiro" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Vencendo hoje</span><strong className="mt-1 block text-xl">{summary.finance.dueTodayCount}</strong></Link>
              <Link href="/workspace/financeiro" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Próximos {horizonDays} dias</span><strong className="mt-1 block text-xl">{summary.finance.dueSoonCount}</strong></Link>
              <Link href="/workspace/caixa" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Caixas fechados no período{sectorId ? " · escopo Unidade" : ""}</span><strong className="mt-1 block text-xl">{summary.cash.recentClosedCount}</strong></Link>
            </div>
          </section>

          <section className="space-y-4">
            <div><h2 className="text-xl font-semibold">Operação</h2><p className="mt-1 text-sm text-neutral-500">Contagens apontam diretamente para os módulos responsáveis pela correção.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {operationalCards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"><p className="text-sm text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-semibold">{card.value}</p>{sectorId && card.unitOnly && <p className="mt-2 text-xs text-neutral-500">Escopo: Unidade + horizonte</p>}</Link>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/workspace/compras" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Entregas atrasadas</span><strong className="mt-1 block text-xl">{summary.purchases.lateDeliveryCount}</strong></Link>
              <Link href="/workspace/compras" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Entregas em até {horizonDays} dias</span><strong className="mt-1 block text-xl">{summary.purchases.deliverySoonCount}</strong></Link>
              <Link href="/workspace/estoque" className="rounded-xl border border-neutral-200 bg-white p-4 text-sm"><span className="text-neutral-500">Lotes vencendo em até {horizonDays} dias</span><strong className="mt-1 block text-xl">{summary.stock.expiringSoonCount}</strong></Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
