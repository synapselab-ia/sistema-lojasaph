"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { InMemoryStockItemRepository } from "@/modules/catalog/adapters/in-memory-stock-item-repository";
import { StockItem, StockItemType } from "@/modules/catalog/domain/stock-item";
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

interface DemoWorkspaceValue {
  organizationId: EntityId;
  structure: typeof demoStructure;
  categories: typeof demoCategories;
  unitsOfMeasure: typeof demoUnitsOfMeasure;
  stockItems: readonly StockItem[];
  suppliers: readonly Supplier[];
  offers: readonly SupplierItemOffer[];
  createStockItem(input: StockItemDraft): Promise<void>;
  updateStockItem(id: EntityId, input: StockItemDraft): Promise<void>;
  createSupplier(input: SupplierDraft): Promise<void>;
  updateSupplier(id: EntityId, input: SupplierDraft): Promise<void>;
  createOffer(input: { supplierId: EntityId; stockItemId: EntityId; unitPrice: string }): Promise<void>;
  errorMessage(error: unknown): string;
}

const DemoWorkspaceContext = createContext<DemoWorkspaceValue | null>(null);

export function DemoWorkspaceProvider({ children }: { children: ReactNode }) {
  const [service] = useState(
    () =>
      new MasterDataService(
        new InMemoryStockItemRepository(demoStockItems),
        new InMemorySupplierRepository(demoSuppliers),
        new InMemorySupplierItemOfferRepository(demoOffers),
      ),
  );
  const [stockItems, setStockItems] = useState<readonly StockItem[]>(demoStockItems);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>(demoSuppliers);
  const [offers, setOffers] = useState<readonly SupplierItemOffer[]>(demoOffers);

  async function refresh() {
    const [nextItems, nextSuppliers, nextOffers] = await Promise.all([
      service.listStockItems(DEMO_ORGANIZATION_ID),
      service.listSuppliers(DEMO_ORGANIZATION_ID),
      service.listOffers(),
    ]);
    setStockItems(nextItems);
    setSuppliers(nextSuppliers);
    setOffers(nextOffers);
  }

  async function createItem(input: StockItemDraft) {
    await service.createStockItem({
      organizationId: DEMO_ORGANIZATION_ID,
      ...input,
    });
    await refresh();
  }

  async function editItem(id: EntityId, input: StockItemDraft) {
    await service.updateStockItem(id, {
      ...input,
      active: input.active ?? true,
    });
    await refresh();
  }

  async function createSupplier(input: SupplierDraft) {
    await service.createSupplier({
      organizationId: DEMO_ORGANIZATION_ID,
      ...input,
    });
    await refresh();
  }

  async function editSupplier(id: EntityId, input: SupplierDraft) {
    await service.updateSupplier(id, {
      ...input,
      active: input.active ?? true,
    });
    await refresh();
  }

  async function createOffer(input: { supplierId: EntityId; stockItemId: EntityId; unitPrice: string }) {
    await service.createOffer(input);
    await refresh();
  }

  const value: DemoWorkspaceValue = {
    organizationId: DEMO_ORGANIZATION_ID,
    structure: demoStructure,
    categories: demoCategories,
    unitsOfMeasure: demoUnitsOfMeasure,
    stockItems,
    suppliers,
    offers,
    createStockItem: createItem,
    updateStockItem: editItem,
    createSupplier,
    updateSupplier: editSupplier,
    createOffer,
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
  if (!context) {
    throw new Error("useDemoWorkspace must be used inside DemoWorkspaceProvider.");
  }
  return context;
}
