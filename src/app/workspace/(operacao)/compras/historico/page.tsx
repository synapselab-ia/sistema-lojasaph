"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { RuntimePurchaseOrder, SupabasePurchaseGateway } from "@/modules/purchases/adapters/supabase-purchase-gateway";
import {
  formatPurchaseMoney,
  isPurchaseOrderFinal,
  purchaseOrderStatusLabels,
  purchaseOrderStatusTones,
  purchaseOrderTotal,
} from "@/modules/purchases/application/purchase-order-view";

export default function PurchaseHistoryPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [orders, setOrders] = useState<readonly RuntimePurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void gateway.listOrders(workspace.organizationId)
      .then((next) => { if (active) setOrders(next.filter(isPurchaseOrderFinal)); })
      .catch((error) => { if (active) setMessage(workspace.errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, workspace]);

  const supplierNames = useMemo(() => new Map<EntityId, string>(workspace.suppliers.map((supplier) => [supplier.id, supplier.tradeName])), [workspace.suppliers]);
  const locationNames = useMemo(() => new Map<EntityId, string>(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="Compras" title="Histórico" description="Pedidos recebidos ou cancelados permanecem disponíveis para consulta e rastreabilidade." />
      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}
      {loading && orders.length === 0 && <Panel><p className="text-sm text-neutral-500">Carregando histórico...</p></Panel>}
      {!loading && orders.length === 0 && <EmptyState title="Nenhum pedido finalizado" description="Pedidos recebidos ou cancelados aparecerão aqui." />}

      <div className="grid gap-4 lg:grid-cols-2">
        {orders.map((order) => (
          <Link key={order.id} href={`/workspace/compras/pedidos/${order.id}`} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-400">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold text-neutral-950">{supplierNames.get(order.supplierId) ?? "Fornecedor indisponível"}</h2><p className="mt-1 text-sm text-neutral-600">{locationNames.get(order.stockLocationId) ?? "Local indisponível"}</p></div>
              <StatusBadge tone={purchaseOrderStatusTones[order.status]}>{purchaseOrderStatusLabels[order.status]}</StatusBadge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-neutral-500">Itens</dt><dd className="mt-1 font-medium">{order.items.length}</dd></div>
              <div><dt className="text-xs text-neutral-500">Total</dt><dd className="mt-1 font-medium">{formatPurchaseMoney(purchaseOrderTotal(order))}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-neutral-500">Criado em</dt><dd className="mt-1 font-medium">{new Date(order.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</dd></div>
            </dl>
          </Link>
        ))}
      </div>
    </div>
  );
}
