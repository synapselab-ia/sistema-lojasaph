"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Textarea } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { RuntimePurchaseOrder, SupabasePurchaseGateway } from "@/modules/purchases/adapters/supabase-purchase-gateway";
import { canReceivePurchaseOrder } from "@/modules/purchases/application/purchase-order-view";

interface ReceiptDraft {
  quantity: string;
  batchCode: string;
  expirationDate: string;
}

export default function ReceivePurchaseOrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id as EntityId;
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [order, setOrder] = useState<RuntimePurchaseOrder | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ReceiptDraft>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await gateway.getOrder(workspace.organizationId, orderId);
      setOrder(next);
      if (next) {
        setDrafts(Object.fromEntries(next.items.map((item) => [item.id, { quantity: "", batchCode: "", expirationDate: "" }])));
      }
    } catch (error) {
      setMessage({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [gateway, orderId, workspace]);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const items = order.items.flatMap((item) => {
      const draft = drafts[item.id];
      if (!draft?.quantity.trim()) return [];
      return [{
        purchaseOrderItemId: item.id,
        quantity: draft.quantity,
        batchCode: draft.batchCode || undefined,
        expirationDate: draft.expirationDate || undefined,
      }];
    });

    setSaving(true);
    setMessage(null);
    try {
      await gateway.receive({
        organizationId: workspace.organizationId,
        purchaseOrderId: order.id,
        notes: notes || undefined,
        items,
      });
      setNotes("");
      await load();
      setMessage({ tone: "success", text: "Recebimento registrado. As quantidades recebidas já foram incorporadas ao estoque pelo fluxo do pedido." });
    } catch (error) {
      setMessage({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !order) return <div className="mx-auto max-w-5xl"><Panel><p className="text-sm text-neutral-500">Carregando pedido...</p></Panel></div>;

  if (!order) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Compras · Recebimento" title="Pedido não encontrado" description="O pedido pode não existir ou não estar disponível no seu escopo atual." />
        <EmptyState title="Recebimento indisponível" description="Volte para os pedidos e escolha um registro disponível." action={<Link href="/workspace/compras/pedidos" className={buttonClasses()}>Voltar para pedidos</Link>} />
      </div>
    );
  }

  const supplier = workspace.suppliers.find((candidate) => candidate.id === order.supplierId);
  const location = workspace.stockLocations.find((candidate) => candidate.id === order.stockLocationId);
  const pendingItems = order.items.filter((item) => item.orderedQuantity.subtract(item.receivedQuantity).isPositive());
  const allowed = workspace.permissions.receivePurchases && canReceivePurchaseOrder(order);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Compras · Recebimento"
        title={supplier?.tradeName ?? "Receber pedido"}
        description={location ? `Entrada destinada a ${location.unitName} — ${location.name}. Informe somente o que foi efetivamente recebido.` : "Informe somente o que foi efetivamente recebido."}
        actions={<Link href={`/workspace/compras/pedidos/${order.id}`} className={buttonClasses({ variant: "secondary" })}>Voltar ao pedido</Link>}
      />

      {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}
      {!workspace.permissions.receivePurchases && <FeedbackMessage tone="info">Seu perfil não pode registrar recebimentos. A consulta do pedido permanece disponível.</FeedbackMessage>}
      {workspace.permissions.receivePurchases && !canReceivePurchaseOrder(order) && <FeedbackMessage tone="info">Este pedido não possui recebimento disponível no estado atual.</FeedbackMessage>}

      {allowed && (
        <form onSubmit={submit} className="space-y-6">
          <Panel as="section" className="space-y-4">
            <div><h2 className="text-lg font-semibold">Itens pendentes</h2><p className="mt-1 text-sm text-neutral-600">Deixe a quantidade em branco para itens que não chegaram neste recebimento.</p></div>
            <div className="space-y-3">
              {pendingItems.map((item) => {
                const stockItem = workspace.stockItems.find((candidate) => candidate.id === item.stockItemId);
                const pending = item.orderedQuantity.subtract(item.receivedQuantity);
                const draft = drafts[item.id] ?? { quantity: "", batchCode: "", expirationDate: "" };
                const showTraceability = Boolean(stockItem?.trackBatch || stockItem?.trackExpiration);
                return (
                  <div key={item.id} className="rounded-xl border border-neutral-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-semibold">{stockItem?.name ?? "Produto indisponível"}</p><p className="mt-1 text-xs text-neutral-500">Pedido {item.orderedQuantity.toDecimal()} · recebido {item.receivedQuantity.toDecimal()} · pendente {pending.toDecimal()}</p></div>
                    </div>
                    <div className={`mt-4 grid gap-3 ${showTraceability ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
                      <FormField id={`receipt-quantity-${item.id}`} label="Quantidade recebida" hint={`Máximo pendente: ${pending.toDecimal()}`}>
                        {(props) => <Input {...props} inputMode="decimal" value={draft.quantity} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, quantity: event.target.value } }))} />}
                      </FormField>
                      {showTraceability && (
                        <>
                          <FormField id={`receipt-batch-${item.id}`} label="Lote" hint={stockItem?.trackBatch ? "Produto possui controle de lote." : undefined}>
                            {(props) => <Input {...props} value={draft.batchCode} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, batchCode: event.target.value } }))} />}
                          </FormField>
                          <FormField id={`receipt-expiration-${item.id}`} label="Validade" hint={stockItem?.trackExpiration ? "Produto possui controle de validade." : undefined}>
                            {(props) => <Input {...props} type="date" value={draft.expirationDate} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, expirationDate: event.target.value } }))} />}
                          </FormField>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel as="section">
            <FormField id="receipt-notes" label="Observações do recebimento">
              {(props) => <Textarea {...props} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: entrega parcial ou observação da conferência." />}
            </FormField>
          </Panel>

          <div className="flex justify-end"><Button type="submit" variant="primary" loading={saving}>Registrar recebimento</Button></div>
        </form>
      )}
    </div>
  );
}
