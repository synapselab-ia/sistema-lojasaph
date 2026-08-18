"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function RuntimeTransfersPage() {
  const workspace = useRuntimeWorkspace();
  const [dispatch, setDispatch] = useState({
    stockItemId: "",
    sourceLocationId: "",
    destinationLocationId: "",
    quantity: "",
    preferredBatchId: "",
    notes: "",
  });
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const locationNames = useMemo(
    () => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])),
    [workspace.stockLocations],
  );
  const selectedItem = workspace.stockItems.find((item) => item.id === dispatch.stockItemId);
  const dispatchBatches = workspace.batches.filter(
    (batch) => batch.stockItemId === dispatch.stockItemId && batch.stockLocationId === dispatch.sourceLocationId,
  );
  const openTransfers = workspace.transfers.filter((transfer) => transfer.status !== "received");
  const receivedTransfers = workspace.transfers.filter((transfer) => transfer.status === "received").slice(0, 10);

  async function submitDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey("dispatch");
    setMessage(null);
    try {
      await workspace.dispatchTransfer({
        stockItemId: dispatch.stockItemId as EntityId,
        sourceLocationId: dispatch.sourceLocationId as EntityId,
        destinationLocationId: dispatch.destinationLocationId as EntityId,
        quantity: dispatch.quantity,
        preferredBatchId: dispatch.preferredBatchId ? (dispatch.preferredBatchId as EntityId) : undefined,
        notes: dispatch.notes || undefined,
      });
      setDispatch({ stockItemId: "", sourceLocationId: "", destinationLocationId: "", quantity: "", preferredBatchId: "", notes: "" });
      setMessage("Transferência expedida. A origem foi reduzida; o destino só será creditado no recebimento.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function receive(transferId: EntityId) {
    setSavingKey(`receive:${transferId}`);
    setMessage(null);
    try {
      const quantity = receiveQuantities[transferId]?.trim() || undefined;
      await workspace.receiveTransfer({ transferId, quantity });
      setReceiveQuantities((current) => ({ ...current, [transferId]: "" }));
      setMessage(quantity ? "Recebimento parcial registrado." : "Saldo pendente da transferência recebido integralmente.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Transferência persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Transferências entre estoques</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Expedição e recebimento são transações separadas. O despacho reduz apenas a origem; o destino recebe saldo, custo e lote somente quando a mercadoria é efetivamente recebida.
        </p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <section className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        {workspace.permissions.manageStockTransfers ? (
          <form onSubmit={submitDispatch} className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold">Expedir transferência</h2>
              <p className="mt-1 text-xs leading-5 text-neutral-500">A origem precisa possuir estoque físico suficiente. Estoque negativo nunca é usado para transferir mercadoria inexistente.</p>
            </div>

            <label className="block text-sm font-medium">
              Produto
              <select required value={dispatch.stockItemId} onChange={(event) => setDispatch({ ...dispatch, stockItemId: event.target.value, preferredBatchId: "" })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
                <option value="">Selecione</option>
                {workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Origem
              <select required value={dispatch.sourceLocationId} onChange={(event) => setDispatch({ ...dispatch, sourceLocationId: event.target.value, destinationLocationId: event.target.value === dispatch.destinationLocationId ? "" : dispatch.destinationLocationId, preferredBatchId: "" })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
                <option value="">Selecione</option>
                {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Destino
              <select required value={dispatch.destinationLocationId} onChange={(event) => setDispatch({ ...dispatch, destinationLocationId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
                <option value="">Selecione</option>
                {workspace.stockLocations.filter((location) => location.id !== dispatch.sourceLocationId).map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Quantidade
              <input required inputMode="decimal" value={dispatch.quantity} onChange={(event) => setDispatch({ ...dispatch, quantity: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
            </label>

            {(selectedItem?.trackBatch || selectedItem?.trackExpiration) && (
              <label className="block text-sm font-medium">
                Lote preferido (opcional)
                <select value={dispatch.preferredBatchId} onChange={(event) => setDispatch({ ...dispatch, preferredBatchId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">
                  <option value="">Automático — FEFO</option>
                  {dispatchBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchCode || "Lote sem código"} · {batch.expirationDate ? `validade ${batch.expirationDate}` : "validade desconhecida"} · saldo {batch.remainingQuantity.toDecimal()}</option>)}
                </select>
              </label>
            )}

            <label className="block text-sm font-medium">
              Observação (opcional)
              <textarea rows={3} value={dispatch.notes} onChange={(event) => setDispatch({ ...dispatch, notes: event.target.value })} className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
            </label>

            <button disabled={savingKey !== null || workspace.stockItems.length === 0 || workspace.stockLocations.length < 2} type="submit" className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {savingKey === "dispatch" ? "Expedindo..." : "Expedir transferência"}
            </button>
          </form>
        ) : (
          <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm">
            <h2 className="font-semibold text-neutral-900">Transferência não autorizada</h2>
            <p className="mt-1">Seu perfil pode consultar as transferências, mas não possui papel autorizado para expedição/recebimento.</p>
          </aside>
        )}

        <div className="space-y-6">
          <section>
            <div className="mb-3">
              <h2 className="text-xl font-semibold">Em trânsito</h2>
              <p className="text-sm text-neutral-500">Receba tudo que está pendente ou informe uma quantidade para recebimento parcial.</p>
            </div>
            <div className="space-y-3">
              {openTransfers.map((transfer) => {
                const pending = transfer.dispatchedQuantity.subtract(transfer.receivedQuantity);
                return (
                  <article key={transfer.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{itemNames.get(transfer.stockItemId) ?? "Produto indisponível"}</h3>
                        <p className="mt-1 text-sm text-neutral-600">{locationNames.get(transfer.sourceLocationId) ?? "Origem"} → {locationNames.get(transfer.destinationLocationId) ?? "Destino"}</p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{transfer.status === "partially_received" ? "Parcial" : "Em trânsito"}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-neutral-50 p-3 text-sm">
                      <div><p className="text-xs text-neutral-500">Expedido</p><p className="mt-1 font-semibold">{transfer.dispatchedQuantity.toDecimal()}</p></div>
                      <div><p className="text-xs text-neutral-500">Recebido</p><p className="mt-1 font-semibold">{transfer.receivedQuantity.toDecimal()}</p></div>
                      <div><p className="text-xs text-neutral-500">Pendente</p><p className="mt-1 font-semibold">{pending.toDecimal()}</p></div>
                    </div>
                    {workspace.permissions.manageStockTransfers && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <input aria-label={`Quantidade a receber da transferência ${transfer.id}`} inputMode="decimal" placeholder={`Em branco = ${pending.toDecimal()}`} value={receiveQuantities[transfer.id] ?? ""} onChange={(event) => setReceiveQuantities((current) => ({ ...current, [transfer.id]: event.target.value }))} className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
                        <button type="button" disabled={savingKey !== null} onClick={() => receive(transfer.id)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          {savingKey === `receive:${transfer.id}` ? "Recebendo..." : "Registrar recebimento"}
                        </button>
                      </div>
                    )}
                    {transfer.notes && <p className="mt-3 text-xs text-neutral-500">Obs.: {transfer.notes}</p>}
                  </article>
                );
              })}
              {openTransfers.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhuma transferência em trânsito.</p>}
            </div>
          </section>

          {receivedTransfers.length > 0 && (
            <section>
              <div className="mb-3"><h2 className="text-lg font-semibold">Recebidas recentemente</h2><p className="text-sm text-neutral-500">Histórico operacional recente carregado por RLS.</p></div>
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Origem</th><th className="px-4 py-3 font-medium">Destino</th><th className="px-4 py-3 font-medium">Quantidade</th></tr></thead>
                    <tbody className="divide-y divide-neutral-100">{receivedTransfers.map((transfer) => <tr key={transfer.id}><td className="px-4 py-3 font-medium">{itemNames.get(transfer.stockItemId) ?? "Produto indisponível"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(transfer.sourceLocationId) ?? "—"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(transfer.destinationLocationId) ?? "—"}</td><td className="px-4 py-3">{transfer.receivedQuantity.toDecimal()}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      <aside className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
        <h2 className="font-semibold">Ledger persistente</h2>
        <p className="mt-1">Transferências e inventário físico já operam no workspace persistente com commands PostgreSQL transacionais e auditados.</p>
      </aside>
    </div>
  );
}
