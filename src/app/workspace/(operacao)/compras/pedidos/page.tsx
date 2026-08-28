"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { PurchaseOrderStatus, RuntimePurchaseOrder, SupabasePurchaseGateway } from "@/modules/purchases/adapters/supabase-purchase-gateway";
import {
  filterPurchaseOrders,
  formatPurchaseMoney,
  purchaseOrderPendingLineCount,
  purchaseOrderStatusLabels,
  purchaseOrderStatusTones,
  purchaseOrderTotal,
} from "@/modules/purchases/application/purchase-order-view";

export default function PurchaseOrdersPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [orders, setOrders] = useState<readonly RuntimePurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void gateway.listOrders(workspace.organizationId)
      .then((next) => { if (active) setOrders(next); })
      .catch((error) => { if (active) setMessage(workspace.errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, workspace]);

  const supplierNames = useMemo(() => new Map<EntityId, string>(workspace.suppliers.map((supplier) => [supplier.id, supplier.tradeName])), [workspace.suppliers]);
  const locationNames = useMemo(() => new Map<EntityId, string>(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const stockItemNames = useMemo(() => new Map<EntityId, string>(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const visibleOrders = useMemo(() => filterPurchaseOrders({
    orders,
    search,
    status,
    supplierNames,
    locationNames,
    stockItemNames,
  }), [orders, search, status, supplierNames, locationNames, stockItemNames]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Compras"
        title="Pedidos"
        description="Consulte pedidos, acompanhe o que já foi recebido e abra cada pedido para emitir, receber ou cancelar quando permitido."
        actions={workspace.permissions.managePurchases ? <Link href="/workspace/compras/pedidos/novo" className={buttonClasses({ variant: "primary" })}>Novo pedido</Link> : undefined}
      />

      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}
      {!workspace.permissions.managePurchases && !workspace.permissions.receivePurchases && (
        <FeedbackMessage tone="info">Seu perfil possui acesso de consulta aos pedidos disponíveis no seu escopo.</FeedbackMessage>
      )}

      <Panel as="section">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
          <FormField id="purchase-order-search" label="Buscar" hint="Fornecedor, local, produto, status ou observação.">
            {(props) => <Input {...props} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: fornecedor ou produto" />}
          </FormField>
          <FormField id="purchase-order-status" label="Status">
            {(props) => (
              <Select {...props} value={status} onChange={(event) => setStatus(event.target.value as PurchaseOrderStatus | "all")}>
                <option value="all">Todos</option>
                {Object.entries(purchaseOrderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            )}
          </FormField>
        </div>
      </Panel>

      {loading && orders.length === 0 && <Panel><p className="text-sm text-neutral-500">Carregando pedidos...</p></Panel>}
      {!loading && visibleOrders.length === 0 && (
        <EmptyState
          title={orders.length === 0 ? "Nenhum pedido disponível" : "Nenhum pedido encontrado"}
          description={orders.length === 0 ? "Crie um pedido quando houver uma compra a preparar." : "Ajuste a busca ou o filtro de status."}
          action={orders.length === 0 && workspace.permissions.managePurchases ? <Link href="/workspace/compras/pedidos/novo" className={buttonClasses({ variant: "primary" })}>Criar pedido</Link> : undefined}
        />
      )}

      {visibleOrders.length > 0 && (
        <>
          <div className="space-y-3 md:hidden">
            {visibleOrders.map((order) => (
              <Link key={order.id} href={`/workspace/compras/pedidos/${order.id}`} className="block rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-400">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{supplierNames.get(order.supplierId) ?? "Fornecedor indisponível"}</p>
                    <p className="mt-1 text-xs text-neutral-500">{locationNames.get(order.stockLocationId) ?? "Local indisponível"}</p>
                  </div>
                  <StatusBadge tone={purchaseOrderStatusTones[order.status]}>{purchaseOrderStatusLabels[order.status]}</StatusBadge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-neutral-500">Itens</dt><dd className="mt-1 font-medium">{order.items.length}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Pendências</dt><dd className="mt-1 font-medium">{purchaseOrderPendingLineCount(order)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Total pedido</dt><dd className="mt-1 font-medium">{formatPurchaseMoney(purchaseOrderTotal(order))}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Previsão</dt><dd className="mt-1 font-medium">{order.expectedDeliveryDate ?? "Não informada"}</dd></div>
                </dl>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Fornecedor</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Itens pendentes</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Previsão</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-semibold"><Link className="hover:underline" href={`/workspace/compras/pedidos/${order.id}`}>{supplierNames.get(order.supplierId) ?? "Fornecedor indisponível"}</Link></td>
                      <td className="px-4 py-3 text-neutral-600">{locationNames.get(order.stockLocationId) ?? "Local indisponível"}</td>
                      <td className="px-4 py-3"><StatusBadge tone={purchaseOrderStatusTones[order.status]}>{purchaseOrderStatusLabels[order.status]}</StatusBadge></td>
                      <td className="px-4 py-3">{purchaseOrderPendingLineCount(order)}</td>
                      <td className="px-4 py-3">{formatPurchaseMoney(purchaseOrderTotal(order))}</td>
                      <td className="px-4 py-3 text-neutral-600">{order.expectedDeliveryDate ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
