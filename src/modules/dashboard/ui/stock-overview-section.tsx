"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPeriod = Boolean(props.dateFrom && props.dateTo);

  useEffect(() => {
    let active = true;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);

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
      })
      .catch((reason) => {
        if (!active || requestId !== requestSequence.current) return;
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o resumo de estoque.");
      })
      .finally(() => {
        if (active && requestId === requestSequence.current) setLoading(false);
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
      note: "Estado atual · item + local com saldo diferente de zero",
    },
    {
      label: hasPeriod ? "Movimentações no período" : "Movimentações registradas",
      value: overview ? String(overview.movementCount) : "—",
      href: "/workspace/estoque",
      note: hasPeriod ? "Por occurred_at no timezone da organização" : "Histórico visível completo",
    },
    {
      label: hasPeriod ? "Perdas/vencimentos no período" : "Perdas/vencimentos registrados",
      value: overview ? String(overview.lossMovementCount) : "—",
      href: "/workspace/baixas",
      note: hasPeriod ? "Movimentos loss/expiration no período" : "Histórico visível completo",
    },
    {
      label: "Abaixo do estoque mínimo",
      value: String(props.belowMinimumCount),
      href: "/workspace/estoque",
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
      href: "/workspace/estoque",
      note: "Por expiration_date",
    },
    {
      label: `Lotes vencendo em até ${props.horizonDays} dias${hasPeriod ? " · no período" : ""}`,
      value: String(props.expiringSoonCount),
      href: "/workspace/estoque",
      note: "Horizonte de alerta por expiration_date",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Estoque</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Saldos usam a projeção item + local; movimentações e perdas usam o ledger confirmado. Quantidades de unidades de medida diferentes não são somadas em um saldo total fictício.
          </p>
        </div>
        {loading && <span className="text-xs text-neutral-500">Atualizando estoque...</span>}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <strong>Resumo de atividade indisponível.</strong> {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300">
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            {card.note && <p className="mt-2 text-xs leading-5 text-neutral-500">{card.note}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
