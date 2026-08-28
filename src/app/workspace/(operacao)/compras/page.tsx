"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { RuntimePurchaseOrder, SupabasePurchaseGateway } from "@/modules/purchases/adapters/supabase-purchase-gateway";
import {
  isPurchaseOrderOpen,
  purchaseOrderPendingLineCount,
  purchaseOrderStatusLabels,
  purchaseOrderStatusTones,
} from "@/modules/purchases/application/purchase-order-view";

export default function PurchasesOverviewPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [orders, setOrders] = useState<readonly RuntimePurchaseOrder[]>([]);
  const [receiptCount, setReceiptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([gateway.listOrders(workspace.organizationId), gateway.listReceipts(workspace.organizationId)])
      .then(([nextOrders, receipts]) => { if (active) { setOrders(nextOrders); setReceiptCount(receipts.length); } })
      .catch((error) => { if (active) setMessage(workspace.errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, workspace]);

  const openOrders = orders.filter(isPurchaseOrderOpen);
  const drafts = orders.filter((order) => order.status === "draft").length;
  const awaitingReceipt = orders.filter((order) => order.status === "ordered" || order.status === "partially_received").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Compras"
        title="Visão de compras"
        description="Acompanhe pedidos em preparação e entregas pendentes. Abra um pedido para executar as ações disponíveis no contexto correto."
        actions={workspace.permissions.managePurchases ? <Link href="/workspace/compras/pedidos/novo" className={buttonClasses({ variant: "primary" })}>Novo pedido</Link> : undefined}
      />
      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel><p className="text-sm text-neutral-500">Pedidos visíveis</p><p className="mt-2 text-3xl font-semibold">{orders.length}</p></Panel>
        <Panel><p className="text-sm text-neutral-500">Rascunhos</p><p className="mt-2 text-3xl font-semibold">{drafts}</p></Panel>
        <Panel><p className="text-sm text-neutral-500">Aguardando recebimento</p><p className="mt-2 text-3xl font-semibold">{awaitingReceipt}</p></Panel>
        <Panel><p className="text-sm text-neutral-500">Recebimentos recentes</p><p className="mt-2 text-3xl font-semibold">{receiptCount}</p></Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/workspace/compras/pedidos" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-400"><h2 className="font-semibold">Pedidos</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Pesquisar pedidos, acompanhar quantidades e abrir o detalhe.</p></Link>
        <Link href="/workspace/compras/recebimentos" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-400"><h2 className="font-semibold">Recebimentos</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Consultar as entregas que já movimentaram o estoque.</p></Link>
        <Link href="/workspace/compras/historico" className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-400"><h2 className="font-semibold">Histórico</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Revisar pedidos recebidos ou cancelados.</p></Link>
      </div>

      <Panel as="section" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Pedidos em andamento</h2><p className="mt-1 text-sm text-neutral-600">Os registros abaixo ainda possuem ação ou acompanhamento pendente.</p></div><Link href="/workspace/compras/pedidos" className="text-sm font-semibold text-neutral-700 hover:underline">Ver todos</Link></div>
        {loading && openOrders.length === 0 && <p className="text-sm text-neutral-500">Carregando pedidos...</p>}
        {!loading && openOrders.length === 0 && <EmptyState title="Nenhum pedido em andamento" description="Rascunhos e pedidos aguardando recebimento aparecerão aqui." />}
        <div className="grid gap-3 lg:grid-cols-2">
          {openOrders.slice(0, 6).map((order) => {
            const supplier = workspace.suppliers.find((candidate) => candidate.id === order.supplierId);
            const location = workspace.stockLocations.find((candidate) => candidate.id === order.stockLocationId);
            return (
              <Link key={order.id} href={`/workspace/compras/pedidos/${order.id}`} className="rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-400">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{supplier?.tradeName ?? "Fornecedor indisponível"}</p><p className="mt-1 text-xs text-neutral-500">{location ? `${location.unitName} — ${location.name}` : "Local indisponível"}</p></div><StatusBadge tone={purchaseOrderStatusTones[order.status]}>{purchaseOrderStatusLabels[order.status]}</StatusBadge></div>
                <p className="mt-3 text-sm text-neutral-600">{purchaseOrderPendingLineCount(order)} item(ns) com quantidade pendente.</p>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
