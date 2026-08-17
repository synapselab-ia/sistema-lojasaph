"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { InMemoryStockItemRepository } from "@/modules/catalog/adapters/in-memory-stock-item-repository";
import { StockItem, StockItemType } from "@/modules/catalog/domain/stock-item";
import { InMemoryInventoryBalanceRepository } from "@/modules/inventory/adapters/in-memory-inventory-balance-repository";
import { InMemoryInventoryBatchRepository } from "@/modules/inventory/adapters/in-memory-inventory-batch-repository";
import { InMemoryInventoryCountRepository } from "@/modules/inventory/adapters/in-memory-inventory-count-repository";
import { InMemoryStockMovementRepository } from "@/modules/inventory/adapters/in-memory-stock-movement-repository";
import { InMemoryStockTransferRepository } from "@/modules/inventory/adapters/in-memory-stock-transfer-repository";
import { InventoryService } from "@/modules/inventory/application/inventory-service";
import {
  InventoryBalance,
  InventoryBatch,
  InventoryCount,
  StockMovement,
  StockTransfer,
} from "@/modules/inventory/domain/inventory";
import {
  DEMO_USER_ID,
  demoInventoryBalances,
  demoInventoryBatches,
  demoInventoryMovements,
} from "@/modules/inventory/fixtures/demo-inventory-data";
import { InMemorySupplierItemOfferRepository } from "@/modules/suppliers/adapters/in-memory-supplier-item-offer-repository";
import { InMemorySupplierRepository } from "@/modules/suppliers/adapters/in-memory-supplier-repository";
import { Supplier, SupplierContactInput } from "@/modules/suppliers/domain/supplier";
import { SupplierItemOffer } from "@/modules/suppliers/domain/supplier-item-offer";
import { MasterDataService } from "../application/master-data-service";
import {
  DEMO_ORGANIZATION_ID,
  demoCategories,
  demoOffers,
  demoStockItems,
  demoStructure,
  demoSuppliers,
  demoUnitsOfMeasure,
} from "../fixtures/demo-data";

interface StockItemDraft {
  categoryId?: EntityId;
  name: string;
  baseUnitCode: string;
  type: StockItemType;
  active?: boolean;
  trackExpiration: boolean;
  trackBatch: boolean;
  isReturnable: boolean;
}

interface SupplierDraft {
  tradeName: string;
  taxId?: string;
  active?: boolean;
  contacts: readonly SupplierContactInput[];
}

export interface StockLocationOption {
  readonly id: EntityId;
  readonly name: string;
  readonly unitName: string;
}

interface DemoWorkspaceValue {
  organizationId: EntityId;
  structure: typeof demoStructure;
  categories: typeof demoCategories;
  unitsOfMeasure: typeof demoUnitsOfMeasure;
  stockLocations: readonly StockLocationOption[];
  stockItems: readonly StockItem[];
  suppliers: readonly Supplier[];
  offers: readonly SupplierItemOffer[];
  balances: readonly InventoryBalance[];
  movements: readonly StockMovement[];
  transfers: readonly StockTransfer[];
  batches: readonly InventoryBatch[];
  inventoryCounts: readonly InventoryCount[];
  createStockItem(input: StockItemDraft): Promise<void>;
  updateStockItem(id: EntityId, input: StockItemDraft): Promise<void>;
  createSupplier(input: SupplierDraft): Promise<void>;
  updateSupplier(id: EntityId, input: SupplierDraft): Promise<void>;
  createOffer(input: { supplierId: EntityId; stockItemId: EntityId; unitPrice: string }): Promise<void>;
  recordEntry(input: {
    stockItemId: EntityId;
    stockLocationId: EntityId;
    quantity: string;
    unitCost: string;
    batchCode?: string;
    expirationDate?: string;
    notes?: string;
  }): Promise<void>;
  withdraw(input: {
    stockItemId: EntityId;
    stockLocationId: EntityId;
    quantity: string;
    preferredBatchId?: EntityId;
    notes?: string;
  }): Promise<void>;
  dispatchTransfer(input: {
    stockItemId: EntityId;
    sourceLocationId: EntityId;
    destinationLocationId: EntityId;
    quantity: string;
    preferredBatchId?: EntityId;
    notes?: string;
  }): Promise<void>;
  receiveTransfer(transferId: EntityId, quantity?: string): Promise<void>;
  startInventoryCount(stockLocationId: EntityId): Promise<void>;
  setInventoryCountLine(countId: EntityId, stockItemId: EntityId, countedQuantity: string): Promise<void>;
  confirmInventoryCount(countId: EntityId): Promise<void>;
  errorMessage(error: unknown): string;
}

