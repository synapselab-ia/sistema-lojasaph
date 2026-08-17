import { asEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { InventoryBalance, StockMovement } from "../domain/inventory";
import { DEMO_ORGANIZATION_ID } from "@/modules/master-data/fixtures/demo-data";

export const DEMO_USER_ID = asEntityId("user-demo-operator");

export const demoInventoryBalances: readonly InventoryBalance[] = [
  {
    stockItemId: asEntityId("item-agua-500"),
    stockLocationId: asEntityId("stock-tab-principal"),
    quantity: Quantity.fromDecimal("100"),
    averageCost: Money.fromDecimal("2.10"),
  },
  {
    stockItemId: asEntityId("item-espeto-demo"),
    stockLocationId: asEntityId("stock-tab-principal"),
    quantity: Quantity.fromDecimal("50"),
    averageCost: Money.fromDecimal("8.50"),
  },
  {
    stockItemId: asEntityId("item-carvao-demo"),
    stockLocationId: asEntityId("stock-tab-principal"),
    quantity: Quantity.fromDecimal("20"),
    averageCost: Money.fromDecimal("20.00"),
  },
];

export const demoInventoryMovements: readonly StockMovement[] = demoInventoryBalances.map((balance, index) => ({
  id: asEntityId(`opening-movement-${index + 1}`),
  organizationId: DEMO_ORGANIZATION_ID,
  type: "opening_balance",
  occurredAt: `2026-08-01T10:0${index}:00.000Z`,
  destinationLocationId: balance.stockLocationId,
  responsibleUserId: DEMO_USER_ID,
  notes: "Saldo inicial de demonstração",
  lines: [
    {
      stockItemId: balance.stockItemId,
      quantity: balance.quantity,
      unitCostSnapshot: balance.averageCost,
    },
  ],
}));
