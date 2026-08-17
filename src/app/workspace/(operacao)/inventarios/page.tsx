"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  RuntimeInventoryCount,
  SupabaseInventoryCountGateway,
} from "@/modules/inventory/adapters/supabase-inventory-count-gateway";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function numeric(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function RuntimeInventoriesPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabaseInventoryCountGateway(createBrowserSupabaseClient()), []);
  const [counts, setCounts] = useState<readonly RuntimeInventoryCount[]>([]);
  const [locationId, setLocationId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { quantity: string; cost: string }>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const itemById = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item])), [workspace.stockItems]);
  const locationById = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, location])), [workspace.stockLocations]);
  // Inventory RPCs use the same role set as stock entry/withdrawal: owner/admin/manager/inventory.
  const canManage = workspace.permissions.recordStockEntry;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCounts(await gateway.list(workspace.organizationId));
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [gateway, workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey("start");
    setMessage(null);
    try {
      await gateway.start(workspace.organizationId, locationId as EntityId);
      setLocationId("");
      await refresh();
      setMessage("Inventário iniciado. O esperado foi congelado como snapshot para detectar movimentações concorrentes.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function saveLine(count: RuntimeInventoryCount, stockItemId: EntityId) {
    const line = count.lines.find((candidate) => candidate.stockItemId === stockItemId);
    if (!line) return;
    const key = `${count.id}:${stockItemId}`;
    const draft = drafts[key] ?? {
      quantity: line.countedQuantity?.toDecimal() ?? "",
      cost: line.adjustmentUnitCost?.toDecimal() ?? "",
    };
    setSavingKey(`line:${key}`);
    setMessage(null);
    try {
      await gateway.setLine({
        organizationId: workspace.organizationId,
        inventoryCountId: count.id,
        stockItemId,
        countedQuantity: draft.quantity,
        adjustmentUnitCost: draft.cost || undefined,
      });
      await refresh();
      setMessage("Contagem salva.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function confirm(countId: EntityId) {
    setSavingKey(`confirm:${countId}`);
    setMessage(null);
    try {
      await gateway.confirm(workspace.organizationId, countId);
      await refresh();
      setMessage("Inventário confirmado. Diferenças foram convertidas em movimentos de ajuste auditados.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function cancel(countId: EntityId) {
    setSavingKey(`cancel:${countId}`);
    setMessage(null);
    try {
      await gateway.cancel(workspace.organizationId, countId);
      await refresh();
      setMessage("Inventário cancelado. Nenhum ajuste de estoque foi criado.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  const openCounts = counts.filter((count) => count.status === "counting");
  const history = counts.filter((count) => count.status !== "counting");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Inventário persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inventário físico</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Cada sessão congela quantidade e custo esperados. Se o estoque mudar antes da confirmação, a sessão é rejeitada como stale e nenhum ajuste parcial é aplicado.
        </p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      {canManage && (
        <form onSubmit={startCount} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm font-medium">
            Local a inventariar
            <select required value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Selecione</option>
              {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
            </select>
          </label>
          <button disabled={savingKey !== null || !locationId} type="submit" className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {savingKey === "start" ? "Iniciando..." : "Iniciar inventário"}
          </button>
        </form>
      )}

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Em contagem</h2><p className="text-sm text-neutral-500">Salve cada linha antes de confirmar.</p></div>
        {loading && openCounts.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Carregando inventários...</p>}
        {!loading && openCounts.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhum inventário em andamento.</p>}

        {openCounts.map((count) => {
          const location = locationById.get(count.stockLocationId);
          const countedLines = count.lines.filter((line) => line.countedQuantity !== undefined).length;
          return (
            <article key={count.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 p-5">
                <div>
                  <h3 className="font-semibold">{location ? `${location.unitName} — ${location.name}` : "Local indisponível"}</h3>
                  <p className="mt-1 text-xs text-neutral-500">Iniciado em {new Date(count.startedAt).toLocaleString("pt-BR")} · {countedLines}/{count.lines.length} linhas salvas</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Contando</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Esperado</th><th className="px-4 py-3 font-medium">Custo esperado</th><th className="px-4 py-3 font-medium">Contado</th><th className="px-4 py-3 font-medium">Custo ajuste</th><th className="px-4 py-3 font-medium">Ação</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">
                    {count.lines.map((line) => {
                      const item = itemById.get(line.stockItemId);
                      const key = `${count.id}:${line.stockItemId}`;
                      const draft = drafts[key] ?? { quantity: line.countedQuantity?.toDecimal() ?? "", cost: line.adjustmentUnitCost?.toDecimal() ?? "" };
                      const countedNumber = numeric(draft.quantity);
                      const expectedNumber = Number(line.expectedQuantity.toDecimal());
                      const positive = countedNumber !== null && countedNumber > expectedNumber;
                      const trackedPositive = positive && Boolean(item?.trackBatch || item?.trackExpiration);
                      const costRequired = positive && expectedNumber <= 0 && !trackedPositive;
                      return (
                        <tr key={line.id} className={trackedPositive ? "bg-rose-50/50" : undefined}>
                          <td className="px-4 py-3"><p className="font-medium">{item?.name ?? "Produto indisponível"}</p>{trackedPositive && <p className="mt-1 max-w-xs text-xs text-rose-700">Aumento em item rastreado exige lote explícito; esta versão não inventa lote/validade.</p>}</td>
                          <td className="px-4 py-3 font-semibold">{line.expectedQuantity.toDecimal()}</td>
                          <td className="px-4 py-3">R$ {line.expectedAverageCost.toDecimal().replace(".", ",")}</td>
                          <td className="px-4 py-3"><input disabled={!canManage} inputMode="decimal" aria-label={`Contagem de ${item?.name ?? line.stockItemId}`} value={draft.quantity} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))} className="w-28 rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100" /></td>
                          <td className="px-4 py-3"><input disabled={!canManage || !positive || trackedPositive} inputMode="decimal" placeholder={costRequired ? "Obrigatório" : "Opcional"} aria-label={`Custo de ajuste de ${item?.name ?? line.stockItemId}`} value={draft.cost} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, cost: event.target.value } }))} className="w-32 rounded-lg border border-neutral-300 px-3 py-2 disabled:bg-neutral-100" /></td>
                          <td className="px-4 py-3"><button disabled={!canManage || savingKey !== null || !draft.quantity.trim()} type="button" onClick={() => saveLine(count, line.stockItemId)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">{savingKey === `line:${key}` ? "Salvando..." : "Salvar"}</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {canManage && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 p-4">
                  <button disabled={savingKey !== null} type="button" onClick={() => cancel(count.id)} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">{savingKey === `cancel:${count.id}` ? "Cancelando..." : "Cancelar sessão"}</button>
                  <button disabled={savingKey !== null || countedLines !== count.lines.length} type="button" onClick={() => confirm(count.id)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingKey === `confirm:${count.id}` ? "Confirmando..." : "Confirmar inventário"}</button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section>
        <div className="mb-3"><h2 className="text-lg font-semibold">Histórico recente</h2><p className="text-sm text-neutral-500">Sessões confirmadas ou canceladas permanecem rastreáveis.</p></div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Início</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Linhas</th></tr></thead><tbody className="divide-y divide-neutral-100">{history.slice(0, 10).map((count) => { const location = locationById.get(count.stockLocationId); return <tr key={count.id}><td className="px-4 py-3 font-medium">{location ? `${location.unitName} — ${location.name}` : "Local indisponível"}</td><td className="px-4 py-3 text-neutral-600">{new Date(count.startedAt).toLocaleString("pt-BR")}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${count.status === "confirmed" ? "bg-emerald-50 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>{count.status === "confirmed" ? "Confirmado" : "Cancelado"}</span></td><td className="px-4 py-3">{count.lines.length}</td></tr>; })}{!loading && history.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-500">Nenhum inventário finalizado ainda.</td></tr>}</tbody></table></div>
        </div>
      </section>
    </div>
  );
}