const DemoWorkspaceContext = createContext<DemoWorkspaceValue | null>(null);

export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  const [services] = useState(() => {
    const stockItemRepository = new InMemoryStockItemRepository(demoStockItems);
    return {
      masterData: new MasterDataService(
        stockItemRepository,
        new InMemorySupplierRepository(demoSuppliers),
        new InMemorySupplierItemOfferRepository(demoOffers),
      ),
      inventory: new InventoryService(
        stockItemRepository,
        new InMemoryInventoryBalanceRepository(demoInventoryBalances),
        new InMemoryStockMovementRepository(demoInventoryMovements),
        new InMemoryStockTransferRepository(),
        new InMemoryInventoryBatchRepository(demoInventoryBatches),
        new InMemoryInventoryCountRepository(),
      ),
    };
  });

  const [stockItems, setStockItems] = useState<readonly StockItem[]>(demoStockItems);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>(demoSuppliers);
  const [offers, setOffers] = useState<readonly SupplierItemOffer[]>(demoOffers);
  const [balances, setBalances] = useState<readonly InventoryBalance[]>(demoInventoryBalances);
  const [movements, setMovements] = useState<readonly StockMovement[]>(demoInventoryMovements);
  const [transfers, setTransfers] = useState<readonly StockTransfer[]>([]);
  const [batches, setBatches] = useState<readonly InventoryBatch[]>(demoInventoryBatches);
  const [inventoryCounts, setInventoryCounts] = useState<readonly InventoryCount[]>([]);

  const stockLocations: readonly StockLocationOption[] = demoStructure.businesses.flatMap((business) =>
    business.units.flatMap((unit) =>
      unit.stockLocations.map((location) => ({ id: location.id, name: location.name, unitName: unit.name })),
    ),
  );

  async function refreshMasterData() {
    const [nextItems, nextSuppliers, nextOffers] = await Promise.all([
      services.masterData.listStockItems(DEMO_ORGANIZATION_ID),
      services.masterData.listSuppliers(DEMO_ORGANIZATION_ID),
      services.masterData.listOffers(),
    ]);
    setStockItems(nextItems);
    setSuppliers(nextSuppliers);
    setOffers(nextOffers);
  }

  async function refreshInventory() {
    const [nextBalances, nextMovements, nextTransfers, nextBatches, nextCounts] = await Promise.all([
      services.inventory.listBalances(),
      services.inventory.listMovements(),
      services.inventory.listTransfers(),
      services.inventory.listBatches(),
      services.inventory.listInventoryCounts(),
    ]);
    setBalances(nextBalances);
    setMovements(nextMovements);
    setTransfers(nextTransfers);
    setBatches(nextBatches);
    setInventoryCounts(nextCounts);
  }

  async function createItem(input: StockItemDraft) {
    await services.masterData.createStockItem({ organizationId: DEMO_ORGANIZATION_ID, ...input });
    await refreshMasterData();
  }

  async function editItem(id: EntityId, input: StockItemDraft) {
    await services.masterData.updateStockItem(id, { ...input, active: input.active ?? true });
    await refreshMasterData();
  }

  async function createSupplier(input: SupplierDraft) {
    await services.masterData.createSupplier({ organizationId: DEMO_ORGANIZATION_ID, ...input });
    await refreshMasterData();
  }

  async function editSupplier(id: EntityId, input: SupplierDraft) {
    await services.masterData.updateSupplier(id, { ...input, active: input.active ?? true });
    await refreshMasterData();
  }

  async function createOffer(input: { supplierId: EntityId; stockItemId: EntityId; unitPrice: string }) {
    await services.masterData.createOffer(input);
    await refreshMasterData();
  }

  async function recordEntry(input: {
    stockItemId: EntityId;
    stockLocationId: EntityId;
    quantity: string;
    unitCost: string;
    batchCode?: string;
    expirationDate?: string;
    notes?: string;
  }) {
    await services.inventory.recordEntry({
      organizationId: DEMO_ORGANIZATION_ID,
      responsibleUserId: DEMO_USER_ID,
      ...input,
    });
    await refreshInventory();
  }

  async function withdraw(input: {
    stockItemId: EntityId;
    stockLocationId: EntityId;
    quantity: string;
    preferredBatchId?: EntityId;
    notes?: string;
  }) {
    await services.inventory.withdraw({
      organizationId: DEMO_ORGANIZATION_ID,
      responsibleUserId: DEMO_USER_ID,
      ...input,
    });
    await refreshInventory();
  }

  async function dispatchTransfer(input: {
    stockItemId: EntityId;
    sourceLocationId: EntityId;
    destinationLocationId: EntityId;
    quantity: string;
    preferredBatchId?: EntityId;
    notes?: string;
  }) {
    await services.inventory.dispatchTransfer({
      organizationId: DEMO_ORGANIZATION_ID,
      responsibleUserId: DEMO_USER_ID,
      ...input,
    });
    await refreshInventory();
  }

  async function receiveTransfer(transferId: EntityId, quantity?: string) {
    await services.inventory.receiveTransfer({ transferId, quantity, responsibleUserId: DEMO_USER_ID });
    await refreshInventory();
  }

  async function startInventoryCount(stockLocationId: EntityId) {
    await services.inventory.startInventoryCount({
      organizationId: DEMO_ORGANIZATION_ID,
      stockLocationId,
      responsibleUserId: DEMO_USER_ID,
    });
    await refreshInventory();
  }

  async function setInventoryCountLine(countId: EntityId, stockItemId: EntityId, countedQuantity: string) {
    await services.inventory.setInventoryCountLine({ countId, stockItemId, countedQuantity });
    await refreshInventory();
  }

  async function confirmInventoryCount(countId: EntityId) {
    await services.inventory.confirmInventoryCount({ countId, responsibleUserId: DEMO_USER_ID });
    await refreshInventory();
  }

  const value: DemoWorkspaceValue = {
    organizationId: DEMO_ORGANIZATION_ID,
    structure: demoStructure,
    categories: demoCategories,
    unitsOfMeasure: demoUnitsOfMeasure,
    stockLocations,
    stockItems,
    suppliers,
    offers,
    balances,
    movements,
    transfers,
    batches,
    inventoryCounts,
    createStockItem: createItem,
    updateStockItem: editItem,
    createSupplier,
    updateSupplier: editSupplier,
    createOffer,
    recordEntry,
    withdraw,
    dispatchTransfer,
    receiveTransfer,
    startInventoryCount,
    setInventoryCountLine,
    confirmInventoryCount,
    errorMessage(error) {
      if (error instanceof DomainError) return error.message;
      if (error instanceof Error) return error.message;
      return "Não foi possível concluir a operação.";
    },
  };

  return <DemoWorkspaceContext.Provider value={value}>{children}</DemoWorkspaceContext.Provider>;
}

export function useDemoWorkspace(): DemoWorkspaceValue {
  const context = useContext(DemoWorkspaceContext);
  if (!context) throw new Error("useDemoWorkspace must be used inside DemoWorkspaceProvider.");
  return context;
}
