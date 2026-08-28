"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { isBelowStockMinimum } from "@/modules/inventory/domain/stock-minimum";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function StockMinimumsPage() {
  const workspace = useRuntimeWorkspace();
  const [form, setForm] = useState({ stockItemId: "", stockLocationId: "", quantity: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const itemUnits = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const balancesByKey = useMemo(() => new Map(workspace.balances.map((balance) => [`${balance.stockLocationId}:${balance.stockItemId}`, balance])), [workspace.balances]);
  const activePolicies = workspace.stockMinimumPolicies.filter((policy) => policy.active);
  const selectedPolicy = activePolicies.find((policy) => policy.stockItemId === form.stockItemId && policy.stockLocationId === form.stockLocationId);

  function selectItem(stockItemId: string) {
    const policy = activePolicies.find((candidate) => candidate.stockItemId === stockItemId && candidate.stockLocationId === form.stockLocationId);
    setForm({ ...form, stockItemId, quantity: policy?.minimumQuantity.toDecimal() ?? "" });
  }

  function selectLocation(stockLocationId: string) {
    const policy = activePolicies.find((candidate) => candidate.stockItemId === form.stockItemId && candidate.stockLocationId === stockLocationId);
    setForm({ ...form, stockLocationId, quantity: policy?.minimumQuantity.toDecimal() ?? "" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await workspace.saveStockMinimum({
        stockItemId: form.stockItemId as EntityId,
        stockLocationId: form.stockLocationId as EntityId,
        minimumQuantity: form.quantity,
      });
      setFeedback({ tone: "success", text: selectedPolicy ? "Estoque mínimo atualizado." : "Estoque mínimo definido." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!selectedPolicy) return;
    setSaving(true);
    setFeedback(null);
    try {
      await workspace.deactivateStockMinimum({
        stockItemId: selectedPolicy.stockItemId,
        stockLocationId: selectedPolicy.stockLocationId,
      });
      setForm({ ...form, quantity: "" });
      setFeedback({ tone: "success", text: "Estoque mínimo desativado para esta combinação." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Estoque mínimo"
        title="Estoque mínimo"
        description="Consulte e, quando autorizado, mantenha o limite mínimo por produto e local. Apenas saldo estritamente abaixo do limite configurado é sinalizado."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      {workspace.permissions.manageStockMinimum ? (
        <Panel>
          <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_1fr_0.7fr_auto] lg:items-end">
            <FormField id="minimum-item" label="Produto" required>
              {(props) => <Select {...props} required value={form.stockItemId} onChange={(event) => selectItem(event.target.value)}><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>}
            </FormField>
            <FormField id="minimum-location" label="Local" required>
              {(props) => <Select {...props} required value={form.stockLocationId} onChange={(event) => selectLocation(event.target.value)}><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</Select>}
            </FormField>
            <FormField id="minimum-quantity" label="Quantidade mínima" required>
              {(props) => <Input {...props} required inputMode="decimal" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />}
            </FormField>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={saving} disabled={saving || !form.stockItemId || !form.stockLocationId || !form.quantity.trim()}>{selectedPolicy ? "Atualizar" : "Definir"}</Button>
              {selectedPolicy && <Button type="button" variant="secondary" disabled={saving} onClick={() => void deactivate()}>Desativar</Button>}
            </div>
          </form>
        </Panel>
      ) : (
        <Panel tone="attention"><h2 className="font-semibold">Configuração somente leitura</h2><p className="mt-1 text-sm leading-6">Você pode consultar os mínimos visíveis, mas não possui permissão para alterá-los.</p></Panel>
      )}

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Limites ativos</h2><p className="text-sm text-neutral-600">Situação atual das combinações que possuem mínimo configurado.</p></div>
        {activePolicies.length === 0 ? (
          <EmptyState title="Nenhum estoque mínimo definido" description="A ausência de configuração não gera alerta." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activePolicies.map((policy) => {
              const balance = balancesByKey.get(`${policy.stockLocationId}:${policy.stockItemId}`);
              const below = balance ? isBelowStockMinimum(balance.quantity, policy) : isBelowStockMinimum(undefined, policy);
              return (
                <Panel key={`${policy.stockLocationId}:${policy.stockItemId}`} padding="sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="font-semibold">{itemNames.get(policy.stockItemId) ?? "Item indisponível"}</h3><p className="mt-1 text-sm text-neutral-600">{locationNames.get(policy.stockLocationId) ?? "Local indisponível"}</p></div>
                    <StatusBadge tone={below ? "danger" : "success"}>{below ? "Abaixo do mínimo" : "Dentro do mínimo"}</StatusBadge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-neutral-500">Saldo atual</dt><dd className="mt-1 font-semibold">{balance ? `${balance.quantity.toDecimal()} ${itemUnits.get(policy.stockItemId) ?? ""}` : `0 ${itemUnits.get(policy.stockItemId) ?? ""}`}</dd></div>
                    <div><dt className="text-xs text-neutral-500">Mínimo</dt><dd className="mt-1 font-semibold">{policy.minimumQuantity.toDecimal()} {itemUnits.get(policy.stockItemId) ?? ""}</dd></div>
                  </dl>
                </Panel>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
