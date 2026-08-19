"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function StockLossesPage() {
  const workspace = useRuntimeWorkspace();
  const [form, setForm] = useState({
    stockItemId: "",
    stockLocationId: "",
    quantity: "",
    reasonCode: "",
    preferredBatchId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const reasonLabels = useMemo(() => new Map(workspace.stockLossReasons.map((reason) => [reason.code, reason.label])), [workspace.stockLossReasons]);
  const activeReasons = workspace.stockLossReasons.filter((reason) => reason.active);
  const selectedReason = activeReasons.find((reason) => reason.code === form.reasonCode);
  const selectedItem = workspace.stockItems.find((item) => item.id === form.stockItemId);
  const trackedItem = Boolean(selectedItem?.trackBatch || selectedItem?.trackExpiration);
  const candidateBatches = workspace.batches.filter((batch) => batch.stockItemId === form.stockItemId && batch.stockLocationId === form.stockLocationId);
  const today = new Date().toISOString().slice(0, 10);
  const batchOptions = selectedReason?.movementType === "expiration"
    ? candidateBatches.filter((batch) => batch.expirationDate && batch.expirationDate <= today)
    : candidateBatches;
  const expirationNeedsBatch = selectedReason?.movementType === "expiration" && trackedItem;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await workspace.recordStockLoss({
        stockItemId: form.stockItemId as EntityId,
        stockLocationId: form.stockLocationId as EntityId,
        quantity: form.quantity,
        reasonCode: form.reasonCode,
        preferredBatchId: form.preferredBatchId ? (form.preferredBatchId as EntityId) : undefined,
        notes: form.notes || undefined,
      });
      setForm({ stockItemId: "", stockLocationId: "", quantity: "", reasonCode: "", preferredBatchId: "", notes: "" });
      setMessage("Baixa persistida. Saldo, lote, custo, movimento e auditoria foram processados atomicamente.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-amber-700">Ledger de estoque</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Perdas, quebras e vencimentos</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Toda baixa gera movimento rastreável com motivo estruturado. O saldo não é editado diretamente; custo e lotes seguem as mesmas travas transacionais do fluxo de retirada.
        </p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      {workspace.permissions.recordStockLoss ? (
        <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold">Registrar baixa</h2>
            <p className="mt-1 text-xs text-neutral-500">O banco deriva `loss` ou `expiration` do motivo configurado. Para vencimento de item rastreado, o lote vencido é obrigatório.</p>
          </div>

          <label className="block text-sm font-medium">Motivo
            <select required value={form.reasonCode} onChange={(event) => setForm({ ...form, reasonCode: event.target.value, preferredBatchId: "" })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Selecione</option>
              {activeReasons.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium">Produto
            <select required value={form.stockItemId} onChange={(event) => setForm({ ...form, stockItemId: event.target.value, preferredBatchId: "" })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Selecione</option>
              {workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium">Local de estoque
            <select required value={form.stockLocationId} onChange={(event) => setForm({ ...form, stockLocationId: event.target.value, preferredBatchId: "" })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
              <option value="">Selecione</option>
              {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium">Quantidade
            <input required inputMode="decimal" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
          </label>

          {trackedItem && (
            <label className="block text-sm font-medium lg:col-span-2">{expirationNeedsBatch ? "Lote vencido" : "Lote preferido (opcional)"}
              <select required={expirationNeedsBatch} value={form.preferredBatchId} onChange={(event) => setForm({ ...form, preferredBatchId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
                <option value="">{expirationNeedsBatch ? "Selecione o lote vencido" : "Automático — FEFO"}</option>
                {batchOptions.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchCode || "Lote sem código"} · {batch.expirationDate ? `validade ${batch.expirationDate}` : "validade desconhecida"} · saldo {batch.remainingQuantity.toDecimal()}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-neutral-500">
                Vencimento só aceita lote rastreado com validade já atingida. Outras baixas usam o lote escolhido primeiro e FEFO no restante.
              </span>
            </label>
          )}

          <label className="block text-sm font-medium lg:col-span-2">Observação complementar (opcional)
            <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
          </label>

          <button disabled={saving || activeReasons.length === 0 || workspace.stockItems.length === 0 || workspace.stockLocations.length === 0} type="submit" className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 lg:col-span-2">
            {saving ? "Registrando..." : "Registrar baixa"}
          </button>
        </form>
      ) : (
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Baixa não autorizada</h2>
          <p className="mt-1">Seu perfil pode consultar dados permitidos pelo escopo, mas não possui papel autorizado para registrar perdas de estoque.</p>
        </aside>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold">Histórico recente</h2><p className="text-sm text-neutral-500">Últimas perdas e baixas por vencimento visíveis no seu escopo.</p></div>
          <span className="text-xs text-neutral-500">{workspace.stockLosses.length} movimentos</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Motivo</th><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Quantidade</th><th className="px-4 py-3 font-medium">Custo</th><th className="px-4 py-3 font-medium">Observação</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {workspace.stockLosses.map((loss) => (
                  <tr key={loss.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(loss.occurredAt).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3"><span className="font-medium">{reasonLabels.get(loss.reasonCode) ?? loss.reasonCode}</span><span className="ml-2 text-xs text-neutral-400">{loss.movementType}</span></td>
                    <td className="px-4 py-3">{itemNames.get(loss.stockItemId) ?? "Item indisponível"}</td>
                    <td className="px-4 py-3">{locationNames.get(loss.stockLocationId) ?? "Local indisponível"}</td>
                    <td className="px-4 py-3 font-semibold">{loss.quantity.toDecimal()}</td>
                    <td className="px-4 py-3">R$ {loss.unitCostSnapshot.toDecimal().replace(".", ",")}</td>
                    <td className="px-4 py-3 text-neutral-600">{loss.notes || "—"}</td>
                  </tr>
                ))}
                {workspace.stockLosses.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-500">Ainda não há baixas visíveis neste escopo.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
