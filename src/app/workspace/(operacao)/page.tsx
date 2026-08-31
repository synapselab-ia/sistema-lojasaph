"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  EmptyState,
  FeedbackMessage,
  FormField,
  Input,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  SupabaseDashboardQuery,
  type DashboardSnapshot,
} from "@/modules/dashboard/adapters/supabase-dashboard-query";
import { dashboardAttentionHref } from "@/modules/dashboard/application/dashboard-navigation";
import {
  buildDashboardSummary,
  type DashboardAttentionItem,
} from "@/modules/dashboard/application/dashboard-summary";
import { PurchaseOverviewSection } from "@/modules/dashboard/ui/purchase-overview-section";
import { StockOverviewSection } from "@/modules/dashboard/ui/stock-overview-section";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function formatMoney(value: Money): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value.cents / 100);
}

function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function attentionClass(item: DashboardAttentionItem): string {
  return item.severity === "high"
    ? "border-red-200 bg-red-50 text-red-950 hover:border-red-300"
    : "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300";
}

interface MetricLinkProps {
  readonly label: string;
  readonly value: string;
  readonly href: string;
  readonly note?: string;
}

function MetricLink({ label, value, href, note }: MetricLinkProps) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
    >
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-950">{value}</p>
      {note && <p className="mt-2 text-xs leading-5 text-neutral-500">{note}</p>}
    </Link>
  );
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
        if (active && requestId === requestSequence.current) {
          setError(reason instanceof Error ? reason.message : "Não foi possível carregar a visão geral.");
        }
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
        if (requestId === requestSequence.current) {
          setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a visão geral.");
        }
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

  const financeCards: readonly MetricLinkProps[] = summary ? [
    {
      label: "Total nominal",
      value: formatMoney(summary.finance.nominal),
      href: "/workspace/financeiro/contas",
      note: hasAppliedPeriod ? "Obrigações com vencimento no período selecionado" : "Obrigações visíveis no escopo atual",
    },
    {
      label: hasAppliedPeriod ? "Pago líquido acumulado" : "Pago líquido",
      value: formatMoney(summary.finance.paid),
      href: "/workspace/financeiro/contas",
      note: hasAppliedPeriod ? "Acumulado das obrigações cujo vencimento está no período" : undefined,
    },
    {
      label: "Saldo em aberto",
      value: formatMoney(summary.finance.openBalance),
      href: "/workspace/financeiro/contas",
    },
    {
      label: "Parcelas vencidas",
      value: String(summary.finance.overdueCount),
      href: "/workspace/financeiro/vencimentos",
    },
  ] : [];

  const operationCards: readonly MetricLinkProps[] = summary ? [
    {
      label: "Caixas abertos",
      value: String(summary.cash.openCount),
      href: "/workspace/caixa/sessoes",
      note: hasAppliedPeriod ? "Estado atual; não é limitado pelo período" : "Estado atual",
    },
    {
      label: hasAppliedPeriod ? "Divergências no período" : `Divergências nos últimos ${horizonDays} dias`,
      value: String(summary.cash.discrepancyCount),
      href: "/workspace/caixa/sessoes",
      note: sectorId ? "Caixa permanece no escopo da Unidade" : undefined,
    },
    {
      label: "Pedidos pendentes",
      value: String(summary.purchases.pendingCount),
      href: "/workspace/compras/pedidos",
      note: hasAppliedPeriod ? "Estado atual; não é limitado pelo período" : "Estado atual",
    },
    {
      label: "Fechamentos recentes",
      value: String(summary.cash.recentClosedCount),
      href: "/workspace/caixa/sessoes",
      note: hasAppliedPeriod
        ? `Últimos ${horizonDays} dias dentro do período selecionado`
        : `Últimos ${horizonDays} dias pela data de negócio`,
    },
    {
      label: hasAppliedPeriod ? "Entregas atrasadas no período" : "Entregas atrasadas",
      value: String(summary.purchases.lateDeliveryCount),
      href: "/workspace/compras/pedidos",
    },
    {
      label: `Entregas previstas em até ${horizonDays} dias${hasAppliedPeriod ? " · no período" : ""}`,
      value: String(summary.purchases.deliverySoonCount),
      href: "/workspace/compras/pedidos",
    },
  ] : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Visão geral"
        title={workspace.organizationName}
        description="Prioridades e indicadores operacionais para acompanhar Estoque, Compras, Financeiro e Caixa. O painel é somente leitura; as ações continuam nas jornadas de cada área."
        actions={snapshot ? (
          <div className="text-right text-xs leading-5 text-neutral-500">
            <p>Data de negócio: <strong className="font-medium text-neutral-700">{formatIsoDate(snapshot.today)}</strong></p>
            <p>Fuso horário: {snapshot.timeZone}</p>
          </div>
        ) : undefined}
      />

      <Panel as="section" aria-label="Filtros da visão geral" className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Filtros</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">Escolha o escopo da operação e, quando necessário, um horizonte de alertas ou período gerencial.</p>
          </div>
          <span className="min-h-5 text-xs text-neutral-500" role="status" aria-live="polite">
            {loading && snapshot ? "Atualizando indicadores..." : ""}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FormField id="dashboard-unit" label="Unidade">
            {(accessibilityProps) => (
              <Select
                {...accessibilityProps}
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
                disabled={loading && !snapshot}
              >
                <option value="">Todas as unidades</option>
                {(snapshot?.units ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </Select>
            )}
          </FormField>

          <FormField
            id="dashboard-sector"
            label="Setor"
            hint="Aplica-se somente aos indicadores que possuem vínculo setorial explícito."
          >
            {(accessibilityProps) => (
              <Select
                {...accessibilityProps}
                value={sectorId}
                onChange={(event) => {
                  const nextSectorId = event.target.value;
                  setSectorId(nextSectorId);
                  reload(unitId, nextSectorId, horizonDays, appliedDateFrom, appliedDateTo);
                }}
                disabled={loading && !snapshot}
              >
                <option value="">Todos os setores autorizados</option>
                {availableSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
              </Select>
            )}
          </FormField>

          <FormField
            id="dashboard-horizon"
            label="Horizonte de alertas"
            hint="Controla janelas relativas de alertas próximos ou recentes."
          >
            {(accessibilityProps) => (
              <Select
                {...accessibilityProps}
                value={horizonDays}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setHorizonDays(next);
                  reload(unitId, sectorId, next, appliedDateFrom, appliedDateTo);
                }}
                disabled={loading && !snapshot}
              >
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
              </Select>
            )}
          </FormField>
        </div>

        <div className="border-t border-neutral-100 pt-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
            <FormField id="dashboard-date-from" label="Período gerencial — de">
              {(accessibilityProps) => (
                <Input
                  {...accessibilityProps}
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  disabled={loading && !snapshot}
                />
              )}
            </FormField>
            <FormField id="dashboard-date-to" label="Período gerencial — até">
              {(accessibilityProps) => (
                <Input
                  {...accessibilityProps}
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  disabled={loading && !snapshot}
                />
              )}
            </FormField>
            <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1">
              <Button type="button" variant="primary" onClick={applyPeriod} loading={loading}>
                Aplicar período
              </Button>
              {hasAppliedPeriod && (
                <Button type="button" onClick={clearPeriod} disabled={loading}>
                  Limpar período
                </Button>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            O período é um intervalo explícito e só limita métricas que possuem uma data operacional comprovada. Ele não substitui o horizonte de alertas nem transforma indicadores de estado atual em métricas históricas.
          </p>
        </div>

        {hasAppliedPeriod && (
          <FeedbackMessage tone="info">
            Período ativo: <strong>{formatIsoDate(appliedDateFrom)} a {formatIsoDate(appliedDateTo)}</strong>.
          </FeedbackMessage>
        )}

        {sectorId && (
          <FeedbackMessage tone="neutral">
            Setor ativo: <strong>{selectedSector?.name ?? "selecionado"}</strong>. Estoque, Compras e Financeiro usam somente vínculos setoriais existentes. Caixa continua no escopo da Unidade e usa a data de negócio quando o indicador é temporal.
          </FeedbackMessage>
        )}
      </Panel>

      {error && (
        <FeedbackMessage tone="danger" role="alert">
          <strong>Não foi possível atualizar a visão geral.</strong> {error}
        </FeedbackMessage>
      )}

      {loading && !snapshot && (
        <Panel as="section" aria-busy="true" className="text-sm text-neutral-600">
          Carregando indicadores da operação...
        </Panel>
      )}

      {summary && snapshot && (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-neutral-950">Precisa de atenção</h2>
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  Somente sinais com ocorrência aparecem aqui. Cada item leva à jornada operacional mais específica disponível.
                </p>
              </div>
              {sectorId && <p className="text-xs text-neutral-500">Sinais de Caixa permanecem no escopo da Unidade.</p>}
            </div>

            {summary.attention.length === 0 ? (
              <EmptyState
                title="Nenhuma pendência para os filtros atuais"
                description="Os indicadores continuam disponíveis abaixo para acompanhamento da operação."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {summary.attention.map((item) => (
                  <Link
                    key={item.key}
                    href={dashboardAttentionHref(item)}
                    className={`flex min-h-20 items-center justify-between gap-4 rounded-2xl border p-4 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${attentionClass(item)}`}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="rounded-full bg-white/70 px-3 py-1 text-lg font-semibold">{item.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">Resumo financeiro</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Valores e situações vêm das obrigações já registradas. O painel não recalcula a situação financeira nem registra pagamentos.
                {sectorId ? " O Setor só é aplicado quando a obrigação possui esse vínculo." : ""}
                {hasAppliedPeriod ? " O período seleciona obrigações pelo vencimento; o valor pago é o acumulado dessas obrigações, não uma soma de pagamentos realizados dentro do intervalo." : ""}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {financeCards.map((card) => <MetricLink key={card.label} {...card} />)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricLink
                label={`Vencendo hoje${hasAppliedPeriod ? " · no período" : ""}`}
                value={String(summary.finance.dueTodayCount)}
                href="/workspace/financeiro/vencimentos"
              />
              <MetricLink
                label={`Vencendo nos próximos ${horizonDays} dias${hasAppliedPeriod ? " · no período" : ""}`}
                value={String(summary.finance.dueSoonCount)}
                href="/workspace/financeiro/vencimentos"
              />
            </div>
          </section>

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

          <PurchaseOverviewSection
            organizationId={organizationId}
            unitId={unitId ? unitId as EntityId : undefined}
            sectorId={sectorId ? sectorId as EntityId : undefined}
            dateFrom={appliedDateFrom || undefined}
            dateTo={appliedDateTo || undefined}
            timeZone={snapshot.timeZone}
          />

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">Operação agora</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Situação de Caixa e Compras para continuar a rotina nas páginas próprias. Indicadores de estado atual permanecem atuais mesmo quando um período gerencial está selecionado.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {operationCards.map((card) => <MetricLink key={card.label} {...card} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
