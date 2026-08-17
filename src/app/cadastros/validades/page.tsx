"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { classifyExpiry, ExpiryStatus, sortBatchesFefo } from "@/modules/inventory/domain/expiry";
import { useDemoWorkspace } from "@/modules/master-data/ui/demo-workspace-provider";

const statusLabels: Record<ExpiryStatus, string> = {
  unknown: "Sem validade informada",
  expired: "Vencido",
  within_7_days: "Vence em até 7 dias",
  within_15_days: "Vence em até 15 dias",
  within_30_days: "Vence em até 30 dias",
  later: "Acima de 30 dias",
};

const statusClasses: Record<ExpiryStatus, string> = {
  unknown: "bg-amber-50 text-amber-800",
  expired: "bg-red-50 text-red-700",
  within_7_days: "bg-orange-50 text-orange-700",
  within_15_days: "bg-yellow-50 text-yellow-800",
  within_30_days: "bg-blue-50 text-blue-700",
  later: "bg-emerald-50 text-emerald-700",
};

export default function ValidadesPage() {
  const workspace = useDemoWorkspace();
  const [form, setForm] = useState({
    stockItemId: "",
    stockLocationId: "",
    quantity: "",
    unitCost: "",
    batchCode: "",
    expirationDate: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const itemUnits = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const visibleBatches = sortBatchesFefo(workspace.batches.filter((batch) => batch.remainingQuantity.isPositive()));
  const trackedItems = workspace.stockItems.filter((item) => item.active && (item.trackBatch || item.trackExpiration));
  const selectedItem = trackedItems.find((item) => item.id === form.stockItemId);

  const summary = visibleBatches.reduce<Record<ExpiryStatus, number>>(
    (accumulator, batch) => {
      accumulator[classifyExpiry(batch.expirationDate)] += 1;
      return accumulator;
    },
    { unknown: 0, expired: 0, within_7_days: 0, within_15_days: 0, within_30_days: 0, later: 0 },
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      await workspace.recordEntry({
        stockItemId: form.stockItemId as EntityId,
        stockLocationId: form.stockLocationId as EntityId,
        quantity: form.quantity,
        unitCost: form.unitCost,
        batchCode: form.batchCode || undefined,
        expirationDate: form.expirationDate || undefined,
        notes: "Entrada com lote/validade",
      });
      setForm({ stockItemId: "", stockLocationId: "", quantity: "", unitCost: "", batchCode: "", expirationDate: "" });
      setMessage("Entrada com lote registrada.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-neutral-500">Rastreabilidade física</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Lotes e validades</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Validade pertence à quantidade/lote em um local. A ordem exibida prioriza FEFO: primeiro o que vence primeiro; lotes sem data ficam por último.
        </p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Vencidos" value={summary.expired} emphasis="critical" />
        <SummaryCard label="Até 7 dias" value={summary.within_7_days} emphasis="warning" />
        <SummaryCard label="8–15 dias" value={summary.within_15_days} />
        <SummaryCard label="16–30 dias" value={summary.within_30_days} />
        <SummaryCard label="Sem validade" value={summary.unknown} emphasis="warning" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="font-semibold">Lotes com saldo</h2>
            <p className="mt-1 text-xs text-neutral-500">A posição FEFO é apenas recomendação nesta fase; o domínio permite selecionar outro lote explicitamente.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Prioridade</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                  <th className="px-4 py-3 font-medium">Validade</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {visibleBatches.map((batch, index) => {
                  const status = classifyExpiry(batch.expirationDate);
                  return (
                    <tr key={batch.id}>
                      <td className="px-4 py-3 font-semibold">#{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{itemNames.get(batch.stockItemId) ?? "Item desconhecido"}</td>
                      <td className="px-4 py-3 text-neutral-600">{locationNames.get(batch.stockLocationId) ?? batch.stockLocationId}</td>
                      <td className="px-4 py-3">{batch.batchCode ?? "Sem identificação"}</td>
                      <td className="px-4 py-3 font-semibold">{batch.remainingQuantity.toDecimal()} {itemUnits.get(batch.stockItemId)}</td>
                      <td className="px-4 py-3">{batch.expirationDate ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${batch.expirationDate}T00:00:00.000Z`)) : "—"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[status]}`}>{statusLabels[status]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Entrada com lote</h2>
            <p className="mt-1 text-xs text-neutral-500">Use quando lote e/ou validade forem conhecidos no recebimento.</p>
          </div>
          <label className="block text-sm font-medium">Produto
            <select required value={form.stockItemId} onChange={(event) => setForm({ ...form, stockItemId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Selecione</option>
              {trackedItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Local
            <select required value={form.stockLocationId} onChange={(event) => setForm({ ...form, stockLocationId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Selecione</option>
              {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <TextInput label="Quantidade" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} />
            <TextInput label="Custo unitário" value={form.unitCost} onChange={(value) => setForm({ ...form, unitCost: value })} />
          </div>
          <TextInput label={`Código do lote${selectedItem?.trackBatch ? "" : " (opcional)"}`} value={form.batchCode} onChange={(value) => setForm({ ...form, batchCode: value })} required={selectedItem?.trackBatch ?? false} />
          <label className="block text-sm font-medium">Validade{selectedItem?.trackExpiration ? "" : " (opcional)"}
            <input type="date" required={selectedItem?.trackExpiration ?? false} value={form.expirationDate} onChange={(event) => setForm({ ...form, expirationDate: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
          </label>
          <button className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">Registrar lote</button>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, emphasis }: { label: string; value: number; emphasis?: "critical" | "warning" }) {
  const classes = emphasis === "critical" ? "border-red-200 bg-red-50" : emphasis === "warning" ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white";
  return <article className={`rounded-2xl border p-4 shadow-sm ${classes}`}><p className="text-xs font-medium text-neutral-600">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></article>;
}

function TextInput({ label, value, onChange, required = true }: { label: string; value: string; onChange(value: string): void; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>;
}
