"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, PageHeader, Panel } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { RuntimePurchaseOrder, RuntimePurchaseReceipt, SupabasePurchaseGateway } from "@/modules/purchases/adapters/supabase-purchase-gateway";
import { formatPurchaseMoney } from "@/modules/purchases/application/purchase-order-view";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatDateOnly(value?: string): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export default function PurchaseReceiptsPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [orders, setOrders] = useState<readonly RuntimePurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<readonly RuntimePurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([gateway.listOrders(workspace.organizationId), gateway.listReceipts(workspace.organizationId)])
      .then(([nextOrders, nextReceipts]) => { if (active) { setOrders(nextOrders); setReceipts(nextReceipts); } })
      .catch((error) => { if (active) setMessage(workspace.errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, workspace]);

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const supplierById = useMemo(() => new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier])), [workspace.suppliers]);
  const stockItemById = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item])), [workspace.stockItems]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="Compras" title="Recebimentos" description="Consulte as entregas já registradas. Cada recebimento abaixo corresponde a entradas efetivadas no estoque pelo pedido de compra." />
      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}
      {loading && receipts.length === 0 && <Panel><p className="text-sm text-neutral-500">Carregando recebimentos...</p></Panel>}
      {!loading && receipts.length === 0 && <EmptyState title="Nenhum recebimento registrado" description="Os recebimentos aparecerão aqui depois que uma entrega for conferida em um pedido emitido." />}

      <div className="space-y-4">
        {receipts.map((receipt) => {
          const order = orderById.get(receipt.purchaseOrderId);
          const supplier = order ? supplierById.get(order.supplierId) : undefined;
          const orderItemById = new Map(order?.items.map((item) => [item.id, item]) ?? []);
          return (
            <Panel key={receipt.id} as="article" className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-neutral-950">{supplier?.tradeName ?? "Fornecedor indisponível"}</h2>
                  <p className="mt-1 text-sm text-neutral-600">Recebido em {formatDateTime(receipt.receivedAt)}</p>
                </div>
                {order && <Link href={`/workspace/compras/pedidos/${order.id}`} className="text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline">Abrir pedido</Link>}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {receipt.items.map((receiptItem) => {
                  const orderItem = orderItemById.get(receiptItem.purchaseOrderItemId);
                  const stockItem = orderItem && stockItemById.get(orderItem.stockItemId as EntityId);
                  return (
                    <div key={receiptItem.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="font-medium">{stockItem?.name ?? "Produto indisponível"}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-xs text-neutral-500">Quantidade</dt><dd className="mt-1 font-medium">{receiptItem.quantity.toDecimal()}</dd></div>
                        <div><dt className="text-xs text-neutral-500">Custo unitário</dt><dd className="mt-1 font-medium">{formatPurchaseMoney(receiptItem.unitCostSnapshot)}</dd></div>
                        <div><dt className="text-xs text-neutral-500">Lote</dt><dd className="mt-1">{receiptItem.batchCode ?? "—"}</dd></div>
                        <div><dt className="text-xs text-neutral-500">Validade</dt><dd className="mt-1">{formatDateOnly(receiptItem.expirationDate)}</dd></div>
                      </dl>
                    </div>
                  );
                })}
              </div>
              {receipt.notes && <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">{receipt.notes}</p>}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
