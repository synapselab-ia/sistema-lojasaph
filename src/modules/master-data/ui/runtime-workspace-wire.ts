import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import type { RuntimeWorkspaceInitialData } from "./runtime-workspace-provider";

type Balance = RuntimeWorkspaceInitialData["balances"][number];
type Batch = RuntimeWorkspaceInitialData["batches"][number];
type Transfer = RuntimeWorkspaceInitialData["transfers"][number];
type StockLoss = RuntimeWorkspaceInitialData["stockLosses"][number];
type StockMinimumPolicy = RuntimeWorkspaceInitialData["stockMinimumPolicies"][number];

type QuantityWire = { readonly milliunits: number };
type MoneyWire = { readonly cents: number };

type BalanceWire = Omit<Balance, "quantity" | "averageCost"> & {
  readonly quantity: QuantityWire;
  readonly averageCost: MoneyWire;
};

type BatchWire = Omit<Batch, "originalQuantity" | "remainingQuantity" | "unitCost"> & {
  readonly originalQuantity: QuantityWire;
  readonly remainingQuantity: QuantityWire;
  readonly unitCost: MoneyWire;
};

type TransferWire = Omit<Transfer, "dispatchedQuantity" | "receivedQuantity" | "unitCostSnapshot"> & {
  readonly dispatchedQuantity: QuantityWire;
  readonly receivedQuantity: QuantityWire;
  readonly unitCostSnapshot: MoneyWire;
};

type StockLossWire = Omit<StockLoss, "quantity" | "unitCostSnapshot"> & {
  readonly quantity: QuantityWire;
  readonly unitCostSnapshot: MoneyWire;
};

type StockMinimumPolicyWire = Omit<StockMinimumPolicy, "minimumQuantity"> & {
  readonly minimumQuantity: QuantityWire;
};

export type RuntimeWorkspaceInitialDataWire = Omit<
  RuntimeWorkspaceInitialData,
  "balances" | "batches" | "transfers" | "stockLosses" | "stockMinimumPolicies"
> & {
  readonly balances: readonly BalanceWire[];
  readonly batches: readonly BatchWire[];
  readonly transfers: readonly TransferWire[];
  readonly stockLosses: readonly StockLossWire[];
  readonly stockMinimumPolicies: readonly StockMinimumPolicyWire[];
};

export function serializeRuntimeWorkspaceInitialData(
  input: RuntimeWorkspaceInitialData,
): RuntimeWorkspaceInitialDataWire {
  return {
    ...input,
    balances: input.balances.map((balance) => ({
      ...balance,
      quantity: { milliunits: balance.quantity.milliunits },
      averageCost: { cents: balance.averageCost.cents },
    })),
    batches: input.batches.map((batch) => ({
      ...batch,
      originalQuantity: { milliunits: batch.originalQuantity.milliunits },
      remainingQuantity: { milliunits: batch.remainingQuantity.milliunits },
      unitCost: { cents: batch.unitCost.cents },
    })),
    transfers: input.transfers.map((transfer) => ({
      ...transfer,
      dispatchedQuantity: { milliunits: transfer.dispatchedQuantity.milliunits },
      receivedQuantity: { milliunits: transfer.receivedQuantity.milliunits },
      unitCostSnapshot: { cents: transfer.unitCostSnapshot.cents },
    })),
    stockLosses: input.stockLosses.map((loss) => ({
      ...loss,
      quantity: { milliunits: loss.quantity.milliunits },
      unitCostSnapshot: { cents: loss.unitCostSnapshot.cents },
    })),
    stockMinimumPolicies: input.stockMinimumPolicies.map((policy) => ({
      ...policy,
      minimumQuantity: { milliunits: policy.minimumQuantity.milliunits },
    })),
  };
}

export function hydrateRuntimeWorkspaceInitialData(
  input: RuntimeWorkspaceInitialDataWire,
): RuntimeWorkspaceInitialData {
  return {
    ...input,
    balances: input.balances.map((balance) => ({
      ...balance,
      quantity: Quantity.fromMilliunits(balance.quantity.milliunits),
      averageCost: Money.fromCents(balance.averageCost.cents),
    })),
    batches: input.batches.map((batch) => ({
      ...batch,
      originalQuantity: Quantity.fromMilliunits(batch.originalQuantity.milliunits),
      remainingQuantity: Quantity.fromMilliunits(batch.remainingQuantity.milliunits),
      unitCost: Money.fromCents(batch.unitCost.cents),
    })),
    transfers: input.transfers.map((transfer) => ({
      ...transfer,
      dispatchedQuantity: Quantity.fromMilliunits(transfer.dispatchedQuantity.milliunits),
      receivedQuantity: Quantity.fromMilliunits(transfer.receivedQuantity.milliunits),
      unitCostSnapshot: Money.fromCents(transfer.unitCostSnapshot.cents),
    })),
    stockLosses: input.stockLosses.map((loss) => ({
      ...loss,
      quantity: Quantity.fromMilliunits(loss.quantity.milliunits),
      unitCostSnapshot: Money.fromCents(loss.unitCostSnapshot.cents),
    })),
    stockMinimumPolicies: input.stockMinimumPolicies.map((policy) => ({
      ...policy,
      minimumQuantity: Quantity.fromMilliunits(policy.minimumQuantity.milliunits),
    })),
  };
}
