"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function RuntimeStockPage() {
  const workspace = useRuntimeWorkspace();
  const [entry, setEntry] = useState({
    stockItemId: "",
    stockLocationId: "",
    quantity: "",
    unitCost: "",
    batchCode: "",
    expirationDate: "",
    notes: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const itemUnits = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await workspace.recordEntry({
        stockItemId: entry.stockItemId as EntityId,
        stockLocationId: entry.stockLocationId as EntityId,
        quantity: entry.quantity,
        unitCost: entry.unitCost,
        batchCode: entry.batchCode || undefined,
        expirationDate: entry.expirationDate || undefined,
        notes: entry.notes || undefined,
      });
      setEntry({ stockItemId: "", stockLocationId: "", quantity: "", unitCost: "", batchCode: "", expirationDate: "", notes: "" });
      setMessage("Entrada persistida. Movimento, saldo, custo médio, lote e auditoria foram processados atomicamente.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Ledger persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Estoque</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">O saldo é somente leitura. A entrada usa o RPC transacional e idempotente do PostgreSQL; não há edição direta das tabelas do ledger.</p>
      </header>
      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <section>
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Saldos atuais</h2><p className="text-sm text-neutral-500">Custo médio por produto e local.</p></div><span className="text-xs text-neutral-500">{workspace.balances.length} combinações</span></div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Saldo</th><th className="px-4 py-3 font-medium">Custo médio</th></tr></thead><tbody className="divide-y divide-neutral-100">{workspace.balances.map((balance) => <tr key={`${balance.stockLocationId}:${balance.stockItemId}`}><td className="px-4 py-3 font-medium">{itemNames.get(balance.stockItemId) ?? "Item desconhecido"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(balance.stockLocationId) ?? "Local indisponível"}</td><td className="px-4 py-3 font-semibold">{balance.quantity.toDecimal()} {itemUnits.get(balance.stockItemId) ?? ""}</td><td className="px-4 py-3">R$ {balance.averageCost.toDecimal().replace(".", ",")}</td></tr>)}{workspace.balances.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-500">Ainda não há saldos nesta organização.</td></tr>}</tbody></table></div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        {workspace.permissions.recordStockEntry ? (
          <form onSubmit={submitEntry} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div><h2 className="text-lg font-semibold">Registrar entrada</h2><p className="mt-1 text-xs text-neutral-500">A operação recalcula custo médio sob lock e usa um command ID para idempotência.</p></div>
            <label className="block text-sm font-medium">Produto<select required value={entry.stockItemId} onChange={(event) => setEntry({ ...entry, stockItemId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Destino<select required value={entry.stockLocationId} onChange={(event) => setEntry({ ...entry, stockLocationId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Quantidade<input required inputMode="decimal" value={entry.quantity} onChange={(event) => setEntry({ ...entry, quantity: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">Custo unitário (R$)<input required inputMode="decimal" value={entry.unitCost} onChange={(event) => setEntry({ ...entry, unitCost: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Lote (opcional)<input value={entry.batchCode} onChange={(event) => setEntry({ ...entry, batchCode: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">Validade (opcional)<input type="date" value={entry.expirationDate} onChange={(event) => setEntry({ ...entry, expirationDate: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label></div>
            <label className="block text-sm font-medium">Observação (opcional)<textarea value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} rows={3} className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <button disabled={saving || workspace.stockItems.length === 0 || workspace.stockLocations.length === 0} type="submit" className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Registrando..." : "Registrar entrada"}</button>
          </form>
        ) : <aside className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm"><h2 className="font-semibold text-neutral-900">Entrada não autorizada</h2><p className="mt-1">Seu perfil pode consultar o estoque, mas não possui papel permitido pelo RPC de entrada.</p></aside>}

        <aside className="h-fit rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <h2 className="font-semibold">Demais movimentos</h2>
          <p className="mt-1">Retirada, transferência, recebimento e inventário não aparecem aqui ainda. Mantê-los fora do workspace real impede que uma ação pareça persistente quando ainda usa apenas memória.</p>
        </aside>
      </section>
    </div>
  );
}
