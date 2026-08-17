import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { StockItem } from "@/modules/catalog/domain/stock-item";
import { StockItemRepository } from "@/modules/catalog/repositories/stock-item-repository";
import { sortBatchesFefo } from "../domain/expiry";
import {
  InventoryBalance,
  InventoryBatch,
  InventoryCount,
  StockMovement,
  StockMovementBatchAllocation,
  StockTransfer,
  StockTransferBatchAllocation,
  createInventoryBatch,
  createInventoryCount,
  createStockMovement,
  createStockTransfer,
} from "../domain/inventory";
import { InventoryBalanceRepository } from "../repositories/inventory-balance-repository";
import { InventoryBatchRepository } from "../repositories/inventory-batch-repository";
import { InventoryCountRepository } from "../repositories/inventory-count-repository";
import { StockMovementRepository } from "../repositories/stock-movement-repository";
import { StockTransferRepository } from "../repositories/stock-transfer-repository";

interface EntryCommand {
  organizationId: EntityId;
  stockItemId: EntityId;
  stockLocationId: EntityId;
  quantity: string;
  unitCost: string;
  batchCode?: string;
  expirationDate?: string;
  responsibleUserId?: EntityId;
  notes?: string;
}

interface WithdrawalCommand {
  organizationId: EntityId;
  stockItemId: EntityId;
  stockLocationId: EntityId;
  quantity: string;
  preferredBatchId?: EntityId;
  responsibleUserId?: EntityId;
  notes?: string;
}

interface TransferCommand {
  organizationId: EntityId;
  stockItemId: EntityId;
  sourceLocationId: EntityId;
  destinationLocationId: EntityId;
  quantity: string;
  preferredBatchId?: EntityId;
  responsibleUserId?: EntityId;
  notes?: string;
}

function assertPositive(quantity: Quantity) {
  if (!quantity.isPositive()) {
    throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity must be greater than zero.");
  }
}

function assertNonNegative(quantity: Quantity) {
  if (quantity.isNegative()) {
    throw new DomainError("INVALID_STOCK_QUANTITY", "Stock quantity cannot be negative.");
  }
}

