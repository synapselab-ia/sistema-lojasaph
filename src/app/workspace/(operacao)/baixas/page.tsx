"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function StockLossesPage() {
  const workspace = useRuntimeWorkspace();
  const [form, setForm] = useState({ stockItemId: "", stockLocationId: "", quantity: "", reasonCode: "", preferredBatchId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

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
    setFeedback(null);
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
      setFeedback({ tone: "success", text: "Baixa registrada e a posição de estoque foi atualizada." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Baixas e perdas"
        title="Baixas e perdas"
        description="Registre perda, quebra ou vencimento usando um motivo estruturado. O saldo é alterado somente por esta operação, mantendo o histórico da movimentação."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      {workspace.permissions.recordStockLoss ? (
        <Panel>
          <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
            <FormField id="loss-reason" label="Motivo" required>
              {(props) => <Select {...props} required value={form.reasonCode} onChange={(event) => setForm({ ...form, reasonCode: event.target.value, preferredBatchId: "" })}><option value="">Selecione</option>{activeReasons.map((reason) => <option key={reason.code} value={reason.code}>{reason.label}</option>)}</Select>}
            </FormField>
            <FormField id="loss-item" label="Produto" required>
              {(props) => <Select {...props} required value={form.stockItemId} onChange={(event) => setForm({ ...form, stockItemId: event.target.value, preferredBatchId: "" })}><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>}
            </FormField>
            <FormField id="loss-location" label="Local de estoque" required>
              {(props) => <Select {...props} required value={form.stockLocationId} onChange={(event) => setForm({ ...form, stockLocationId: event.target.value, preferredBatchId: "" })}><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</Select>}
            </FormField>
            <FormField id="loss-quantity" label="Quantidade" required>
              {(props) => <Input {...props} required inputMode="decimal" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />}
            </FormField>

            {trackedItem && (
              <FormField
                id="loss-batch"
                label={expirationNeedsBatch ? "Lote vencido" : "Lote preferido"}
                required={expirationNeedsBatch}
                hint={expirationNeedsBatch ? "Para baixa por vencimento de item rastreado, selecione um lote cuja validade já foi atingida." : "Opcional. Sem escolha, permanece a seleção automática já existente."}
                className="lg:col-span-2"
              >
                {(props) => <Select {...props} required={expirationNeedsBatch} value={form.preferredBatchId} onChange={(event) => setForm({ ...form, preferredBatchId: event.target.value })}><option value="">{expirationNeedsBatch ? "Selecione o lote vencido" : "Seleção automática"}</option>{batchOptions.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchCode || "Lote sem código"} · {batch.expirationDate ? `validade ${batch.expirationDate}` : "sem validade registrada"} · saldo {batch.remainingQuantity.toDecimal()}</option>)}</Select>}
              </FormField>
            )}

            <FormField id="loss-notes" label="Observação" className="lg:col-span-2">
              {(props) => <Textarea {...props} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />}
            </FormField>
            <div className="flex justify-end lg:col-span-2"><Button type="submit" loading={saving} disabled={saving || activeReasons.length === 0}>Registrar baixa</Button></div>
          </form>
        </Panel>
      ) : (
        <Panel tone="attention"><h2 className="font-semibold">Baixa indisponível para este perfil</h2><p className="mt-1 text-sm leading-6">Você pode consultar os registros visíveis, mas não possui permissão para registrar perdas de estoque.</p></Panel>
      )}

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Histórico recente</h2><p className="text-sm text-neutral-600">Últimas baixas e perdas visíveis para sua operação.</p></div>
        {workspace.stockLosses.length === 0 ? (
          <EmptyState title="Nenhuma baixa registrada" description="Os registros aparecerão aqui após a primeira baixa visível." />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Motivo</th><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Quantidade</th><th className="px-4 py-3 font-medium">Observação</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">{workspace.stockLosses.map((loss) => <tr key={loss.id}><td className="whitespace-nowrap px-4 py-3">{new Date(loss.occurredAt).toLocaleString("pt-BR")}</td><td className="px-4 py-3 font-medium">{reasonLabels.get(loss.reasonCode) ?? loss.reasonCode}</td><td className="px-4 py-3">{itemNames.get(loss.stockItemId) ?? "Item indisponível"}</td><td className="px-4 py-3">{locationNames.get(loss.stockLocationId) ?? "Local indisponível"}</td><td className="px-4 py-3 font-semibold">{loss.quantity.toDecimal()}</td><td className="px-4 py-3 text-neutral-600">{loss.notes || "—"}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {workspace.stockLosses.map((loss) => <Panel key={loss.id} padding="sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{itemNames.get(loss.stockItemId) ?? "Item indisponível"}</h3><p className="mt-1 text-sm text-neutral-600">{locationNames.get(loss.stockLocationId) ?? "Local indisponível"}</p></div><span className="text-sm font-semibold">{loss.quantity.toDecimal()}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-neutral-500">Motivo</dt><dd className="mt-1 font-medium">{reasonLabels.get(loss.reasonCode) ?? loss.reasonCode}</dd></div><div><dt className="text-xs text-neutral-500">Data</dt><dd className="mt-1 font-medium">{new Date(loss.occurredAt).toLocaleString("pt-BR")}</dd></div></dl>{loss.notes && <p className="mt-3 text-sm text-neutral-600">{loss.notes}</p>}</Panel>)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
