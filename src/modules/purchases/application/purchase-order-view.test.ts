import { describe, expect, it } from "vitest";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { RuntimePurchaseOrder } from "../adapters/supabase-purchase-gateway";
import {
  canReceivePurchaseOrder,
  filterPurchaseOrders,
  purchaseOrderPendingLineCount,
  purchaseOrderPendingQuantity,
  purchaseOrderTotal,
} from "./purchase-order-view";

const order: RuntimePurchaseOrder = {
  id: "order-1" as RuntimePurchaseOrder["id"],
  supplierId: "supplier-1" as RuntimePurchaseOrder["supplierId"],
  stockLocationId: "location-1" as RuntimePurchaseOrder["stockLocationId"],
  status: "partially_received",
  notes: "Reposição semanal",
  createdAt: "2026-08-28T12:00:00.000Z",
  items: [
    {
      id: "item-1" as RuntimePurchaseOrder["items"][number]["id"],
      supplierItemId: "supplier-item-1" as RuntimePurchaseOrder["items"][number]["supplierItemId"],
      stockItemId: "stock-1" as RuntimePurchaseOrder["items"][number]["stockItemId"],
      orderedQuantity: Quantity.fromDecimal("10"),
      receivedQuantity: Quantity.fromDecimal("4"),
      unitPriceSnapshot: Money.fromDecimal("2.50"),
    },
    {
      id: "item-2" as RuntimePurchaseOrder["items"][number]["id"],
      supplierItemId: "supplier-item-2" as RuntimePurchaseOrder["items"][number]["supplierItemId"],
      stockItemId: "stock-2" as RuntimePurchaseOrder["items"][number]["stockItemId"],
      orderedQuantity: Quantity.fromDecimal("2.5"),
      receivedQuantity: Quantity.fromDecimal("2.5"),
      unitPriceSnapshot: Money.fromDecimal("4.00"),
    },
  ],
};

describe("purchase order view helpers", () => {
  it("calculates pending quantities and totals from domain values", () => {
    expect(purchaseOrderPendingQuantity(order).toDecimal()).toBe("6");
    expect(purchaseOrderPendingLineCount(order)).toBe(1);
    expect(purchaseOrderTotal(order).toDecimal()).toBe("35.00");
    expect(canReceivePurchaseOrder(order)).toBe(true);
  });

  it("filters by status and accent-insensitive business context", () => {
    const supplierNames = new Map([[order.supplierId, "Distribuição São José"]]);
    const locationNames = new Map([[order.stockLocationId, "Loja Centro — Depósito"]]);
    const stockItemNames = new Map([
      [order.items[0].stockItemId, "Açúcar refinado"],
      [order.items[1].stockItemId, "Café"],
    ]);

    expect(filterPurchaseOrders({
      orders: [order],
      search: "distribuicao sao jose",
      status: "partially_received",
      supplierNames,
      locationNames,
      stockItemNames,
    })).toHaveLength(1);

    expect(filterPurchaseOrders({
      orders: [order],
      search: "acucar",
      status: "received",
      supplierNames,
      locationNames,
      stockItemNames,
    })).toHaveLength(0);
  });
});
