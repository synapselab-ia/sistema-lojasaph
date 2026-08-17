"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  RuntimePurchaseOrder,
  SupplierPurchaseItem,
  SupabasePurchaseGateway,
} from "@/modules/purchases/adapters/supabase-purchase-gateway";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

interface DraftItemState { quantity: string; unitPrice: string }
interface ReceiptItemState { quantity: string; batchCode: string; expirationDate: string }

const statusLabel: Record<RuntimePurchaseOrder["status"], string> = {
  draft: "Rascunho",
  ordered: "Emitido",
  partially_received: "Parcial",
  received: "Recebido",
  cancelled: "Cancelado",
};

export default function RuntimePurchasesPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [orders, setOrders] = useState<readonly RuntimePurchaseOrder[]>([]);
  const [supplierItems, setSupplierItems] = useState<readonly SupplierPurchaseItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [draftItems, setDraftItems] = useState<Record<string, DraftItemState>>({});
  const [receiptItems, setReceiptItems] = useState<Record<string, ReceiptItemState>>({});
  const [receiptNotes, setReceiptNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const supplierById = useMemo(() => new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier])), [workspace.suppliers]);
  const itemById = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item])), [workspace.stockItems]);
  const locationById = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, location])), [workspace.stockLocations]);

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await gateway.listOrders(workspace.organizationId));
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [gateway, workspace]);

  useEffect(() => { void refreshOrders(); }, [refreshOrders]);

  useEffect(() => {
    if (!supplierId) {
      setSupplierItems([]);
      setDraftItems({});
      return;
    }
    let active = true;
    void gateway.listSupplierItems(workspace.organizationId, supplierId as EntityId)
      .then((items) => {
        if (!active) return;
        setSupplierItems(items);
        setDraftItems(Object.fromEntries(items.map((item) => [item.supplierItemId, {
          quantity: "",
          unitPrice: item.latestUnitPrice?.toDecimal() ?? "",
        }])));
      })
      .catch((error) => { if (active) setMessage(workspace.errorMessage(error)); });
    return () => { active = false; };
  }, [gateway, supplierId, workspace]);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = supplierItems.flatMap((item) => {
      const draft = draftItems[item.supplierItemId];
      if (!draft?.quantity.trim()) return [];
      return [{ supplierItemId: item.supplierItemId, quantity: draft.quantity, unitPrice: draft.unitPrice }];
    });
    setSavingKey("create");
    setMessage(null);
    try {
      await gateway.create({
        organizationId: workspace.organizationId,
        supplierId: supplierId as EntityId,
        stockLocationId: locationId as EntityId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        items,
      });
      setSupplierId("");
      setLocationId("");
      setExpectedDeliveryDate("");
      setNotes("");
      setSupplierItems([]);
      setDraftItems({});
      await refreshOrders();
      setMessage("Pedido salvo como rascunho. Emita somente quando preços e quantidades estiverem conferidos.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function issue(orderId: EntityId) {
    setSavingKey(`issue:${orderId}`);
    setMessage(null);
    try {
      await gateway.issue(workspace.organizationId, orderId);
      await refreshOrders();
      setMessage("Pedido emitido e histórico de preço do fornecedor atualizado.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function cancel(orderId: EntityId) {
    const reason = window.prompt("Motivo do cancelamento (opcional):") ?? undefined;
    setSavingKey(`cancel:${orderId}`);
    setMessage(null);
    try {
      await gateway.cancel(workspace.organizationId, orderId, reason);
      await refreshOrders();
      setMessage("Pedido cancelado. Mercadorias já recebidas, se houver, permanecem no estoque com histórico preservado.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function receive(order: RuntimePurchaseOrder) {
    const items = order.items.flatMap((item) => {
      const pending = item.orderedQuantity.subtract(item.receivedQuantity);
      const draft = receiptItems[item.id];
      if (!draft?.quantity.trim() || pending.isZero()) return [];
      return [{
        purchaseOrderItemId: item.id,
        quantity: draft.quantity,
        batchCode: draft.batchCode || undefined,
        expirationDate: draft.expirationDate || undefined,
      }];
    });
    setSavingKey(`receive:${order.id}`);
    setMessage(null);
    try {
      await gateway.receive({
        organizationId: workspace.organizationId,
        purchaseOrderId: order.id,
        notes: receiptNotes[order.id] || undefined,
        items,
      });
      setReceiptItems((current) => {
        const next = { ...current };
        for (const item of order.items) delete next[item.id];
        return next;
      });
      setReceiptNotes((current) => ({ ...current, [order.id]: "" }));
      await refreshOrders();
      setMessage("Recebimento registrado. Pedido e estoque foram atualizados na mesma transação.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  const openOrders = orders.filter((order) => order.status !== "received" && order.status !== "cancelled");
  const history = orders.filter((order) => order.status === "received" || order.status === "cancelled");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Compras persistentes</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pedidos e recebimentos</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">Pedidos usam quantidade na unidade-base do estoque nesta primeira versão. O recebimento parcial ou total cria entradas de estoque de forma atômica; financeiro e notas fiscais permanecem fora desta fase.</p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      {workspace.permissions.managePurchases && (
        <form onSubmit={createOrder} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-semibold">Novo pedido</h2><p className="mt-1 text-xs text-neutral-500">O pedido nasce como rascunho. Preço é snapshot por item e não altera estoque até o recebimento.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium">Fornecedor<select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>)}</select></label>
            <label className="text-sm font-medium">Local de recebimento<select required value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</select></label>
            <label className="text-sm font-medium">Previsão de entrega<input type="date" value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Observação<input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
          </div>

          {supplierId && (
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Unidade fornecedor</th><th className="px-4 py-3 font-medium">Último preço</th><th className="px-4 py-3 font-medium">Quantidade base</th><th className="px-4 py-3 font-medium">Preço unitário</th></tr></thead><tbody className="divide-y divide-neutral-100">{supplierItems.map((item) => { const draft = draftItems[item.supplierItemId] ?? { quantity: "", unitPrice: "" }; return <tr key={item.supplierItemId}><td className="px-4 py-3 font-medium">{item.stockItemName}</td><td className="px-4 py-3 text-neutral-600">{item.purchaseUnit ?? "—"}</td><td className="px-4 py-3">{item.latestUnitPrice ? `R$ ${item.latestUnitPrice.toDecimal().replace(".", ",")}` : "—"}</td><td className="px-4 py-3"><input inputMode="decimal" value={draft.quantity} onChange={(event) => setDraftItems((current) => ({ ...current, [item.supplierItemId]: { ...draft, quantity: event.target.value } }))} className="w-28 rounded-lg border border-neutral-300 px-3 py-2" /></td><td className="px-4 py-3"><input inputMode="decimal" value={draft.unitPrice} onChange={(event) => setDraftItems((current) => ({ ...current, [item.supplierItemId]: { ...draft, unitPrice: event.target.value } }))} className="w-28 rounded-lg border border-neutral-300 px-3 py-2" /></td></tr>; })}{supplierItems.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Fornecedor sem itens de compra ativos.</td></tr>}</tbody></table>
            </div>
          )}

          <div className="flex justify-end"><button disabled={savingKey !== null || !supplierId || !locationId} type="submit" className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingKey === "create" ? "Salvando..." : "Salvar rascunho"}</button></div>
        </form>
      )}

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Pedidos em andamento</h2><p className="text-sm text-neutral-500">Emita rascunhos e registre somente a quantidade efetivamente recebida.</p></div>
        {loading && openOrders.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Carregando pedidos...</p>}
        {!loading && openOrders.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhum pedido em andamento.</p>}

        {openOrders.map((order) => {
          const supplier = supplierById.get(order.supplierId);
          const location = locationById.get(order.stockLocationId);
          const canReceive = workspace.permissions.receivePurchases && (order.status === "ordered" || order.status === "partially_received");
          return (
            <article key={order.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 p-5">
                <div><h3 className="font-semibold">{supplier?.tradeName ?? "Fornecedor indisponível"}</h3><p className="mt-1 text-xs text-neutral-500">{location ? `${location.unitName} — ${location.name}` : "Local indisponível"}{order.expectedDeliveryDate ? ` · entrega prevista ${order.expectedDeliveryDate}` : ""}</p></div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">{statusLabel[order.status]}</span>
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Pedido</th><th className="px-4 py-3 font-medium">Recebido</th><th className="px-4 py-3 font-medium">Pendente</th><th className="px-4 py-3 font-medium">Preço</th>{canReceive && <th className="px-4 py-3 font-medium">Receber agora</th>}</tr></thead><tbody className="divide-y divide-neutral-100">{order.items.map((item) => { const stockItem = itemById.get(item.stockItemId); const pending = item.orderedQuantity.subtract(item.receivedQuantity); const draft = receiptItems[item.id] ?? { quantity: "", batchCode: "", expirationDate: "" }; return <tr key={item.id}><td className="px-4 py-3 font-medium">{stockItem?.name ?? "Produto indisponível"}</td><td className="px-4 py-3">{item.orderedQuantity.toDecimal()}</td><td className="px-4 py-3">{item.receivedQuantity.toDecimal()}</td><td className="px-4 py-3 font-semibold">{pending.toDecimal()}</td><td className="px-4 py-3">R$ {item.unitPriceSnapshot.toDecimal().replace(".", ",")}</td>{canReceive && <td className="px-4 py-3"><div className="flex min-w-[360px] gap-2"><input disabled={pending.isZero()} inputMode="decimal" placeholder={pending.toDecimal()} value={draft.quantity} onChange={(event) => setReceiptItems((current) => ({ ...current, [item.id]: { ...draft, quantity: event.target.value } }))} className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 disabled:bg-neutral-100" />{(stockItem?.trackBatch || stockItem?.trackExpiration) && <><input placeholder="Lote" value={draft.batchCode} onChange={(event) => setReceiptItems((current) => ({ ...current, [item.id]: { ...draft, batchCode: event.target.value } }))} className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5" /><input type="date" value={draft.expirationDate} onChange={(event) => setReceiptItems((current) => ({ ...current, [item.id]: { ...draft, expirationDate: event.target.value } }))} className="w-36 rounded-lg border border-neutral-300 px-2 py-1.5" /></>}</div></td>}</tr>; })}</tbody></table></div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 p-4">
                <p className="text-xs text-neutral-500">{order.notes || "Sem observações."}</p>
                <div className="flex flex-wrap gap-2">
                  {workspace.permissions.managePurchases && order.status === "draft" && <button disabled={savingKey !== null} type="button" onClick={() => issue(order.id)} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingKey === `issue:${order.id}` ? "Emitindo..." : "Emitir pedido"}</button>}
                  {canReceive && <><input value={receiptNotes[order.id] ?? ""} onChange={(event) => setReceiptNotes((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Obs. recebimento" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" /><button disabled={savingKey !== null} type="button" onClick={() => receive(order)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingKey === `receive:${order.id}` ? "Recebendo..." : "Registrar recebimento"}</button></>}
                  {workspace.permissions.managePurchases && <button disabled={savingKey !== null} type="button" onClick={() => cancel(order.id)} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">{savingKey === `cancel:${order.id}` ? "Cancelando..." : "Cancelar"}</button>}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section>
        <div className="mb-3"><h2 className="text-lg font-semibold">Histórico recente</h2><p className="text-sm text-neutral-500">Pedidos recebidos ou cancelados permanecem rastreáveis.</p></div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Fornecedor</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Itens</th><th className="px-4 py-3 font-medium">Criado</th></tr></thead><tbody className="divide-y divide-neutral-100">{history.slice(0, 15).map((order) => { const supplier = supplierById.get(order.supplierId); const location = locationById.get(order.stockLocationId); return <tr key={order.id}><td className="px-4 py-3 font-medium">{supplier?.tradeName ?? "—"}</td><td className="px-4 py-3 text-neutral-600">{location ? `${location.unitName} — ${location.name}` : "—"}</td><td className="px-4 py-3">{statusLabel[order.status]}</td><td className="px-4 py-3">{order.items.length}</td><td className="px-4 py-3 text-neutral-600">{new Date(order.createdAt).toLocaleString("pt-BR")}</td></tr>; })}{!loading && history.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Nenhum pedido finalizado ainda.</td></tr>}</tbody></table></div></div>
      </section>
    </div>
  );
}
