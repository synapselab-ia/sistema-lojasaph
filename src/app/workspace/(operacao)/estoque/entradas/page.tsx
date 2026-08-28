"use client";

import { FormEvent, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const EMPTY_ENTRY = {
  stockItemId: "",
  stockLocationId: "",
  quantity: "",
  unitCost: "",
  batchCode: "",
  expirationDate: "",
  notes: "",
};

export default function StockEntriesPage() {
  const workspace = useRuntimeWorkspace();
  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
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
      setEntry(EMPTY_ENTRY);
      setFeedback({ tone: "success", text: "Entrada registrada e a posição de estoque foi atualizada." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Entradas"
        title="Registrar entrada"
        description="Informe o produto, o local de destino e a quantidade recebida. Lote e validade continuam opcionais conforme o cadastro e as validações já existentes."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      {!workspace.permissions.recordStockEntry ? (
        <Panel tone="attention">
          <h2 className="font-semibold">Entrada indisponível para este perfil</h2>
          <p className="mt-1 text-sm leading-6">Você pode consultar a posição visível, mas não possui permissão para registrar entradas.</p>
        </Panel>
      ) : workspace.stockItems.length === 0 || workspace.stockLocations.length === 0 ? (
        <EmptyState
          title="Faltam dados para registrar a entrada"
          description="É necessário ter ao menos um produto ativo e um local de estoque disponível."
        />
      ) : (
        <Panel>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="entry-item" label="Produto" required>
                {(props) => (
                  <Select {...props} required value={entry.stockItemId} onChange={(event) => setEntry({ ...entry, stockItemId: event.target.value })}>
                    <option value="">Selecione</option>
                    {workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                )}
              </FormField>
              <FormField id="entry-location" label="Local de destino" required>
                {(props) => (
                  <Select {...props} required value={entry.stockLocationId} onChange={(event) => setEntry({ ...entry, stockLocationId: event.target.value })}>
                    <option value="">Selecione</option>
                    {workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}
                  </Select>
                )}
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="entry-quantity" label="Quantidade" required>
                {(props) => <Input {...props} required inputMode="decimal" value={entry.quantity} onChange={(event) => setEntry({ ...entry, quantity: event.target.value })} />}
              </FormField>
              <FormField id="entry-unit-cost" label="Custo unitário (R$)" required hint="O valor segue a regra de custo já implementada; esta tela não altera a política de custeio.">
                {(props) => <Input {...props} required inputMode="decimal" value={entry.unitCost} onChange={(event) => setEntry({ ...entry, unitCost: event.target.value })} />}
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="entry-batch" label="Lote" hint="Opcional quando não for exigido pelas regras do produto.">
                {(props) => <Input {...props} value={entry.batchCode} onChange={(event) => setEntry({ ...entry, batchCode: event.target.value })} />}
              </FormField>
              <FormField id="entry-expiration" label="Validade" hint="Não define política de prioridade de saída.">
                {(props) => <Input {...props} type="date" value={entry.expirationDate} onChange={(event) => setEntry({ ...entry, expirationDate: event.target.value })} />}
              </FormField>
            </div>

            <FormField id="entry-notes" label="Observação">
              {(props) => <Textarea {...props} rows={3} value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} />}
            </FormField>

            <div className="flex justify-end">
              <Button type="submit" loading={saving} disabled={saving}>Registrar entrada</Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
