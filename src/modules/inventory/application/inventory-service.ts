import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { StockItemRepository } from "@/modules/catalog/repositories/stock-item-repository";
import {
  InventoryBalance,
  StockMovement,
  StockTransfer,
  createStockMovement,
  createStockTransfer,
} from "../domain/inventory";
import { InventoryBalanceRepository } from "../repositories/inventory-balance-repository";
import { StockMovementRepository } from "../repositories/stock-movement-repository";
import { StockTransferRepository } from "../repositories/stock-transfer-repository";

interface EntryCommand {
  organizationId: EntityId;
  stockItemId: EntityId;
  stockLocationId: EntityId;
  quantity: string;
  unitCost: string;
  responsibleUserId?: EntityId;
  notes?: string;
}

interface WithdrawalCommand {
  organizationId: EntityId;
  stockItemId: EntityId;
  stockLocationId: EntityId;
  quantity: string;
  responsibleUserId?: EntityId;
  notes?: string;
}

interface TransferCommand {
  organizationId: EntityId;
  stockItemId: EntityId;
  sourceLocationId: EntityId;
  destinationLocationId: EntityId;
  quantity: string;
  responsibleUserId?: EntityId;
  notes?: string;
}

function assertPositive(quantity: Quantity) {
  if (!quantity.isPositive()) {
    throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity must be greater than zero.");
  }
}

function weightedAverage(
  currentQuantity: Quantity,
  currentCost: Money,
  incomingQuantity: Quantity,
  incomingCost: Money,
): Money {
  if (currentQuantity.isZero()) return incomingCost;

  const currentWeight = BigInt(currentQuantity.milliunits);
  const incomingWeight = BigInt(incomingQuantity.milliunits);
  const denominator = currentWeight + incomingWeight;
  const numerator = currentWeight * BigInt(currentCost.cents) + incomingWeight * BigInt(incomingCost.cents);
  const rounded = (numerator + denominator / 2n) / denominator;
  const cents = Number(rounded);

  if (!Number.isSafeInteger(cents)) {
    throw new DomainError("COST_OVERFLOW", "Calculated average cost exceeds supported range.");
  }

  return Money.fromCents(cents);
}

