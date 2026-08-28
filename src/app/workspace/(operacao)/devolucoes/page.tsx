"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabaseStockReturnGateway } from "@/modules/inventory/adapters/supabase-stock-return-gateway";
import { StockReturnService } from "@/modules/inventory/application/stock-return-service";
import { RuntimeStockReturn, RuntimeStockReturnCandidate, RuntimeStockReturnOverview } from "@/modules/inventory/domain/stock-return";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const EMPTY_OVERVIEW: RuntimeStockReturnOverview = Object.freeze({ candidates: [], recent: [] });

export default function StockReturnsPage() {
  const workspace = useRuntimeWorkspace();
  const organizationId = workspace.organizationId;
  const errorMessage = workspace.errorMessage;
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const service = useMemo(() => new StockReturnService(new SupabaseStockReturnGateway(client)), [client]);
  const [overview, setOverview] = useState<RuntimeStockReturnOverview>(EMPTY_OVERVIEW);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const selectedCandidate = overview.candidates.find((candidate) => candidate.withdrawalMovementId === selectedWithdrawalId);

  useEffect(() => {
    let cancelled = false;
    service.loadOverview(organizationId)
      .then((next) => { if (!cancelled) setOverview(next); })
      .catch((error) => { if (!cancelled) setFeedback({ tone: "danger", text: errorMessage(error) }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [errorMessage, organizationId, service]);

  async function reloadOverview() {
    const next = await service.loadOverview(organizationId);
    setOverview(next);
    if (!next.candidates.some((candidate) => candidate.withdrawalMovementId === selectedWithdrawalId)) setSelectedWithdrawalId("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCandidate) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await service.record({ organizationId, withdrawalMovementId: selectedCandidate.withdrawalMovementId, quantity, notes: notes || undefined });
      await reloadOverview();
      setQuantity("");
      setNotes("");
      setFeedback({ tone: "success", text: `Devolução registrada. Ainda podem ser devolvidas ${result.remainingReturnableQuantity.toDecimal()} unidades da retirada selecionada.` });
    } catch (error) {
      setFeedback({ tone: "danger", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Devoluções"
        title="Devoluções de retiradas"
        description="Registre o retorno parcial ou total de uma retirada anterior. Produto, local, custo e rastreabilidade permanecem vinculados à movimentação original."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      {workspace.permissions.recordStockWithdrawal ? (
        overview.candidates.length === 0 && !loading ? (
          <EmptyState title="Nenhuma retirada com saldo para devolver" description="Quando uma retirada elegível tiver quantidade ainda retornável, ela aparecerá aqui." />
        ) : (
          <Panel>
            <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
              <FormField id="return-withdrawal" label="Retirada com saldo para devolver" required className="lg:col-span-2">
                {(props) => (
                  <Select {...props} required disabled={loading} value={selectedWithdrawalId} onChange={(event) => { setSelectedWithdrawalId(event.target.value); setQuantity(""); }}>
                    <option value="">{loading ? "Carregando retiradas..." : "Selecione"}</option>
                    {overview.candidates.map((candidate) => <CandidateOption key={candidate.withdrawalMovementId} candidate={candidate} itemName={itemNames.get(candidate.stockItemId)} locationName={locationNames.get(candidate.stockLocationId)} />)}
                  </Select>
                )}
              </FormField>

              {selectedCandidate && (
                <Panel tone="info" padding="sm" className="lg:col-span-2">
                  <dl className="grid gap-3 sm:grid-cols-4">
                    <Summary label="Retirado" value={selectedCandidate.withdrawnQuantity.toDecimal()} />
                    <Summary label="Já devolvido" value={selectedCandidate.returnedQuantity.toDecimal()} />
                    <Summary label="Pendente" value={selectedCandidate.remainingQuantity.toDecimal()} />
                    <Summary label="Destino" value={locationNames.get(selectedCandidate.stockLocationId) ?? "Local da retirada"} />
                  </dl>
                </Panel>
              )}

              <FormField id="return-quantity" label="Quantidade a devolver" required>
                {(props) => <Input {...props} required inputMode="decimal" step="0.001" min="0.001" max={selectedCandidate?.remainingQuantity.toDecimal()} disabled={!selectedCandidate} value={quantity} onChange={(event) => setQuantity(event.target.value)} />}
              </FormField>
              <FormField id="return-notes" label="Observação">
                {(props) => <Textarea {...props} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />}
              </FormField>
              <div className="flex justify-end lg:col-span-2"><Button type="submit" loading={saving} disabled={saving || loading || !selectedCandidate}>Registrar devolução</Button></div>
            </form>
          </Panel>
        )
      ) : (
        <Panel tone="attention"><h2 className="font-semibold">Devolução indisponível para este perfil</h2><p className="mt-1 text-sm leading-6">Você pode consultar retiradas visíveis, mas não possui permissão para devolver estoque.</p></Panel>
      )}

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Devoluções recentes</h2><p className="text-sm text-neutral-600">Retornos já registrados e visíveis para sua operação.</p></div>
        {loading && overview.recent.length === 0 ? (
          <Panel padding="sm"><p className="text-sm text-neutral-600">Carregando devoluções...</p></Panel>
        ) : overview.recent.length === 0 ? (
          <EmptyState title="Nenhuma devolução registrada" description="Os retornos aparecerão aqui depois do primeiro registro visível." />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Quantidade</th><th className="px-4 py-3 font-medium">Observação</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">{overview.recent.map((stockReturn) => <ReturnRow key={stockReturn.id} stockReturn={stockReturn} itemName={itemNames.get(stockReturn.stockItemId)} locationName={locationNames.get(stockReturn.stockLocationId)} />)}</tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {overview.recent.map((stockReturn) => <ReturnCard key={stockReturn.id} stockReturn={stockReturn} itemName={itemNames.get(stockReturn.stockItemId)} locationName={locationNames.get(stockReturn.stockLocationId)} />)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function CandidateOption({ candidate, itemName, locationName }: { candidate: RuntimeStockReturnCandidate; itemName?: string; locationName?: string }) {
  return <option value={candidate.withdrawalMovementId}>{new Date(candidate.occurredAt).toLocaleString("pt-BR")} · {itemName ?? "Item indisponível"} · {locationName ?? "Local indisponível"} · pendente {candidate.remainingQuantity.toDecimal()}</option>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>;
}

function ReturnRow({ stockReturn, itemName, locationName }: { stockReturn: RuntimeStockReturn; itemName?: string; locationName?: string }) {
  return <tr><td className="whitespace-nowrap px-4 py-3">{new Date(stockReturn.occurredAt).toLocaleString("pt-BR")}</td><td className="px-4 py-3 font-medium">{itemName ?? "Item indisponível"}</td><td className="px-4 py-3">{locationName ?? "Local indisponível"}</td><td className="px-4 py-3 font-semibold">{stockReturn.quantity.toDecimal()}</td><td className="px-4 py-3 text-neutral-600">{stockReturn.notes || "—"}</td></tr>;
}

function ReturnCard({ stockReturn, itemName, locationName }: { stockReturn: RuntimeStockReturn; itemName?: string; locationName?: string }) {
  return <Panel padding="sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{itemName ?? "Item indisponível"}</h3><p className="mt-1 text-sm text-neutral-600">{locationName ?? "Local indisponível"}</p></div><span className="font-semibold">{stockReturn.quantity.toDecimal()}</span></div><p className="mt-3 text-xs text-neutral-500">{new Date(stockReturn.occurredAt).toLocaleString("pt-BR")}</p>{stockReturn.notes && <p className="mt-2 text-sm text-neutral-600">{stockReturn.notes}</p>}</Panel>;
}
