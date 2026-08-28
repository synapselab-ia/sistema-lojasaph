import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { PurchaseOrderStatus, RuntimePurchaseOrder } from "../adapters/supabase-purchase-gateway";

export const purchaseOrderStatusLabels: Record<PurchaseOrderStatus, string> = {
  draft: "Rascunho",
  ordered: "Emitido",
  partially_received: "Recebido parcialmente",
  received: "Recebido",
  cancelled: "Cancelado",
};

export const purchaseOrderStatusTones: Record<PurchaseOrderStatus, "neutral" | "info" | "attention" | "success" | "danger"> = {
  draft: "neutral",
  ordered: "info",
  partially_received: "attention",
  received: "success",
  cancelled: "danger",
};

export function purchaseOrderPendingQuantity(order: RuntimePurchaseOrder): Quantity {
  return order.items.reduce(
    (total, item) => total.add(item.orderedQuantity.subtract(item.receivedQuantity)),
    Quantity.zero(),
  );
}

export function purchaseOrderPendingLineCount(order: RuntimePurchaseOrder): number {
  return order.items.filter((item) => item.orderedQuantity.subtract(item.receivedQuantity).isPositive()).length;
}

export function purchaseOrderTotal(order: RuntimePurchaseOrder): Money {
  const cents = order.items.reduce((total, item) => (
    total + Math.round((item.unitPriceSnapshot.cents * item.orderedQuantity.milliunits) / 1000)
  ), 0);
  return Money.fromCents(cents);
}

export function isPurchaseOrderOpen(order: RuntimePurchaseOrder): boolean {
  return order.status !== "received" && order.status !== "cancelled";
}

export function isPurchaseOrderFinal(order: RuntimePurchaseOrder): boolean {
  return order.status === "received" || order.status === "cancelled";
}

export function canReceivePurchaseOrder(order: RuntimePurchaseOrder): boolean {
  return (order.status === "ordered" || order.status === "partially_received")
    && purchaseOrderPendingLineCount(order) > 0;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function filterPurchaseOrders({
  orders,
  search,
  status,
  supplierNames,
  locationNames,
  stockItemNames,
}: {
  orders: readonly RuntimePurchaseOrder[];
  search: string;
  status: PurchaseOrderStatus | "all";
  supplierNames: ReadonlyMap<EntityId, string>;
  locationNames: ReadonlyMap<EntityId, string>;
  stockItemNames: ReadonlyMap<EntityId, string>;
}): readonly RuntimePurchaseOrder[] {
  const query = normalize(search);

  return orders.filter((order) => {
    if (status !== "all" && order.status !== status) return false;
    if (!query) return true;

    const searchable = [
      supplierNames.get(order.supplierId) ?? "",
      locationNames.get(order.stockLocationId) ?? "",
      purchaseOrderStatusLabels[order.status],
      order.notes ?? "",
      ...order.items.map((item) => stockItemNames.get(item.stockItemId) ?? ""),
    ].map(normalize);

    return searchable.some((value) => value.includes(query));
  });
}

export function formatPurchaseMoney(value: Money): string {
  return `R$ ${value.toDecimal().replace(".", ",")}`;
}