export class InventoryService {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly stockItems: StockItemRepository,
    private readonly balances: InventoryBalanceRepository,
    private readonly movements: StockMovementRepository,
    private readonly transfers: StockTransferRepository,
  ) {}

  listBalances(): Promise<readonly InventoryBalance[]> {
    return this.balances.list();
  }

  listMovements(): Promise<readonly StockMovement[]> {
    return this.movements.list();
  }

  listTransfers(): Promise<readonly StockTransfer[]> {
    return this.transfers.list();
  }

  recordEntry(command: EntryCommand): Promise<InventoryBalance> {
    return this.exclusive(async () => {
      await this.assertItem(command.stockItemId);
      const quantity = Quantity.fromDecimal(command.quantity);
      const unitCost = Money.fromDecimal(command.unitCost);
      assertPositive(quantity);
      if (unitCost.isNegative()) {
        throw new DomainError("INVALID_STOCK_COST", "Unit cost cannot be negative.");
      }

      const current = await this.getBalance(command.stockItemId, command.stockLocationId);
      const next: InventoryBalance = Object.freeze({
        stockItemId: command.stockItemId,
        stockLocationId: command.stockLocationId,
        quantity: current.quantity.add(quantity),
        averageCost: weightedAverage(current.quantity, current.averageCost, quantity, unitCost),
      });

      const movement = createStockMovement({
        organizationId: command.organizationId,
        type: "entry",
        occurredAt: new Date().toISOString(),
        destinationLocationId: command.stockLocationId,
        responsibleUserId: command.responsibleUserId,
        notes: command.notes?.trim() || undefined,
        lines: [{ stockItemId: command.stockItemId, quantity, unitCostSnapshot: unitCost }],
      });

      await this.balances.save(next);
      await this.movements.append(movement);
      return next;
    });
  }

  withdraw(command: WithdrawalCommand): Promise<InventoryBalance> {
    return this.exclusive(async () => {
      await this.assertItem(command.stockItemId);
      const quantity = Quantity.fromDecimal(command.quantity);
      assertPositive(quantity);
      const current = await this.getBalance(command.stockItemId, command.stockLocationId);
      this.assertAvailable(current, quantity);

      const nextQuantity = current.quantity.subtract(quantity);
      const next: InventoryBalance = Object.freeze({
        ...current,
        quantity: nextQuantity,
        averageCost: nextQuantity.isZero() ? Money.zero() : current.averageCost,
      });
      const movement = createStockMovement({
        organizationId: command.organizationId,
        type: "withdrawal",
        occurredAt: new Date().toISOString(),
        sourceLocationId: command.stockLocationId,
        responsibleUserId: command.responsibleUserId,
        notes: command.notes?.trim() || undefined,
        lines: [{ stockItemId: command.stockItemId, quantity, unitCostSnapshot: current.averageCost }],
      });

      await this.balances.save(next);
      await this.movements.append(movement);
      return next;
    });
  }

  dispatchTransfer(command: TransferCommand): Promise<StockTransfer> {
    return this.exclusive(async () => {
      await this.assertItem(command.stockItemId);
      if (command.sourceLocationId === command.destinationLocationId) {
        throw new DomainError("SAME_TRANSFER_LOCATION", "Transfer source and destination must be different.");
      }

      const quantity = Quantity.fromDecimal(command.quantity);
      assertPositive(quantity);
      const source = await this.getBalance(command.stockItemId, command.sourceLocationId);
      this.assertAvailable(source, quantity);
      const nextSourceQuantity = source.quantity.subtract(quantity);
      const transferId = newEntityId();

      const transfer = Object.freeze({
        ...createStockTransfer({
          organizationId: command.organizationId,
          sourceLocationId: command.sourceLocationId,
          destinationLocationId: command.destinationLocationId,
          dispatchedAt: new Date().toISOString(),
          responsibleUserId: command.responsibleUserId,
          notes: command.notes?.trim() || undefined,
          lines: [
            {
              stockItemId: command.stockItemId,
              dispatchedQuantity: quantity,
              receivedQuantity: Quantity.zero(),
              unitCostSnapshot: source.averageCost,
            },
          ],
        }),
        id: transferId,
      });

      const movement = createStockMovement({
        organizationId: command.organizationId,
        type: "transfer_out",
        occurredAt: transfer.dispatchedAt,
        sourceLocationId: command.sourceLocationId,
        destinationLocationId: command.destinationLocationId,
        responsibleUserId: command.responsibleUserId,
        referenceId: transfer.id,
        notes: transfer.notes,
        lines: [{ stockItemId: command.stockItemId, quantity, unitCostSnapshot: source.averageCost }],
      });

      await this.balances.save({
        ...source,
        quantity: nextSourceQuantity,
        averageCost: nextSourceQuantity.isZero() ? Money.zero() : source.averageCost,
      });
      await this.transfers.save(transfer);
      await this.movements.append(movement);
      return transfer;
    });
  }

  receiveTransfer(input: { transferId: EntityId; quantity?: string; responsibleUserId?: EntityId }): Promise<StockTransfer> {
    return this.exclusive(async () => {
      const transfer = await this.transfers.findById(input.transferId);
      if (!transfer) throw new DomainError("TRANSFER_NOT_FOUND", "Transfer not found.");
      if (transfer.status === "received" || transfer.status === "cancelled") {
        throw new DomainError("TRANSFER_NOT_RECEIVABLE", "Transfer cannot receive more items.");
      }
      const line = transfer.lines[0];
      if (!line) throw new DomainError("EMPTY_TRANSFER", "Transfer has no items.");

      const pending = line.dispatchedQuantity.subtract(line.receivedQuantity);
      const receiveQuantity = input.quantity ? Quantity.fromDecimal(input.quantity) : pending;
      assertPositive(receiveQuantity);
      if (pending.isLessThan(receiveQuantity)) {
        throw new DomainError("TRANSFER_RECEIPT_EXCEEDS_PENDING", "Received quantity exceeds transfer pending quantity.");
      }

      const destination = await this.getBalance(line.stockItemId, transfer.destinationLocationId);
      const nextDestination: InventoryBalance = Object.freeze({
        ...destination,
        quantity: destination.quantity.add(receiveQuantity),
        averageCost: weightedAverage(destination.quantity, destination.averageCost, receiveQuantity, line.unitCostSnapshot),
      });
      const nextReceived = line.receivedQuantity.add(receiveQuantity);
      const completed = nextReceived.milliunits === line.dispatchedQuantity.milliunits;
      const occurredAt = new Date().toISOString();
      const nextTransfer: StockTransfer = Object.freeze({
        ...transfer,
        status: completed ? "received" : "partially_received",
        receivedAt: completed ? occurredAt : transfer.receivedAt,
        lines: [Object.freeze({ ...line, receivedQuantity: nextReceived })],
      });
      const movement = createStockMovement({
        organizationId: transfer.organizationId,
        type: "transfer_in",
        occurredAt,
        sourceLocationId: transfer.sourceLocationId,
        destinationLocationId: transfer.destinationLocationId,
        responsibleUserId: input.responsibleUserId,
        referenceId: transfer.id,
        notes: transfer.notes,
        lines: [{ stockItemId: line.stockItemId, quantity: receiveQuantity, unitCostSnapshot: line.unitCostSnapshot }],
      });

      await this.balances.save(nextDestination);
      await this.transfers.save(nextTransfer);
      await this.movements.append(movement);
      return nextTransfer;
    });
  }

  private async assertItem(stockItemId: EntityId) {
    const item = await this.stockItems.findById(stockItemId);
    if (!item || !item.active) {
      throw new DomainError("STOCK_ITEM_NOT_AVAILABLE", "Stock item does not exist or is inactive.");
    }
  }

  private async getBalance(stockItemId: EntityId, stockLocationId: EntityId): Promise<InventoryBalance> {
    return (
      (await this.balances.get(stockItemId, stockLocationId)) ??
      Object.freeze({
        stockItemId,
        stockLocationId,
        quantity: Quantity.zero(),
        averageCost: Money.zero(),
      })
    );
  }

  private assertAvailable(balance: InventoryBalance, requested: Quantity) {
    if (balance.quantity.isLessThan(requested)) {
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        `Insufficient stock. Available: ${balance.quantity.toDecimal()}.`,
      );
    }
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