function normalizedDateOnly(value?: string): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(new Date(`${normalized}T00:00:00.000Z`).getTime())) {
    throw new DomainError("INVALID_EXPIRATION_DATE", "Expiration date must use YYYY-MM-DD.");
  }
  return normalized;
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
    private readonly batches: InventoryBatchRepository,
    private readonly counts: InventoryCountRepository,
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

  listBatches(): Promise<readonly InventoryBatch[]> {
    return this.batches.list();
  }

  listInventoryCounts(): Promise<readonly InventoryCount[]> {
    return this.counts.list();
  }

  recordEntry(command: EntryCommand): Promise<InventoryBalance> {
    return this.exclusive(async () => {
      const item = await this.assertItem(command.stockItemId);
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

      const batch = this.shouldTrackBatch(item, command.batchCode, command.expirationDate)
        ? createInventoryBatch({
            stockItemId: command.stockItemId,
            stockLocationId: command.stockLocationId,
            batchCode: command.batchCode?.trim() || undefined,
            expirationDate: normalizedDateOnly(command.expirationDate),
            receivedAt: new Date().toISOString(),
            originalQuantity: quantity,
            remainingQuantity: quantity,
            unitCost,
            sourceType: "entry",
          })
        : null;

      const movement = createStockMovement({
        organizationId: command.organizationId,
        type: "entry",
        occurredAt: new Date().toISOString(),
        destinationLocationId: command.stockLocationId,
        responsibleUserId: command.responsibleUserId,
        notes: command.notes?.trim() || undefined,
        lines: [
          {
            stockItemId: command.stockItemId,
            quantity,
            unitCostSnapshot: unitCost,
            batchAllocations: batch ? [{ batchId: batch.id, quantity }] : undefined,
          },
        ],
      });

      await this.balances.save(next);
      if (batch) await this.batches.save(batch);
      await this.movements.append(movement);
      return next;
    });
  }

  withdraw(command: WithdrawalCommand): Promise<InventoryBalance> {
    return this.exclusive(async () => {
      const item = await this.assertItem(command.stockItemId);
      const quantity = Quantity.fromDecimal(command.quantity);
      assertPositive(quantity);
      const current = await this.getBalance(command.stockItemId, command.stockLocationId);
      this.assertAvailable(current, quantity);
      const batchAllocations = this.requiresBatchAllocation(item)
        ? await this.consumeBatches(command.stockItemId, command.stockLocationId, quantity, command.preferredBatchId)
        : undefined;

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
        lines: [{ stockItemId: command.stockItemId, quantity, unitCostSnapshot: current.averageCost, batchAllocations }],
      });

      await this.balances.save(next);
      await this.movements.append(movement);
      return next;
    });
  }

  dispatchTransfer(command: TransferCommand): Promise<StockTransfer> {
    return this.exclusive(async () => {
      const item = await this.assertItem(command.stockItemId);
      if (command.sourceLocationId === command.destinationLocationId) {
        throw new DomainError("SAME_TRANSFER_LOCATION", "Transfer source and destination must be different.");
      }

      const quantity = Quantity.fromDecimal(command.quantity);
      assertPositive(quantity);
      const source = await this.getBalance(command.stockItemId, command.sourceLocationId);
      this.assertAvailable(source, quantity);
      const nextSourceQuantity = source.quantity.subtract(quantity);
      const batchAllocations = this.requiresBatchAllocation(item)
        ? await this.consumeBatches(command.stockItemId, command.sourceLocationId, quantity, command.preferredBatchId)
        : undefined;
      const batchTransfers = batchAllocations
        ? await Promise.all(
            batchAllocations.map(async (allocation): Promise<StockTransferBatchAllocation> => {
              const sourceBatch = await this.batches.findById(allocation.batchId);
              if (!sourceBatch) throw new DomainError("BATCH_NOT_FOUND", "Allocated source batch was not found.");
              return Object.freeze({
                sourceBatchId: sourceBatch.id,
                destinationBatchId: newEntityId(),
                quantity: allocation.quantity,
                receivedQuantity: Quantity.zero(),
                batchCode: sourceBatch.batchCode,
                expirationDate: sourceBatch.expirationDate,
                unitCostSnapshot: sourceBatch.unitCost,
              });
            }),
          )
        : undefined;

      const transfer = createStockTransfer({
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
            batchAllocations: batchTransfers,
          },
        ],
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
        lines: [{ stockItemId: command.stockItemId, quantity, unitCostSnapshot: source.averageCost, batchAllocations }],
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
      const receivedBatchAllocations = line.batchAllocations
        ? await this.receiveTransferBatches(line.batchAllocations, receiveQuantity, transfer.destinationLocationId, transfer.id, occurredAt)
        : undefined;
      const nextTransfer: StockTransfer = Object.freeze({
        ...transfer,
        status: completed ? "received" : "partially_received",
        receivedAt: completed ? occurredAt : transfer.receivedAt,
        lines: [
          Object.freeze({
            ...line,
            receivedQuantity: nextReceived,
            batchAllocations: receivedBatchAllocations?.updatedTransferAllocations ?? line.batchAllocations,
          }),
        ],
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
        lines: [
          {
            stockItemId: line.stockItemId,
            quantity: receiveQuantity,
            unitCostSnapshot: line.unitCostSnapshot,
            batchAllocations: receivedBatchAllocations?.movementAllocations,
          },
        ],
      });

      await this.balances.save(nextDestination);
      await this.transfers.save(nextTransfer);
      await this.movements.append(movement);
      return nextTransfer;
    });
  }

  startInventoryCount(input: {
    organizationId: EntityId;
    stockLocationId: EntityId;
    responsibleUserId?: EntityId;
  }): Promise<InventoryCount> {
    return this.exclusive(async () => {
      const openCount = (await this.counts.list()).find(
        (count) => count.stockLocationId === input.stockLocationId && count.status === "counting",
      );
      if (openCount) {
        throw new DomainError("INVENTORY_COUNT_ALREADY_OPEN", "There is already an open inventory count for this location.");
      }

      const items = (await this.stockItems.listByOrganization(input.organizationId)).filter((item) => item.active);
      const lines = await Promise.all(
        items.map(async (item) => ({
          stockItemId: item.id,
          expectedQuantity: (await this.getBalance(item.id, input.stockLocationId)).quantity,
        })),
      );
      const count = createInventoryCount({
        organizationId: input.organizationId,
        stockLocationId: input.stockLocationId,
        startedAt: new Date().toISOString(),
        responsibleUserId: input.responsibleUserId,
        lines,
      });
      await this.counts.save(count);
      return count;
    });
  }

  setInventoryCountLine(input: {
    countId: EntityId;
    stockItemId: EntityId;
    countedQuantity: string;
  }): Promise<InventoryCount> {
    return this.exclusive(async () => {
      const count = await this.requireOpenCount(input.countId);
      const quantity = Quantity.fromDecimal(input.countedQuantity);
      assertNonNegative(quantity);
      let found = false;
      const lines = count.lines.map((line) => {
        if (line.stockItemId !== input.stockItemId) return line;
        found = true;
        return Object.freeze({ ...line, countedQuantity: quantity });
      });
      if (!found) throw new DomainError("INVENTORY_COUNT_ITEM_NOT_FOUND", "Item is not part of this inventory count.");
      const next = Object.freeze({ ...count, lines });
      await this.counts.save(next);
      return next;
    });
  }

  confirmInventoryCount(input: { countId: EntityId; responsibleUserId?: EntityId }): Promise<InventoryCount> {
    return this.exclusive(async () => {
      const count = await this.requireOpenCount(input.countId);
      if (count.lines.some((line) => line.countedQuantity === undefined)) {
        throw new DomainError("INVENTORY_COUNT_INCOMPLETE", "All inventory count lines must be counted before confirmation.");
      }

      for (const line of count.lines) {
        const current = await this.getBalance(line.stockItemId, count.stockLocationId);
        if (current.quantity.milliunits !== line.expectedQuantity.milliunits) {
          throw new DomainError(
            "INVENTORY_COUNT_STALE",
            "Stock changed after the inventory count started. Start a new count before confirming.",
          );
        }
      }

      for (const line of count.lines) {
        const counted = line.countedQuantity!;
        const difference = counted.subtract(line.expectedQuantity);
        if (difference.isZero()) continue;

        const item = await this.assertItem(line.stockItemId);
        const current = await this.getBalance(line.stockItemId, count.stockLocationId);
        let batchAllocations: readonly StockMovementBatchAllocation[] | undefined;

        if (difference.isPositive()) {
          if (this.requiresBatchAllocation(item)) {
            const batch = createInventoryBatch({
              stockItemId: line.stockItemId,
              stockLocationId: count.stockLocationId,
              batchCode: `AJUSTE-${count.id.slice(0, 8)}`,
              receivedAt: new Date().toISOString(),
              originalQuantity: difference,
              remainingQuantity: difference,
              unitCost: current.averageCost,
              sourceType: "inventory_adjustment",
              sourceReferenceId: count.id,
            });
            await this.batches.save(batch);
            batchAllocations = [{ batchId: batch.id, quantity: difference }];
          }
          await this.balances.save({ ...current, quantity: counted });
          await this.movements.append(
            createStockMovement({
              organizationId: count.organizationId,
              type: "entry",
              occurredAt: new Date().toISOString(),
              destinationLocationId: count.stockLocationId,
              responsibleUserId: input.responsibleUserId,
              referenceId: count.id,
              reasonCode: "inventory_count_adjustment_positive",
              notes: "Ajuste positivo por inventário físico",
              lines: [{ stockItemId: line.stockItemId, quantity: difference, unitCostSnapshot: current.averageCost, batchAllocations }],
            }),
          );
        } else {
          const absoluteDifference = Quantity.fromMilliunits(Math.abs(difference.milliunits));
          batchAllocations = this.requiresBatchAllocation(item)
            ? await this.consumeBatches(line.stockItemId, count.stockLocationId, absoluteDifference)
            : undefined;
          await this.balances.save({
            ...current,
            quantity: counted,
            averageCost: counted.isZero() ? Money.zero() : current.averageCost,
          });
          await this.movements.append(
            createStockMovement({
              organizationId: count.organizationId,
              type: "withdrawal",
              occurredAt: new Date().toISOString(),
              sourceLocationId: count.stockLocationId,
              responsibleUserId: input.responsibleUserId,
              referenceId: count.id,
              reasonCode: "inventory_count_adjustment_negative",
              notes: "Ajuste negativo por inventário físico",
              lines: [{ stockItemId: line.stockItemId, quantity: absoluteDifference, unitCostSnapshot: current.averageCost, batchAllocations }],
            }),
          );
        }
      }

      const confirmed = Object.freeze({
        ...count,
        status: "confirmed" as const,
        confirmedAt: new Date().toISOString(),
      });
      await this.counts.save(confirmed);
      return confirmed;
    });
  }

  private async assertItem(stockItemId: EntityId): Promise<StockItem> {
    const item = await this.stockItems.findById(stockItemId);
    if (!item || !item.active) {
      throw new DomainError("STOCK_ITEM_NOT_AVAILABLE", "Stock item does not exist or is inactive.");
    }
    return item;
  }

  private shouldTrackBatch(item: StockItem, batchCode?: string, expirationDate?: string): boolean {
    return item.trackBatch || item.trackExpiration || Boolean(batchCode?.trim()) || Boolean(expirationDate?.trim());
  }

  private requiresBatchAllocation(item: StockItem): boolean {
    return item.trackBatch || item.trackExpiration;
  }

  private async getBalance(stockItemId: EntityId, stockLocationId: EntityId): Promise<InventoryBalance> {
    return (
      (await this.balances.get(stockItemId, stockLocationId)) ??
      Object.freeze({ stockItemId, stockLocationId, quantity: Quantity.zero(), averageCost: Money.zero() })
    );
  }

  private assertAvailable(balance: InventoryBalance, requested: Quantity) {
    if (balance.quantity.isLessThan(requested)) {
      throw new DomainError("INSUFFICIENT_STOCK", `Insufficient stock. Available: ${balance.quantity.toDecimal()}.`);
    }
  }

  private async consumeBatches(
    stockItemId: EntityId,
    stockLocationId: EntityId,
    quantity: Quantity,
    preferredBatchId?: EntityId,
  ): Promise<readonly StockMovementBatchAllocation[]> {
    const available = (await this.batches.listByItemLocation(stockItemId, stockLocationId)).filter(
      (batch) => batch.remainingQuantity.isPositive(),
    );
    const preferred = preferredBatchId ? available.find((batch) => batch.id === preferredBatchId) : undefined;
    if (preferredBatchId && !preferred) {
      throw new DomainError("BATCH_NOT_AVAILABLE", "Preferred batch is not available at this location.");
    }
    const ordered = preferred
      ? [preferred, ...sortBatchesFefo(available.filter((batch) => batch.id !== preferred.id))]
      : sortBatchesFefo(available);

    let remaining = quantity;
    const allocations: StockMovementBatchAllocation[] = [];
    for (const batch of ordered) {
      if (remaining.isZero()) break;
      const takeMilliunits = Math.min(batch.remainingQuantity.milliunits, remaining.milliunits);
      if (takeMilliunits <= 0) continue;
      const take = Quantity.fromMilliunits(takeMilliunits);
      allocations.push({ batchId: batch.id, quantity: take });
      await this.batches.save({ ...batch, remainingQuantity: batch.remainingQuantity.subtract(take) });
      remaining = remaining.subtract(take);
    }

    if (!remaining.isZero()) {
      throw new DomainError(
        "INSUFFICIENT_BATCH_STOCK",
        "Tracked batch quantities are insufficient for the requested stock operation.",
      );
    }
    return allocations;
  }

  private async receiveTransferBatches(
    allocations: readonly StockTransferBatchAllocation[],
    receiveQuantity: Quantity,
    destinationLocationId: EntityId,
    transferId: EntityId,
    occurredAt: string,
  ): Promise<{
    updatedTransferAllocations: readonly StockTransferBatchAllocation[];
    movementAllocations: readonly StockMovementBatchAllocation[];
  }> {
    let remaining = receiveQuantity;
    const movementAllocations: StockMovementBatchAllocation[] = [];
    const updatedTransferAllocations: StockTransferBatchAllocation[] = [];

    for (const allocation of allocations) {
      const pending = allocation.quantity.subtract(allocation.receivedQuantity);
      const takeMilliunits = Math.min(pending.milliunits, remaining.milliunits);
      const take = Quantity.fromMilliunits(Math.max(0, takeMilliunits));
      const nextReceived = allocation.receivedQuantity.add(take);
      const updated = Object.freeze({ ...allocation, receivedQuantity: nextReceived });
      updatedTransferAllocations.push(updated);

      if (take.isPositive()) {
        const existingDestinationBatch = await this.batches.findById(allocation.destinationBatchId);
        const destinationBatch = existingDestinationBatch
          ? Object.freeze({
              ...existingDestinationBatch,
              originalQuantity: existingDestinationBatch.originalQuantity.add(take),
              remainingQuantity: existingDestinationBatch.remainingQuantity.add(take),
            })
          : createInventoryBatch({
              id: allocation.destinationBatchId,
              stockItemId: (await this.batches.findById(allocation.sourceBatchId))?.stockItemId ?? (() => { throw new DomainError("BATCH_NOT_FOUND", "Transfer source batch was not found."); })(),
              stockLocationId: destinationLocationId,
              batchCode: allocation.batchCode,
              expirationDate: allocation.expirationDate,
              receivedAt: occurredAt,
              originalQuantity: take,
              remainingQuantity: take,
              unitCost: allocation.unitCostSnapshot,
              sourceType: "transfer",
              sourceReferenceId: transferId,
            });
        await this.batches.save(destinationBatch);
        movementAllocations.push({ batchId: destinationBatch.id, quantity: take });
        remaining = remaining.subtract(take);
      }
    }

    if (!remaining.isZero()) {
      throw new DomainError("TRANSFER_BATCH_RECEIPT_MISMATCH", "Transfer batch allocation does not cover received quantity.");
    }

    return { updatedTransferAllocations, movementAllocations };
  }

  private async requireOpenCount(countId: EntityId): Promise<InventoryCount> {
    const count = await this.counts.findById(countId);
    if (!count) throw new DomainError("INVENTORY_COUNT_NOT_FOUND", "Inventory count not found.");
    if (count.status !== "counting") {
      throw new DomainError("INVENTORY_COUNT_NOT_OPEN", "Inventory count is not open for changes.");
    }
    return count;
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation);
    this.mutationQueue = result.then(() => undefined, () => undefined);
    return result;
  }
}
