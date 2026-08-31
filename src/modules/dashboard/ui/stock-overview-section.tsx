"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeedbackMessage } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  StockOverviewSnapshot,
  SupabaseStockOverviewQuery,
} from "../adapters/supabase-stock-overview-query";

interface StockOverviewSectionProps {
  readonly organizationId: EntityId;
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly timeZone: string;
  readonly horizonDays: number;
  readonly transfersInTransitCount: number;
  readonly openInventoryCount: number;
  readonly expiredBatchCount: number;
  readonly expiringSoonCount: number;
  readonly belowMinimumCount: number;
}

interface StockCard {
  readonly label: string;
  readonly value: string;
  readonly href: string;
  readonly note?: string;
}

export function StockOverviewSection(props: StockOverviewSectionProps) {
  const query = useMemo(() => new SupabaseStockOverviewQuery(createBrowserSupabaseClient()), []);
  const requestSequence = useRef(0);
  const [overview, setOverview] = useState<StockOverviewSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasPeriod = Boolean(props.dateFrom && props.dateTo);
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
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o resumo de estoque.");
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

  const cards: readonly StockCard[] = [
    {
      label: "Posições com saldo",
      value: overview ? String(overview.balancePositionCount) : "—",
      href: "/workspace/estoque",
      note: "Estado atual · produto e local com saldo diferente de zero",
    },
    {
      label: hasPeriod ? "Movimentações no período" : "Movimentações registradas",
      value: overview ? String(overview.movementCount) : "—",
      href: "/workspace/estoque",
      note: hasPeriod ? "Pela data e hora registradas na organização" : "Histórico visível completo",
    },
    {
      label: hasPeriod ? "Perdas e vencimentos no período" : "Perdas e vencimentos registrados",
      value: overview ? String(overview.lossMovementCount) : "—",
      href: "/workspace/baixas",
      note: hasPeriod ? "Baixas por perda ou vencimento registradas no período" : "Histórico visível completo",
    },
    {
      label: "Abaixo do estoque mínimo",
      value: String(props.belowMinimumCount),
      href: "/workspace/estoque/minimos",
      note: "Estado atual",
    },
    {
      label: "Transferências em trânsito",
      value: String(props.transfersInTransitCount),
      href: "/workspace/transferencias",
      note: "Estado atual",
    },
    {
      label: "Inventários em andamento",
      value: String(props.openInventoryCount),
      href: "/workspace/inventarios",
      note: "Estado atual",
    },
    {
      label: hasPeriod ? "Lotes vencidos no período" : "Lotes vencidos",
      value: String(props.expiredBatchCount),
      href: "/workspace/estoque/lotes",
      note: "Pela validade registrada no lote",
    },
    {
      label: `Lotes vencendo em até ${props.horizonDays} dias${hasPeriod ? " · no período" : ""}`,
      value: String(props.expiringSoonCount),
      href: "/workspace/estoque/lotes",
      note: "Horizonte de alerta aplicado à validade registrada",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950">Estoque</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            Posições mostram produto e local com saldo. Movimentações e perdas usam somente registros confirmados; quantidades com unidades de medida diferentes não são somadas em um total artificial.
          </p>
        </div>
        {loading && <span className="text-xs text-neutral-500" role="status">Atualizando estoque...</span>}
      </div>

      {error && (
        <FeedbackMessage tone="danger" role="alert">
          <strong>Resumo de estoque indisponível.</strong> {error}
        </FeedbackMessage>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-950">{card.value}</p>
            {card.note && <p className="mt-2 text-xs leading-5 text-neutral-500">{card.note}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
