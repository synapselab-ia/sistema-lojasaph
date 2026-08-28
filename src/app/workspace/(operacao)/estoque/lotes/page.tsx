"use client";

import { useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

type ExpirationFilter = "all" | "expired" | "dated" | "undated";

export default function StockBatchesPage() {
  const workspace = useRuntimeWorkspace();
  const [query, setQuery] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>("all");
  const today = new Date().toISOString().slice(0, 10);

  const itemNames = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item.name])),
    [workspace.stockItems],
  );
  const itemUnits = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])),
    [workspace.stockItems],
  );
  const locationNames = useMemo(
    () => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])),
    [workspace.stockLocations],
  );

  const batches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return workspace.batches.filter((batch) => {
      const itemName = itemNames.get(batch.stockItemId) ?? "Item indisponível";
      const locationName = locationNames.get(batch.stockLocationId) ?? "Local indisponível";
      const batchCode = batch.batchCode ?? "";
      const expired = Boolean(batch.expirationDate && batch.expirationDate <= today);
      const matchesQuery = !normalizedQuery || `${itemName} ${locationName} ${batchCode}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      const matchesLocation = !locationId || batch.stockLocationId === locationId;
      const matchesExpiration = expirationFilter === "all"
        || (expirationFilter === "expired" && expired)
        || (expirationFilter === "dated" && Boolean(batch.expirationDate))
        || (expirationFilter === "undated" && !batch.expirationDate);
      return matchesQuery && matchesLocation && matchesExpiration;
    });
  }, [expirationFilter, itemNames, locationId, locationNames, query, today, workspace.batches]);

  const expiredCount = workspace.batches.filter((batch) => batch.expirationDate && batch.expirationDate <= today).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Lotes e validades"
        title="Lotes e validades"
        description="Consulte os lotes ainda com saldo e suas datas registradas. A tela não cria uma política de prioridade de saída nem um prazo de alerta não homologado."
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Panel padding="sm"><p className="text-xs text-neutral-500">Lotes com saldo</p><p className="mt-2 text-2xl font-semibold">{workspace.batches.length}</p></Panel>
        <Panel padding="sm" tone={expiredCount > 0 ? "attention" : "neutral"}><p className="text-xs text-neutral-500">Vencidos com saldo</p><p className="mt-2 text-2xl font-semibold">{expiredCount}</p></Panel>
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium">Buscar
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Produto, lote ou local" className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-medium">Local
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Todos</option>
              {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Validade
            <select value={expirationFilter} onChange={(event) => setExpirationFilter(event.target.value as ExpirationFilter)} className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="all">Todos</option>
              <option value="expired">Vencidos</option>
              <option value="dated">Com validade</option>
              <option value="undated">Sem validade</option>
            </select>
          </label>
        </div>

        {batches.length === 0 ? (
          <EmptyState title={workspace.batches.length === 0 ? "Nenhum lote com saldo" : "Nenhum lote encontrado"} description={workspace.batches.length === 0 ? "Os lotes aparecerão aqui quando houver saldo rastreado." : "Ajuste os filtros para ampliar a consulta."} />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Lote</th><th className="px-4 py-3 font-medium">Validade</th><th className="px-4 py-3 font-medium">Saldo</th><th className="px-4 py-3 font-medium">Situação</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {batches.map((batch) => {
                    const expired = Boolean(batch.expirationDate && batch.expirationDate <= today);
                    return <tr key={batch.id}><td className="px-4 py-3 font-medium">{itemNames.get(batch.stockItemId) ?? "Item indisponível"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(batch.stockLocationId) ?? "Local indisponível"}</td><td className="px-4 py-3">{batch.batchCode || "Sem código"}</td><td className="px-4 py-3">{batch.expirationDate || "Não informada"}</td><td className="px-4 py-3 font-semibold">{batch.remainingQuantity.toDecimal()} {itemUnits.get(batch.stockItemId) ?? ""}</td><td className="px-4 py-3"><ExpirationStatus expired={expired} hasDate={Boolean(batch.expirationDate)} /></td></tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {batches.map((batch) => {
                const expired = Boolean(batch.expirationDate && batch.expirationDate <= today);
                return <Panel key={batch.id} padding="sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{itemNames.get(batch.stockItemId) ?? "Item indisponível"}</h2><p className="mt-1 text-sm text-neutral-600">{locationNames.get(batch.stockLocationId) ?? "Local indisponível"}</p></div><ExpirationStatus expired={expired} hasDate={Boolean(batch.expirationDate)} /></div><dl className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Lote</dt><dd className="mt-1 font-medium">{batch.batchCode || "Sem código"}</dd></div><div><dt className="text-xs text-neutral-500">Validade</dt><dd className="mt-1 font-medium">{batch.expirationDate || "Não informada"}</dd></div><div><dt className="text-xs text-neutral-500">Saldo</dt><dd className="mt-1 font-medium">{batch.remainingQuantity.toDecimal()} {itemUnits.get(batch.stockItemId) ?? ""}</dd></div></dl></Panel>;
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ExpirationStatus({ expired, hasDate }: { expired: boolean; hasDate: boolean }) {
  if (expired) return <StatusBadge tone="danger">Vencido</StatusBadge>;
  if (hasDate) return <StatusBadge tone="neutral">Validade registrada</StatusBadge>;
  return <StatusBadge tone="neutral">Sem validade</StatusBadge>;
}
