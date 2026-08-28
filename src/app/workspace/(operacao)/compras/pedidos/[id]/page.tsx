"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, EmptyState, FeedbackMessage, FormField, PageHeader, Panel, StatusBadge, Textarea } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { RuntimePurchaseOrder, RuntimePurchaseReceipt, SupabasePurchaseGateway } from "@/modules/purchases/adapters/supabase-purchase-gateway";
import {
  canReceivePurchaseOrder,
  formatPurchaseMoney,
  purchaseOrderStatusLabels,
  purchaseOrderStatusTones,
  purchaseOrderTotal,
} from "@/modules/purchases/application/purchase-order-view";

function formatDateOnly(value?: string): string {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id as EntityId;
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [order, setOrder] = useState<RuntimePurchaseOrder | null>(null);
  const [receipts, setReceipts] = useState<readonly RuntimePurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      gateway.getOrder(workspace.organizationId, orderId),
      gateway.listReceipts(workspace.organizationId),
    ])
      .then(([nextOrder, allReceipts]) => {
        if (!active) return;
        setOrder(nextOrder);
        setReceipts(allReceipts.filter((receipt) => receipt.purchaseOrderId === orderId));
      })
      .catch((error) => {
        if (active) setMessage({ tone: "danger", text: workspace.errorMessage(error) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gateway, orderId, workspace]);

  async function refreshOrder() {
    const [nextOrder, allReceipts] = await Promise.all([
      gateway.getOrder(workspace.organizationId, orderId),
      gateway.listReceipts(workspace.organizationId),
    ]);
    setOrder(nextOrder);
    setReceipts(allReceipts.filter((receipt) => receipt.purchaseOrderId === orderId));
  }

  async function issueOrder() {
    setSaving(true);
    setMessage(null);
    try {
      await gateway.issue(workspace.organizationId, orderId);
      await refreshOrder();
      setMessage({ tone: "success", text: "Pedido emitido. Ele agora está disponível para recebimento." });
    } catch (error) {
      setMessage({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder() {
    setSaving(true);
    setMessage(null);
    try {
      await gateway.cancel(workspace.organizationId, orderId, cancelReason || undefined);
      setCancelOpen(false);
      setCancelReason("");
      await refreshOrder();
      setMessage({ tone: "success", text: "Pedido cancelado. Recebimentos já registrados, se existirem, permanecem no histórico de estoque." });
    } catch (error) {
      setMessage({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !order) {
    return <div className="mx-auto max-w-6xl"><Panel><p className="text-sm text-neutral-500">Carregando pedido...</p></Panel></div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Compras · Pedidos" title="Pedido não encontrado" description="O pedido pode não existir ou não estar disponível no seu escopo atual." />
        {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}
        <EmptyState title="Não foi possível abrir este pedido" description="Volte para a lista para localizar um pedido disponível." action={<Link href="/workspace/compras/pedidos" className={buttonClasses()}>Voltar para pedidos</Link>} />
      </div>
    );
  }

  const supplier = workspace.suppliers.find((candidate) => candidate.id === order.supplierId);
  const location = workspace.stockLocations.find((candidate) => candidate.id === order.stockLocationId);
  const orderItemById = new Map(order.items.map((item) => [item.id, item]));
  const canIssue = workspace.permissions.managePurchases && order.status === "draft";
  const canCancel = workspace.permissions.managePurchases && order.status !== "received" && order.status !== "cancelled";
  const canReceive = workspace.permissions.receivePurchases && canReceivePurchaseOrder(order);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Compras · Pedidos"
        title={supplier?.tradeName ?? "Pedido de compra"}
        description={`${location ? `${location.unitName} — ${location.name}` : "Local indisponível"} · ${purchaseOrderStatusLabels[order.status]}`}
        actions={(
          <>
            <Link href="/workspace/compras/pedidos" className={buttonClasses()}>Voltar para pedidos</Link>
            {canReceive && <Link href={`/workspace/compras/pedidos/${order.id}/receber`} className={buttonClasses({ variant: "primary" })}>Registrar recebimento</Link>}
            {canIssue && <Button type="button" variant="primary" loading={saving} onClick={() => void issueOrder()}>Emitir pedido</Button>}
            {canCancel && <Button type="button" variant="danger" disabled={saving} onClick={() => setCancelOpen(true)}>Cancelar pedido</Button>}
          </>
        )}
      />

      {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel as="section" className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Resumo do pedido</h2><p className="mt-1 text-sm text-neutral-600">Contexto comercial e de recebimento registrado no pedido.</p></div>
            <StatusBadge tone={purchaseOrderStatusTones[order.status]}>{purchaseOrderStatusLabels[order.status]}</StatusBadge>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Fornecedor</dt><dd className="mt-1 text-sm font-medium">{supplier?.tradeName ?? "Indisponível"}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Local de recebimento</dt><dd className="mt-1 text-sm font-medium">{location ? `${location.unitName} — ${location.name}` : "Indisponível"}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Previsão de entrega</dt><dd className="mt-1 text-sm">{formatDateOnly(order.expectedDeliveryDate)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Emitido em</dt><dd className="mt-1 text-sm">{order.orderedAt ? formatDateTime(order.orderedAt) : "Ainda não emitido"}</dd></div>
          </dl>
          {order.notes && <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700"><span className="font-medium">Observações:</span> {order.notes}</div>}
        </Panel>
        <Panel as="section" className="space-y-2">
          <h2 className="text-lg font-semibold">Valor do pedido</h2>
          <p className="text-2xl font-semibold tracking-tight">{formatPurchaseMoney(purchaseOrderTotal(order))}</p>
          <p className="text-sm text-neutral-600">Calculado pelos preços e quantidades registrados no pedido.</p>
        </Panel>
      </div>

      <Panel as="section" padding="none" className="overflow-hidden">
        <div className="p-5"><h2 className="text-lg font-semibold">Itens e recebimentos</h2><p className="mt-1 text-sm text-neutral-600">Compare o pedido com o que já entrou em estoque.</p></div>
        <div className="divide-y divide-neutral-100">
          {order.items.map((item) => {
            const stockItem = workspace.stockItems.find((candidate) => candidate.id === item.stockItemId);
            const pending = item.orderedQuantity.subtract(item.receivedQuantity);
            return (
              <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(7rem,1fr))] md:items-center">
                <div><p className="font-semibold">{stockItem?.name ?? "Produto indisponível"}</p><p className="mt-1 text-xs text-neutral-500">{item.purchaseUnitSnapshot ?? stockItem?.baseUnitCode ?? "Unidade não informada"}</p></div>
                <div><p className="text-xs text-neutral-500">Pedido</p><p className="mt-1 text-sm font-medium">{item.orderedQuantity.toDecimal()}</p></div>
                <div><p className="text-xs text-neutral-500">Recebido</p><p className="mt-1 text-sm font-medium">{item.receivedQuantity.toDecimal()}</p></div>
                <div><p className="text-xs text-neutral-500">Pendente</p><p className="mt-1 text-sm font-medium">{pending.toDecimal()}</p></div>
                <div><p className="text-xs text-neutral-500">Preço unitário</p><p className="mt-1 text-sm font-medium">{formatPurchaseMoney(item.unitPriceSnapshot)}</p></div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel as="section" className="space-y-4">
        <div><h2 className="text-lg font-semibold">Histórico de recebimentos</h2><p className="mt-1 text-sm text-neutral-600">Cada registro abaixo corresponde a uma entrada efetivada pelo fluxo de recebimento do pedido.</p></div>
        {receipts.length === 0 ? <p className="text-sm text-neutral-500">Nenhum recebimento registrado.</p> : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <div key={receipt.id} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Recebimento em {formatDateTime(receipt.receivedAt)}</p><span className="text-xs text-neutral-500">{receipt.items.length} item(ns)</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {receipt.items.map((receiptItem) => {
                    const orderItem = orderItemById.get(receiptItem.purchaseOrderItemId);
                    const stockItem = orderItem && workspace.stockItems.find((candidate) => candidate.id === orderItem.stockItemId);
                    return <div key={receiptItem.id} className="rounded-lg bg-neutral-50 p-3 text-sm"><p className="font-medium">{stockItem?.name ?? "Produto indisponível"}</p><p className="mt-1 text-neutral-600">Quantidade {receiptItem.quantity.toDecimal()}{receiptItem.batchCode ? ` · lote ${receiptItem.batchCode}` : ""}{receiptItem.expirationDate ? ` · validade ${formatDateOnly(receiptItem.expirationDate)}` : ""}</p></div>;
                  })}
                </div>
                {receipt.notes && <p className="mt-3 text-sm text-neutral-600">{receipt.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Dialog
        id="purchase-cancel-dialog"
        open={cancelOpen}
        onClose={() => { if (!saving) setCancelOpen(false); }}
        title="Cancelar pedido"
        description="O pedido deixa de aceitar novos recebimentos. Entradas de estoque já registradas não são desfeitas por esta ação."
        footer={(
          <><Button type="button" variant="secondary" disabled={saving} onClick={() => setCancelOpen(false)}>Voltar</Button><Button type="button" variant="danger" loading={saving} onClick={() => void cancelOrder()}>Confirmar cancelamento</Button></>
        )}
      >
        <FormField id="purchase-cancel-reason" label="Motivo (opcional)">
          {(props) => <Textarea {...props} rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Registre um motivo quando for útil para o histórico." />}
        </FormField>
      </Dialog>
    </div>
  );
}
