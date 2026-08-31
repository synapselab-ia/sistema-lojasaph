"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, FeedbackMessage, Panel } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  PurchaseOverviewSnapshot,
  SupabasePurchaseOverviewQuery,
} from "../adapters/supabase-purchase-overview-query";

interface PurchaseOverviewSectionProps {
  readonly organizationId: EntityId;
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly timeZone: string;
}

function formatMoney(value: Money): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value.cents / 100);
}

function formatActivity(value: string | null, timeZone: string): string {
  if (!value) return "Sem atividade no recorte";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDelta(value: Money): string {
  const prefix = value.cents > 0 ? "+" : "";
  return `${prefix}${formatMoney(value)}`;
}

export function PurchaseOverviewSection(props: PurchaseOverviewSectionProps) {
  const query = useMemo(() => new SupabasePurchaseOverviewQuery(createBrowserSupabaseClient()), []);
  const requestSequence = useRef(0);
  const [overview, setOverview] = useState<PurchaseOverviewSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasPeriod = Boolean(props.dateFrom && props.dateTo);
  const hasLocalScope = Boolean(props.unitId || props.sectorId);
  const loading = overview === null && error === null;

  useEffect(() => {
    let active = true;
    const requestId = ++requestSequence.current;

    void query.load(props.organizationId, {
      unitId: props.unitId,
      sectorId: props.sectorId,
      dateFrom: props.dateFrom,
      dateTo: props.dateTo,
      timeZone: props.timeZone,
    })
      .then((next) => {
        if (!active || requestId !== requestSequence.current) return;
        setOverview(next);
        setError(null);
      })
      .catch((reason) => {
        if (!active || requestId !== requestSequence.current) return;
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o histórico de compras.");
      });

    return () => { active = false; };
  }, [
    props.dateFrom,
    props.dateTo,
    props.organizationId,
    props.sectorId,
    props.timeZone,
    props.unitId,
    query,
  ]);

  const priceVariationValue = !overview || overview.comparablePriceItemCount === 0
    ? "—"
    : String(overview.changedPriceItemCount);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Compras e fornecedores</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Histórico factual de pedidos emitidos, recebimentos e preços observados. O painel não cria score, ranking ou prazo de desempenho para fornecedores.
          </p>
        </div>
        {loading && <span className="text-xs text-neutral-500" role="status">Atualizando compras...</span>}
      </div>

      {error && (
        <FeedbackMessage tone="danger" role="alert">
          <strong>Histórico de compras indisponível.</strong> {error}
        </FeedbackMessage>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/workspace/compras/pedidos" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          <p className="text-sm text-neutral-500">{hasPeriod ? "Pedidos emitidos no período" : "Pedidos emitidos"}</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">{overview ? overview.issuedOrderCount : "—"}</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">Pela data de emissão; rascunhos ainda não emitidos não entram.</p>
        </Link>
        <Link href="/workspace/compras/recebimentos" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          <p className="text-sm text-neutral-500">{hasPeriod ? "Recebimentos no período" : "Recebimentos"}</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">{overview ? overview.receiptCount : "—"}</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">Pela data do recebimento, independentemente da data de emissão do pedido.</p>
        </Link>
        <Link href="/workspace/fornecedores" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          <p className="text-sm text-neutral-500">Fornecedores com pedidos</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">{overview ? overview.suppliersWithOrdersCount : "—"}</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">Fornecedores distintos no mesmo recorte de pedidos emitidos.</p>
        </Link>
        <Link href="/workspace/fornecedores" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
          <p className="text-sm text-neutral-500">Itens com preço alterado</p>
          <p className="mt-2 text-2xl font-semibold text-neutral-950">{priceVariationValue}</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {overview && overview.comparablePriceItemCount > 0
              ? `${overview.comparablePriceItemCount} item(ns) com histórico comparável.`
              : "Sem duas observações comparáveis no recorte."}
          </p>
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel as="article" className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-neutral-950">Histórico por fornecedor</h3>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Pedidos e recebimentos seguem o local registrado no pedido para aplicar Unidade e Setor quando esses vínculos existem.
              </p>
            </div>
            <Link href="/workspace/compras/pedidos" className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800">Abrir pedidos</Link>
          </div>

          {!overview || overview.supplierHistory.length === 0 ? (
            <EmptyState
              title="Sem atividade de compras no recorte"
              description="Não há pedidos emitidos ou recebimentos disponíveis para os filtros atuais."
              className="py-6"
            />
          ) : (
            <div className="divide-y divide-neutral-100">
              {overview.supplierHistory.map((supplier) => (
                <div key={supplier.supplierId} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-neutral-950">{supplier.supplierName}</p>
                    <p className="mt-1 text-xs text-neutral-500">Última atividade: {formatActivity(supplier.lastActivityAt, props.timeZone)}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-neutral-600 sm:text-right">
                    <span><strong className="block text-base text-neutral-950">{supplier.issuedOrderCount}</strong> pedidos</span>
                    <span><strong className="block text-base text-neutral-950">{supplier.receiptCount}</strong> recebimentos</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel as="article" className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-neutral-950">Histórico de preços</h3>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {overview ? `${overview.priceObservationCount} observação(ões) de preço no recorte. ` : ""}
                A comparação usa somente o preço unitário registrado para o mesmo fornecedor e item.
              </p>
            </div>
            <Link href="/workspace/fornecedores" className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800">Abrir fornecedores</Link>
          </div>

          {hasLocalScope && (
            <FeedbackMessage tone="attention">
              O histórico de preços permanece no escopo da organização inteira porque não existe vínculo comprovado de cada observação com uma Unidade ou Setor específico.
            </FeedbackMessage>
          )}

          {!overview || overview.priceObservationCount === 0 ? (
            <EmptyState
              title="Sem observações de preço no recorte"
              description="Não há preços registrados para comparação com os filtros atuais."
              className="py-6"
            />
          ) : overview.comparablePriceItemCount === 0 ? (
            <EmptyState
              title="Ainda não há comparação disponível"
              description="Existem preços registrados, mas faltam duas observações do mesmo item e fornecedor para calcular a variação."
              className="py-6"
            />
          ) : overview.recentPriceChanges.length === 0 ? (
            <EmptyState
              title="Nenhuma alteração recente"
              description="Há histórico comparável, mas as últimas comparações não registram mudança de preço."
              className="py-6"
            />
          ) : (
            <div className="divide-y divide-neutral-100">
              {overview.recentPriceChanges.map((change) => (
                <div key={change.supplierItemId} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-neutral-950">{change.stockItemName}</p>
                      <p className="mt-1 text-xs text-neutral-500">{change.supplierName} · {formatActivity(change.observedAt, props.timeZone)}</p>
                    </div>
                    <p className={`text-sm font-semibold ${change.delta.cents > 0 ? "text-red-700" : "text-emerald-700"}`}>{formatDelta(change.delta)}</p>
                  </div>
                  <p className="mt-2 text-xs text-neutral-600">{formatMoney(change.previousPrice)} → {formatMoney(change.currentPrice)}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}
