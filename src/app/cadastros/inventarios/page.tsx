"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { useDemoWorkspace } from "@/modules/master-data/ui/demo-workspace-provider";

export default function InventariosPage() {
  const workspace = useDemoWorkspace();
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [draftCounts, setDraftCounts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const itemUnits = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const openCount = workspace.inventoryCounts.find((count) => count.status === "counting");
  const confirmedCounts = workspace.inventoryCounts.filter((count) => count.status === "confirmed");

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      await workspace.startInventoryCount(selectedLocationId as EntityId);
      setSelectedLocationId("");
      setDraftCounts({});
      setMessage("Inventário iniciado. O saldo esperado foi congelado como snapshot.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    }
  }

  async function saveAndConfirm() {
    if (!openCount) return;
    setMessage(null);
    try {
      for (const line of openCount.lines) {
        const value = draftCounts[line.stockItemId] ?? line.countedQuantity?.toDecimal() ?? "";
        if (!value.trim()) throw new Error(`Informe a contagem de ${itemNames.get(line.stockItemId) ?? "todos os itens"}.`);
        await workspace.setInventoryCountLine(openCount.id, line.stockItemId, value);
      }
      await workspace.confirmInventoryCount(openCount.id);
      setDraftCounts({});
      setMessage("Inventário confirmado. Diferenças foram registradas como movimentos de ajuste no ledger.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-neutral-500">Conferência física</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Inventários</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          A contagem captura um snapshot do saldo esperado. Se houver qualquer movimentação antes da confirmação, o sistema rejeita a contagem desatualizada para evitar ajustes incorretos.
        </p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      {!openCount && (
        <form onSubmit={start} className="max-w-xl space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-semibold">Iniciar inventário</h2><p className="mt-1 text-xs text-neutral-500">Escolha o local que será contado.</p></div>
          <label className="block text-sm font-medium">Local de estoque
            <select required value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Selecione</option>
              {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">Começar contagem</button>
        </form>
      )}

      {openCount && (
        <section className="rounded-2xl border border-blue-200 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold">Contagem em andamento</h2><p className="mt-1 text-xs text-blue-800">{locationNames.get(openCount.stockLocationId) ?? openCount.stockLocationId}</p></div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Iniciada {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(openCount.startedAt))}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Esperado</th><th className="px-4 py-3 font-medium">Contado</th><th className="px-4 py-3 font-medium">Diferença provisória</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {openCount.lines.map((line) => {
                  const draft = draftCounts[line.stockItemId] ?? line.countedQuantity?.toDecimal() ?? "";
                  const parsed = Number(draft.replace(",", "."));
                  const expected = Number(line.expectedQuantity.toDecimal());
                  const difference = Number.isFinite(parsed) && draft.trim() ? parsed - expected : null;
                  return (
                    <tr key={line.stockItemId}>
                      <td className="px-4 py-3 font-medium">{itemNames.get(line.stockItemId) ?? "Item desconhecido"}</td>
                      <td className="px-4 py-3">{line.expectedQuantity.toDecimal()} {itemUnits.get(line.stockItemId)}</td>
                      <td className="px-4 py-3"><input inputMode="decimal" value={draft} onChange={(event) => setDraftCounts({ ...draftCounts, [line.stockItemId]: event.target.value })} className="w-32 rounded-lg border border-neutral-300 px-3 py-2" /></td>
                      <td className={`px-4 py-3 font-semibold ${difference === null || difference === 0 ? "text-neutral-500" : difference > 0 ? "text-emerald-700" : "text-red-700"}`}>{difference === null ? "—" : `${difference > 0 ? "+" : ""}${difference}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-neutral-200 p-4"><button type="button" onClick={saveAndConfirm} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Salvar contagens e confirmar</button></div>
        </section>
      )}

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Histórico</h2><p className="text-sm text-neutral-500">Inventários confirmados e diferenças registradas.</p></div>
        {confirmedCounts.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {confirmedCounts.map((count) => {
              const differences = count.lines.filter((line) => line.countedQuantity && line.countedQuantity.milliunits !== line.expectedQuantity.milliunits);
              return (
                <article key={count.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{locationNames.get(count.stockLocationId)}</p><p className="mt-1 text-xs text-neutral-500">Confirmado {count.confirmedAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(count.confirmedAt)) : "—"}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Confirmado</span></div>
                  <p className="mt-4 text-sm text-neutral-600">{differences.length} item(ns) com diferença de {count.lines.length} contados.</p>
                </article>
              );
            })}
          </div>
        ) : <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhum inventário confirmado nesta sessão.</p>}
      </section>
    </div>
  );
}
