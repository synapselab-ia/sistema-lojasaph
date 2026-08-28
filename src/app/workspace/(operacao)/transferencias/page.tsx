"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge, Textarea } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function RuntimeTransfersPage() {
  const workspace = useRuntimeWorkspace();
  const [dispatch, setDispatch] = useState({ stockItemId: "", sourceLocationId: "", destinationLocationId: "", quantity: "", preferredBatchId: "", notes: "" });
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const selectedItem = workspace.stockItems.find((item) => item.id === dispatch.stockItemId);
  const dispatchBatches = workspace.batches.filter((batch) => batch.stockItemId === dispatch.stockItemId && batch.stockLocationId === dispatch.sourceLocationId);
  const openTransfers = workspace.transfers.filter((transfer) => transfer.status !== "received");
  const receivedTransfers = workspace.transfers.filter((transfer) => transfer.status === "received").slice(0, 10);

  async function submitDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey("dispatch");
    setFeedback(null);
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
      setFeedback({ tone: "success", text: "Transferência expedida. O destino será atualizado quando o recebimento for registrado." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSavingKey(null);
    }
  }

  async function receive(transferId: EntityId) {
    setSavingKey(`receive:${transferId}`);
    setFeedback(null);
    try {
      const quantity = receiveQuantities[transferId]?.trim() || undefined;
      await workspace.receiveTransfer({ transferId, quantity });
      setReceiveQuantities((current) => ({ ...current, [transferId]: "" }));
      setFeedback({ tone: "success", text: quantity ? "Recebimento parcial registrado." : "Saldo pendente recebido integralmente." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Transferências"
        title="Transferências entre locais"
        description="Expedir e receber são etapas separadas. A origem é reduzida na expedição e o destino só recebe a quantidade efetivamente confirmada."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        {workspace.permissions.manageStockTransfers ? (
          <Panel className="h-fit">
            <form onSubmit={submitDispatch} className="space-y-4">
              <div><h2 className="text-lg font-semibold">Expedir transferência</h2><p className="mt-1 text-sm text-neutral-600">Escolha locais diferentes e informe a quantidade a enviar.</p></div>
              <FormField id="transfer-item" label="Produto" required>
                {(props) => <Select {...props} required value={dispatch.stockItemId} onChange={(event) => setDispatch({ ...dispatch, stockItemId: event.target.value, preferredBatchId: "" })}><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>}
              </FormField>
              <FormField id="transfer-source" label="Origem" required>
                {(props) => <Select {...props} required value={dispatch.sourceLocationId} onChange={(event) => setDispatch({ ...dispatch, sourceLocationId: event.target.value, destinationLocationId: event.target.value === dispatch.destinationLocationId ? "" : dispatch.destinationLocationId, preferredBatchId: "" })}><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</Select>}
              </FormField>
              <FormField id="transfer-destination" label="Destino" required>
                {(props) => <Select {...props} required value={dispatch.destinationLocationId} onChange={(event) => setDispatch({ ...dispatch, destinationLocationId: event.target.value })}><option value="">Selecione</option>{workspace.stockLocations.filter((location) => location.id !== dispatch.sourceLocationId).map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</Select>}
              </FormField>
              <FormField id="transfer-quantity" label="Quantidade" required>
                {(props) => <Input {...props} required inputMode="decimal" value={dispatch.quantity} onChange={(event) => setDispatch({ ...dispatch, quantity: event.target.value })} />}
              </FormField>
              {(selectedItem?.trackBatch || selectedItem?.trackExpiration) && (
                <FormField id="transfer-batch" label="Lote preferido" hint="Opcional. Sem escolha, permanece a seleção automática já implementada.">
                  {(props) => <Select {...props} value={dispatch.preferredBatchId} onChange={(event) => setDispatch({ ...dispatch, preferredBatchId: event.target.value })}><option value="">Seleção automática</option>{dispatchBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchCode || "Lote sem código"} · {batch.expirationDate ? `validade ${batch.expirationDate}` : "sem validade registrada"} · saldo {batch.remainingQuantity.toDecimal()}</option>)}</Select>}
                </FormField>
              )}
              <FormField id="transfer-notes" label="Observação">
                {(props) => <Textarea {...props} rows={3} value={dispatch.notes} onChange={(event) => setDispatch({ ...dispatch, notes: event.target.value })} />}
              </FormField>
              <Button type="submit" block loading={savingKey === "dispatch"} disabled={savingKey !== null || workspace.stockItems.length === 0 || workspace.stockLocations.length < 2}>Expedir transferência</Button>
            </form>
          </Panel>
        ) : (
          <Panel tone="attention" className="h-fit"><h2 className="font-semibold">Transferência indisponível para este perfil</h2><p className="mt-1 text-sm leading-6">Você pode consultar as transferências visíveis, mas não possui permissão para expedir ou receber.</p></Panel>
        )}

        <section className="space-y-4">
          <div><h2 className="text-xl font-semibold">Em trânsito</h2><p className="text-sm text-neutral-600">Receba todo o saldo pendente ou informe uma quantidade para recebimento parcial.</p></div>
          {openTransfers.length === 0 ? (
            <EmptyState title="Nenhuma transferência em trânsito" description="Transferências expedidas aparecerão aqui até o recebimento completo." />
          ) : (
            <div className="space-y-3">
              {openTransfers.map((transfer) => {
                const pending = transfer.dispatchedQuantity.subtract(transfer.receivedQuantity);
                return (
                  <Panel key={transfer.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h3 className="font-semibold">{itemNames.get(transfer.stockItemId) ?? "Produto indisponível"}</h3><p className="mt-1 text-sm text-neutral-600">{locationNames.get(transfer.sourceLocationId) ?? "Origem"} → {locationNames.get(transfer.destinationLocationId) ?? "Destino"}</p></div>
                      <StatusBadge tone="attention">{transfer.status === "partially_received" ? "Recebido parcialmente" : "Em trânsito"}</StatusBadge>
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-neutral-50 p-3 text-sm">
                      <Summary label="Expedido" value={transfer.dispatchedQuantity.toDecimal()} />
                      <Summary label="Recebido" value={transfer.receivedQuantity.toDecimal()} />
                      <Summary label="Pendente" value={pending.toDecimal()} />
                    </dl>
                    {workspace.permissions.manageStockTransfers && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Input aria-label="Quantidade a receber" inputMode="decimal" placeholder={`Em branco = ${pending.toDecimal()}`} value={receiveQuantities[transfer.id] ?? ""} onChange={(event) => setReceiveQuantities((current) => ({ ...current, [transfer.id]: event.target.value }))} />
                        <Button type="button" loading={savingKey === `receive:${transfer.id}`} disabled={savingKey !== null} onClick={() => void receive(transfer.id)}>Registrar recebimento</Button>
                      </div>
                    )}
                    {transfer.notes && <p className="mt-3 text-sm text-neutral-600">{transfer.notes}</p>}
                  </Panel>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Recebidas recentemente</h2><p className="text-sm text-neutral-600">Transferências concluídas mais recentes.</p></div>
        {receivedTransfers.length === 0 ? (
          <EmptyState title="Nenhuma transferência recebida" description="O histórico aparecerá aqui após o primeiro recebimento completo." />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
              <table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Origem</th><th className="px-4 py-3 font-medium">Destino</th><th className="px-4 py-3 font-medium">Quantidade</th></tr></thead><tbody className="divide-y divide-neutral-100">{receivedTransfers.map((transfer) => <tr key={transfer.id}><td className="px-4 py-3 font-medium">{itemNames.get(transfer.stockItemId) ?? "Produto indisponível"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(transfer.sourceLocationId) ?? "—"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(transfer.destinationLocationId) ?? "—"}</td><td className="px-4 py-3 font-semibold">{transfer.receivedQuantity.toDecimal()}</td></tr>)}</tbody></table>
            </div>
            <div className="grid gap-3 md:hidden">
              {receivedTransfers.map((transfer) => <Panel key={transfer.id} padding="sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{itemNames.get(transfer.stockItemId) ?? "Produto indisponível"}</h3><p className="mt-1 text-sm text-neutral-600">{locationNames.get(transfer.sourceLocationId) ?? "Origem"} → {locationNames.get(transfer.destinationLocationId) ?? "Destino"}</p></div><span className="font-semibold">{transfer.receivedQuantity.toDecimal()}</span></div></Panel>)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>;
}
