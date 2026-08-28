"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button, ConfirmDialog, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { RuntimeInventoryCount, SupabaseInventoryCountGateway } from "@/modules/inventory/adapters/supabase-inventory-count-gateway";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function numeric(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function RuntimeInventoriesPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabaseInventoryCountGateway(createBrowserSupabaseClient()), []);
  const [counts, setCounts] = useState<readonly RuntimeInventoryCount[]>([]);
  const [locationId, setLocationId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { quantity: string; cost: string }>>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<EntityId | null>(null);

  const itemById = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item])), [workspace.stockItems]);
  const locationById = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, location])), [workspace.stockLocations]);
  const canManage = workspace.permissions.recordStockEntry;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCounts(await gateway.list(workspace.organizationId));
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [gateway, workspace]);

  useEffect(() => {
    let active = true;
    void gateway.list(workspace.organizationId)
      .then((nextCounts) => { if (active) setCounts(nextCounts); })
      .catch((error) => { if (active) setFeedback({ tone: "danger", text: workspace.errorMessage(error) }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, workspace]);

  async function startCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey("start");
    setFeedback(null);
    try {
      await gateway.start(workspace.organizationId, locationId as EntityId);
      setLocationId("");
      await refresh();
      setFeedback({ tone: "success", text: "Inventário iniciado. A referência inicial foi registrada para proteger a conferência contra alterações concorrentes." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSavingKey(null);
    }
  }

  async function saveLine(count: RuntimeInventoryCount, stockItemId: EntityId) {
    const line = count.lines.find((candidate) => candidate.stockItemId === stockItemId);
    if (!line) return;
    const key = `${count.id}:${stockItemId}`;
    const draft = drafts[key] ?? { quantity: line.countedQuantity?.toDecimal() ?? "", cost: line.adjustmentUnitCost?.toDecimal() ?? "" };
    setSavingKey(`line:${key}`);
    setFeedback(null);
    try {
      await gateway.setLine({ organizationId: workspace.organizationId, inventoryCountId: count.id, stockItemId, countedQuantity: draft.quantity, adjustmentUnitCost: draft.cost || undefined });
      await refresh();
      setFeedback({ tone: "success", text: "Contagem salva." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSavingKey(null);
    }
  }

  async function confirm(countId: EntityId) {
    setSavingKey(`confirm:${countId}`);
    setFeedback(null);
    try {
      await gateway.confirm(workspace.organizationId, countId);
      await refresh();
      setFeedback({ tone: "success", text: "Inventário confirmado. As diferenças válidas foram aplicadas ao estoque e permanecem rastreáveis." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSavingKey(null);
    }
  }

  async function cancel(countId: EntityId) {
    setSavingKey(`cancel:${countId}`);
    setFeedback(null);
    try {
      await gateway.cancel(workspace.organizationId, countId);
      await refresh();
      setCancelTargetId(null);
      setFeedback({ tone: "success", text: "Inventário cancelado. Nenhum ajuste de estoque foi aplicado." });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSavingKey(null);
    }
  }

  const openCounts = counts.filter((count) => count.status === "counting");
  const history = counts.filter((count) => count.status !== "counting");
  const cancelTarget = openCounts.find((count) => count.id === cancelTargetId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Inventários"
        title="Inventário físico"
        description="Conte os produtos de um local e confirme somente quando todas as linhas estiverem registradas. Se o estoque mudar durante a contagem, a confirmação é bloqueada para evitar ajustes incorretos."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      {canManage ? (
        <Panel>
          <form onSubmit={startCount} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FormField id="inventory-location" label="Local a inventariar" required className="min-w-0 flex-1">
              {(props) => <Select {...props} required value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</Select>}
            </FormField>
            <Button type="submit" loading={savingKey === "start"} disabled={savingKey !== null || !locationId}>Iniciar inventário</Button>
          </form>
        </Panel>
      ) : (
        <Panel tone="attention"><h2 className="font-semibold">Inventário somente leitura</h2><p className="mt-1 text-sm leading-6">Você pode consultar as sessões visíveis, mas não possui permissão para iniciar, alterar, confirmar ou cancelar contagens.</p></Panel>
      )}

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Em contagem</h2><p className="text-sm text-neutral-600">Registre cada produto antes de confirmar o inventário.</p></div>
        {loading && openCounts.length === 0 ? (
          <Panel padding="sm"><p className="text-sm text-neutral-600">Carregando inventários...</p></Panel>
        ) : openCounts.length === 0 ? (
          <EmptyState title="Nenhum inventário em andamento" description="Inicie uma contagem quando precisar reconciliar o estoque físico de um local." />
        ) : openCounts.map((count) => {
          const location = locationById.get(count.stockLocationId);
          const countedLines = count.lines.filter((line) => line.countedQuantity !== undefined).length;
          return (
            <Panel key={count.id} padding="none">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 p-5">
                <div><h3 className="font-semibold">{location ? `${location.unitName} — ${location.name}` : "Local indisponível"}</h3><p className="mt-1 text-xs text-neutral-500">Iniciado em {new Date(count.startedAt).toLocaleString("pt-BR")} · {countedLines}/{count.lines.length} produtos registrados</p></div>
                <StatusBadge tone="attention">Em contagem</StatusBadge>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Esperado</th><th className="px-4 py-3 font-medium">Contado</th><th className="px-4 py-3 font-medium">Custo do ajuste</th><th className="px-4 py-3 font-medium">Ação</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">{count.lines.map((line) => <InventoryLineRow key={line.id} count={count} line={line} item={itemById.get(line.stockItemId)} drafts={drafts} setDrafts={setDrafts} canManage={canManage} savingKey={savingKey} saveLine={saveLine} />)}</tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {count.lines.map((line) => <InventoryLineCard key={line.id} count={count} line={line} item={itemById.get(line.stockItemId)} drafts={drafts} setDrafts={setDrafts} canManage={canManage} savingKey={savingKey} saveLine={saveLine} />)}
              </div>

              {canManage && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 p-4">
                  <Button type="button" variant="danger" disabled={savingKey !== null} onClick={() => setCancelTargetId(count.id)}>Cancelar inventário</Button>
                  <Button type="button" disabled={savingKey !== null || countedLines !== count.lines.length} loading={savingKey === `confirm:${count.id}`} onClick={() => void confirm(count.id)}>Confirmar inventário</Button>
                </div>
              )}
            </Panel>
          );
        })}
      </section>

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Histórico recente</h2><p className="text-sm text-neutral-600">Inventários confirmados ou cancelados permanecem disponíveis para consulta.</p></div>
        {!loading && history.length === 0 ? (
          <EmptyState title="Nenhum inventário finalizado" description="O histórico aparecerá aqui após a primeira confirmação ou cancelamento." />
        ) : history.length > 0 && (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
              <table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Início</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Produtos</th></tr></thead><tbody className="divide-y divide-neutral-100">{history.slice(0, 10).map((count) => { const location = locationById.get(count.stockLocationId); return <tr key={count.id}><td className="px-4 py-3 font-medium">{location ? `${location.unitName} — ${location.name}` : "Local indisponível"}</td><td className="px-4 py-3 text-neutral-600">{new Date(count.startedAt).toLocaleString("pt-BR")}</td><td className="px-4 py-3"><StatusBadge tone={count.status === "confirmed" ? "success" : "neutral"}>{count.status === "confirmed" ? "Confirmado" : "Cancelado"}</StatusBadge></td><td className="px-4 py-3">{count.lines.length}</td></tr>; })}</tbody></table>
            </div>
            <div className="grid gap-3 md:hidden">
              {history.slice(0, 10).map((count) => { const location = locationById.get(count.stockLocationId); return <Panel key={count.id} padding="sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{location ? `${location.unitName} — ${location.name}` : "Local indisponível"}</h3><p className="mt-1 text-xs text-neutral-500">{new Date(count.startedAt).toLocaleString("pt-BR")} · {count.lines.length} produtos</p></div><StatusBadge tone={count.status === "confirmed" ? "success" : "neutral"}>{count.status === "confirmed" ? "Confirmado" : "Cancelado"}</StatusBadge></div></Panel>; })}
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => { if (!savingKey) setCancelTargetId(null); }}
        onConfirm={() => { if (cancelTarget) void cancel(cancelTarget.id); }}
        title="Cancelar este inventário?"
        description="A sessão será encerrada sem aplicar ajustes ao estoque. As contagens já informadas não serão confirmadas."
        confirmLabel="Cancelar inventário"
        destructive
        loading={Boolean(cancelTarget && savingKey === `cancel:${cancelTarget.id}`)}
        id="cancel-inventory-dialog"
      />
    </div>
  );
}

type InventoryLine = RuntimeInventoryCount["lines"][number];
type InventoryItem = ReturnType<typeof useRuntimeWorkspace>["stockItems"][number] | undefined;
type Drafts = Record<string, { quantity: string; cost: string }>;

function lineState(count: RuntimeInventoryCount, line: InventoryLine, item: InventoryItem, drafts: Drafts) {
  const key = `${count.id}:${line.stockItemId}`;
  const draft = drafts[key] ?? { quantity: line.countedQuantity?.toDecimal() ?? "", cost: line.adjustmentUnitCost?.toDecimal() ?? "" };
  const countedNumber = numeric(draft.quantity);
  const expectedNumber = Number(line.expectedQuantity.toDecimal());
  const positive = countedNumber !== null && countedNumber > expectedNumber;
  const trackedPositive = positive && Boolean(item?.trackBatch || item?.trackExpiration);
  const costRequired = positive && expectedNumber <= 0 && !trackedPositive;
  return { key, draft, trackedPositive, costRequired };
}

function InventoryLineRow({ count, line, item, drafts, setDrafts, canManage, savingKey, saveLine }: { count: RuntimeInventoryCount; line: InventoryLine; item: InventoryItem; drafts: Drafts; setDrafts: React.Dispatch<React.SetStateAction<Drafts>>; canManage: boolean; savingKey: string | null; saveLine: (count: RuntimeInventoryCount, stockItemId: EntityId) => Promise<void> }) {
  const { key, draft, trackedPositive, costRequired } = lineState(count, line, item, drafts);
  return (
    <tr className={trackedPositive ? "bg-rose-50/50" : undefined}>
      <td className="px-4 py-3"><p className="font-medium">{item?.name ?? "Produto indisponível"}</p>{trackedPositive && <p className="mt-1 max-w-sm text-xs text-rose-700">O aumento de item rastreado exige lote explícito e não pode ser concluído nesta linha.</p>}</td>
      <td className="px-4 py-3 font-semibold">{line.expectedQuantity.toDecimal()}</td>
      <td className="px-4 py-3"><Input disabled={!canManage} inputMode="decimal" aria-label={`Contagem de ${item?.name ?? "produto"}`} value={draft.quantity} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))} className="w-28" /></td>
      <td className="px-4 py-3"><Input disabled={!canManage || !Number.isFinite(numeric(draft.quantity) ?? NaN) || trackedPositive} inputMode="decimal" placeholder={costRequired ? "Obrigatório" : "Opcional"} aria-label={`Custo de ajuste de ${item?.name ?? "produto"}`} value={draft.cost} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, cost: event.target.value } }))} className="w-32" /></td>
      <td className="px-4 py-3"><Button type="button" variant="secondary" size="sm" disabled={!canManage || savingKey !== null || !draft.quantity.trim() || trackedPositive} loading={savingKey === `line:${key}`} onClick={() => void saveLine(count, line.stockItemId)}>Salvar</Button></td>
    </tr>
  );
}

function InventoryLineCard({ count, line, item, drafts, setDrafts, canManage, savingKey, saveLine }: { count: RuntimeInventoryCount; line: InventoryLine; item: InventoryItem; drafts: Drafts; setDrafts: React.Dispatch<React.SetStateAction<Drafts>>; canManage: boolean; savingKey: string | null; saveLine: (count: RuntimeInventoryCount, stockItemId: EntityId) => Promise<void> }) {
  const { key, draft, trackedPositive, costRequired } = lineState(count, line, item, drafts);
  return (
    <Panel padding="sm" tone={trackedPositive ? "danger" : "neutral"}>
      <div className="flex items-start justify-between gap-3"><h4 className="font-semibold">{item?.name ?? "Produto indisponível"}</h4><span className="text-sm font-semibold">Esperado {line.expectedQuantity.toDecimal()}</span></div>
      {trackedPositive && <p className="mt-2 text-xs leading-5">O aumento de item rastreado exige lote explícito e não pode ser concluído nesta linha.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField id={`count-${key}`} label="Quantidade contada">
          {(props) => <Input {...props} disabled={!canManage} inputMode="decimal" value={draft.quantity} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, quantity: event.target.value } }))} />}
        </FormField>
        <FormField id={`cost-${key}`} label="Custo do ajuste" hint={costRequired ? "Obrigatório quando há aumento sem custo anterior." : "Informe somente quando aplicável."}>
          {(props) => <Input {...props} disabled={!canManage || trackedPositive} inputMode="decimal" value={draft.cost} onChange={(event) => setDrafts((current) => ({ ...current, [key]: { ...draft, cost: event.target.value } }))} />}
        </FormField>
      </div>
      <div className="mt-3 flex justify-end"><Button type="button" variant="secondary" size="sm" disabled={!canManage || savingKey !== null || !draft.quantity.trim() || trackedPositive} loading={savingKey === `line:${key}`} onClick={() => void saveLine(count, line.stockItemId)}>Salvar contagem</Button></div>
    </Panel>
  );
}
