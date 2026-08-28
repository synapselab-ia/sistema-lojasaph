"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, PageHeader, Panel, Select, Textarea, Input } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const EMPTY_WITHDRAWAL = {
  stockItemId: "",
  stockLocationId: "",
  sectorId: "",
  quantity: "",
  preferredBatchId: "",
  notes: "",
};

export default function StockWithdrawalsPage() {
  const workspace = useRuntimeWorkspace();
  const [withdrawal, setWithdrawal] = useState(EMPTY_WITHDRAWAL);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const selectedItem = workspace.stockItems.find((item) => item.id === withdrawal.stockItemId);
  const candidateBatches = useMemo(
    () => workspace.batches.filter((batch) => batch.stockItemId === withdrawal.stockItemId && batch.stockLocationId === withdrawal.stockLocationId),
    [withdrawal.stockItemId, withdrawal.stockLocationId, workspace.batches],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await workspace.recordWithdrawal({
        stockItemId: withdrawal.stockItemId as EntityId,
        stockLocationId: withdrawal.stockLocationId as EntityId,
        sectorId: withdrawal.sectorId as EntityId,
        quantity: withdrawal.quantity,
        preferredBatchId: withdrawal.preferredBatchId ? (withdrawal.preferredBatchId as EntityId) : undefined,
        notes: withdrawal.notes || undefined,
      });
      setWithdrawal(EMPTY_WITHDRAWAL);
      setFeedback({ tone: "success", text: "Retirada registrada e a posição do local foi atualizada." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Retiradas"
        title="Registrar retirada"
        description="Registre a saída para consumo informando o setor responsável. Quando houver rastreabilidade por lote, você pode indicar um lote preferido sem alterar as regras automáticas existentes."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      {!workspace.permissions.recordStockWithdrawal ? (
        <Panel tone="attention">
          <h2 className="font-semibold">Retirada indisponível para este perfil</h2>
          <p className="mt-1 text-sm leading-6">Você pode consultar a posição visível, mas não possui permissão para registrar retiradas.</p>
        </Panel>
      ) : workspace.stockItems.length === 0 || workspace.stockLocations.length === 0 || workspace.sectors.length === 0 ? (
        <EmptyState
          title="Faltam dados para registrar a retirada"
          description="É necessário ter produto, local de estoque e setor disponíveis."
        />
      ) : (
        <Panel>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="withdrawal-item" label="Produto" required>
                {(props) => (
                  <Select {...props} required value={withdrawal.stockItemId} onChange={(event) => setWithdrawal({ ...withdrawal, stockItemId: event.target.value, preferredBatchId: "" })}>
                    <option value="">Selecione</option>
                    {workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                )}
              </FormField>
              <FormField id="withdrawal-location" label="Local de origem" required>
                {(props) => (
                  <Select {...props} required value={withdrawal.stockLocationId} onChange={(event) => setWithdrawal({ ...withdrawal, stockLocationId: event.target.value, preferredBatchId: "" })}>
                    <option value="">Selecione</option>
                    {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
                  </Select>
                )}
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="withdrawal-sector" label="Setor de consumo" required hint="O setor registra o destino operacional da retirada.">
                {(props) => (
                  <Select {...props} required value={withdrawal.sectorId} onChange={(event) => setWithdrawal({ ...withdrawal, sectorId: event.target.value })}>
                    <option value="">Selecione</option>
                    {workspace.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.unitName} — {sector.name}</option>)}
                  </Select>
                )}
              </FormField>
              <FormField id="withdrawal-quantity" label="Quantidade" required>
                {(props) => <Input {...props} required inputMode="decimal" value={withdrawal.quantity} onChange={(event) => setWithdrawal({ ...withdrawal, quantity: event.target.value })} />}
              </FormField>
            </div>

            {(selectedItem?.trackBatch || selectedItem?.trackExpiration) && (
              <FormField id="withdrawal-batch" label="Lote preferido" hint="Opcional. Se não escolher, permanece a seleção automática já existente; esta tela não define uma nova política de prioridade de lotes.">
                {(props) => (
                  <Select {...props} value={withdrawal.preferredBatchId} onChange={(event) => setWithdrawal({ ...withdrawal, preferredBatchId: event.target.value })}>
                    <option value="">Seleção automática</option>
                    {candidateBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchCode || "Lote sem código"} · {batch.expirationDate ? `validade ${batch.expirationDate}` : "sem validade registrada"} · saldo {batch.remainingQuantity.toDecimal()}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            )}

            <FormField id="withdrawal-notes" label="Observação">
              {(props) => <Textarea {...props} rows={3} value={withdrawal.notes} onChange={(event) => setWithdrawal({ ...withdrawal, notes: event.target.value })} />}
            </FormField>

            <div className="flex justify-end">
              <Button type="submit" loading={saving} disabled={saving}>Registrar retirada</Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
