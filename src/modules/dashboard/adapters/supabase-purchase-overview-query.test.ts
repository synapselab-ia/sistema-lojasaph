import { describe, expect, it } from "vitest";
import {
  buildSupplierPriceChanges,
  isTimestampInUtcPeriod,
  PurchaseOrderRow,
  PurchaseReceiptRow,
  StockItemRow,
  SupplierItemRow,
  SupplierPriceRow,
  SupplierRow,
  summarizeSupplierPurchases,
} from "./supabase-purchase-overview-query";
import { stockPeriodUtcBounds } from "./supabase-stock-overview-query";

const supplierA = "20000000-0000-4000-8000-000000000001";
const supplierB = "20000000-0000-4000-8000-000000000002";
const supplierItemA = "21000000-0000-4000-8000-000000000001";
const supplierItemB = "21000000-0000-4000-8000-000000000002";
const stockItemA = "22000000-0000-4000-8000-000000000001";
const stockItemB = "22000000-0000-4000-8000-000000000002";
const locationA = "23000000-0000-4000-8000-000000000001";

const suppliers: readonly SupplierRow[] = [
  { id: supplierA, trade_name: "Fornecedor A" },
  { id: supplierB, trade_name: "Fornecedor B" },
];
const supplierItems: readonly SupplierItemRow[] = [
  { id: supplierItemA, supplier_id: supplierA, stock_item_id: stockItemA },
  { id: supplierItemB, supplier_id: supplierB, stock_item_id: stockItemB },
];
const stockItems: readonly StockItemRow[] = [
  { id: stockItemA, name: "Item A" },
  { id: stockItemB, name: "Item B" },
];

function order(id: string, supplierId: string, orderedAt: string): PurchaseOrderRow {
  return { id, supplier_id: supplierId, stock_location_id: locationA, ordered_at: orderedAt };
}

function receipt(id: string, purchaseOrderId: string, receivedAt: string): PurchaseReceiptRow {
  return { id, purchase_order_id: purchaseOrderId, received_at: receivedAt };
}

function price(
  id: string,
  supplierItemId: string,
  unitPrice: string,
  observedAt: string,
): SupplierPriceRow {
  return { id, supplier_item_id: supplierItemId, unit_price: unitPrice, observed_at: observedAt };
}

describe("purchase dashboard overview helpers", () => {
  it("reuses inclusive organization-local period bounds for purchase timestamps", () => {
    expect(stockPeriodUtcBounds(
      "2026-08-01",
      "2026-08-31",
      "America/Sao_Paulo",
    )).toEqual({
      startInclusive: "2026-08-01T03:00:00.000Z",
      endExclusive: "2026-09-01T03:00:00.000Z",
    });
  });

  it("compares timestamp instants instead of ISO string formatting at period boundaries", () => {
    const bounds = {
      startInclusive: "2026-08-01T03:00:00.000Z",
      endExclusive: "2026-08-02T03:00:00.000Z",
    };

    expect(isTimestampInUtcPeriod("2026-08-01T03:00:00+00:00", bounds)).toBe(true);
    expect(isTimestampInUtcPeriod("2026-08-02T02:59:59.999+00:00", bounds)).toBe(true);
    expect(isTimestampInUtcPeriod("2026-08-02T03:00:00+00:00", bounds)).toBe(false);
  });

  it("keeps a receipt in the period even when its order was issued before the period", () => {
    const oldOrder = order(
      "24000000-0000-4000-8000-000000000001",
      supplierA,
      "2026-07-30T12:00:00.000Z",
    );
    const inPeriodReceipt = receipt(
      "25000000-0000-4000-8000-000000000001",
      oldOrder.id,
      "2026-08-02T12:00:00.000Z",
    );

    expect(summarizeSupplierPurchases([], [inPeriodReceipt], [oldOrder], suppliers)).toEqual([
      {
        supplierId: supplierA,
        supplierName: "Fornecedor A",
        issuedOrderCount: 0,
        receiptCount: 1,
        lastActivityAt: "2026-08-02T12:00:00.000Z",
      },
    ]);
  });

  it("groups factual order and receipt history by supplier without summing quantities", () => {
    const orderA = order(
      "24000000-0000-4000-8000-000000000001",
      supplierA,
      "2026-08-01T12:00:00.000Z",
    );
    const orderB = order(
      "24000000-0000-4000-8000-000000000002",
      supplierB,
      "2026-08-03T12:00:00.000Z",
    );
    const receiptA = receipt(
      "25000000-0000-4000-8000-000000000001",
      orderA.id,
      "2026-08-04T12:00:00.000Z",
    );

    expect(summarizeSupplierPurchases(
      [orderA, orderB],
      [receiptA],
      [orderA, orderB],
      suppliers,
    )).toEqual([
      {
        supplierId: supplierA,
        supplierName: "Fornecedor A",
        issuedOrderCount: 1,
        receiptCount: 1,
        lastActivityAt: "2026-08-04T12:00:00.000Z",
      },
      {
        supplierId: supplierB,
        supplierName: "Fornecedor B",
        issuedOrderCount: 1,
        receiptCount: 0,
        lastActivityAt: "2026-08-03T12:00:00.000Z",
      },
    ]);
  });

  it("does not claim price variation without two observations for the same supplier item", () => {
    const result = buildSupplierPriceChanges([
      price("26000000-0000-4000-8000-000000000001", supplierItemA, "10.00", "2026-08-01T12:00:00.000Z"),
      price("26000000-0000-4000-8000-000000000002", supplierItemB, "20.00", "2026-08-01T12:00:00.000Z"),
    ], supplierItems, suppliers, stockItems);

    expect(result.comparablePriceItemCount).toBe(0);
    expect(result.changedPriceItemCount).toBe(0);
    expect(result.recentPriceChanges).toEqual([]);
  });

  it("compares only the two latest observations of the same supplier item", () => {
    const result = buildSupplierPriceChanges([
      price("26000000-0000-4000-8000-000000000001", supplierItemA, "9.00", "2026-08-01T12:00:00.000Z"),
      price("26000000-0000-4000-8000-000000000002", supplierItemA, "10.00", "2026-08-02T12:00:00.000Z"),
      price("26000000-0000-4000-8000-000000000003", supplierItemA, "11.50", "2026-08-03T12:00:00.000Z"),
    ], supplierItems, suppliers, stockItems);

    expect(result.comparablePriceItemCount).toBe(1);
    expect(result.changedPriceItemCount).toBe(1);
    expect(result.recentPriceChanges).toHaveLength(1);
    expect(result.recentPriceChanges[0].supplierName).toBe("Fornecedor A");
    expect(result.recentPriceChanges[0].stockItemName).toBe("Item A");
    expect(result.recentPriceChanges[0].previousPrice.toDecimal()).toBe("10.00");
    expect(result.recentPriceChanges[0].currentPrice.toDecimal()).toBe("11.50");
    expect(result.recentPriceChanges[0].delta.toDecimal()).toBe("1.50");
  });

  it("treats equal comparable prices as history without a price change", () => {
    const result = buildSupplierPriceChanges([
      price("26000000-0000-4000-8000-000000000001", supplierItemA, "10.00", "2026-08-01T12:00:00.000Z"),
      price("26000000-0000-4000-8000-000000000002", supplierItemA, "10.00", "2026-08-02T12:00:00.000Z"),
    ], supplierItems, suppliers, stockItems);

    expect(result.comparablePriceItemCount).toBe(1);
    expect(result.changedPriceItemCount).toBe(0);
    expect(result.recentPriceChanges).toEqual([]);
  });
});
