"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabaseStockItemRepository } from "@/modules/catalog/adapters/supabase-stock-item-repository";
import {
  StockItem,
  StockItemType,
  createStockItem,
  updateStockItem,
} from "@/modules/catalog/domain/stock-item";
import { SupabaseStockEntryGateway } from "@/modules/inventory/adapters/supabase-stock-entry-gateway";
import { SupabaseStockWithdrawalGateway } from "@/modules/inventory/adapters/supabase-stock-withdrawal-gateway";
import { InventoryBalance, InventoryBatch } from "@/modules/inventory/domain/inventory";
import { SupabaseSupplierRepository } from "@/modules/suppliers/adapters/supabase-supplier-repository";
import {
  Supplier,
  SupplierContactInput,
  createSupplier,
  updateSupplier,
} from "@/modules/suppliers/domain/supplier";
import {
  RuntimeCategory,
  RuntimeStockLocation,
  RuntimeUnitOfMeasure,
  WorkspaceReferenceData,
  loadWorkspaceReferenceData,
} from "../adapters/supabase-workspace-query";

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

export interface RuntimeWorkspaceInitialData extends WorkspaceReferenceData {
  readonly stockItems: readonly StockItem[];
  readonly suppliers: readonly Supplier[];
}

interface RuntimePermissions {
  readonly manageCatalog: boolean;
  readonly manageSuppliers: boolean;
  readonly recordStockEntry: boolean;
  readonly recordStockWithdrawal: boolean;
}

interface RuntimeWorkspaceValue {
  readonly organizationId: EntityId;
  readonly organizationName: string;
  readonly categories: readonly RuntimeCategory[];
  readonly unitsOfMeasure: readonly RuntimeUnitOfMeasure[];
  readonly stockLocations: readonly RuntimeStockLocation[];
  readonly stockItems: readonly StockItem[];
  readonly suppliers: readonly Supplier[];
  readonly balances: readonly InventoryBalance[];
  readonly batches: readonly InventoryBatch[];
  readonly permissions: RuntimePermissions;
  createStockItem(input: StockItemDraft): Promise<void>;
  updateStockItem(id: EntityId, input: StockItemDraft): Promise<void>;
  createSupplier(input: SupplierDraft): Promise<void>;
  updateSupplier(id: EntityId, input: SupplierDraft): Promise<void>;
  recordEntry(input: {
    stockItemId: EntityId;
    stockLocationId: EntityId;
    quantity: string;
    unitCost: string;
    batchCode?: string;
    expirationDate?: string;
    notes?: string;
  }): Promise<void>;
  recordWithdrawal(input: {
    stockItemId: EntityId;
    stockLocationId: EntityId;
    quantity: string;
    preferredBatchId?: EntityId;
    notes?: string;
  }): Promise<void>;
  errorMessage(error: unknown): string;
}

const RuntimeWorkspaceContext = createContext<RuntimeWorkspaceValue | null>(null);

function can(roles: readonly string[], allowed: readonly string[]): boolean {
  const allowedSet = new Set(allowed);
  return roles.some((role) => allowedSet.has(role));
}

export function RuntimeWorkspaceProvider({
  children,
  organizationId,
  organizationName,
  roles,
  initialData,
}: {
  children: ReactNode;
  organizationId: EntityId;
  organizationName: string;
  roles: readonly string[];
  initialData: RuntimeWorkspaceInitialData;
}) {
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const stockItemsRepository = useMemo(() => new SupabaseStockItemRepository(client), [client]);
  const suppliersRepository = useMemo(() => new SupabaseSupplierRepository(client), [client]);
  const stockEntryGateway = useMemo(() => new SupabaseStockEntryGateway(client), [client]);
  const stockWithdrawalGateway = useMemo(() => new SupabaseStockWithdrawalGateway(client), [client]);

  const [stockItems, setStockItems] = useState<readonly StockItem[]>(initialData.stockItems);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>(initialData.suppliers);
  const [referenceData, setReferenceData] = useState<WorkspaceReferenceData>(initialData);

  const permissions: RuntimePermissions = {
    manageCatalog: can(roles, ["owner", "admin", "manager", "inventory"]),
    manageSuppliers: can(roles, ["owner", "admin", "manager", "purchases"]),
    recordStockEntry: can(roles, ["owner", "admin", "manager", "inventory"]),
    recordStockWithdrawal: can(roles, ["owner", "admin", "manager", "inventory"]),
  };

  async function refresh() {
    const [nextItems, nextSuppliers, nextReferences] = await Promise.all([
      stockItemsRepository.listByOrganization(organizationId),
      suppliersRepository.listByOrganization(organizationId),
      loadWorkspaceReferenceData(client, organizationId),
    ]);
    setStockItems(nextItems);
    setSuppliers(nextSuppliers);
    setReferenceData(nextReferences);
  }

  async function createItem(input: StockItemDraft) {
    if (!permissions.manageCatalog) throw new DomainError("INSUFFICIENT_ROLE", "Seu perfil não pode alterar produtos.");
    const item = createStockItem({ organizationId, ...input });
    await stockItemsRepository.save(item);
    await refresh();
  }

  async function editItem(id: EntityId, input: StockItemDraft) {
    if (!permissions.manageCatalog) throw new DomainError("INSUFFICIENT_ROLE", "Seu perfil não pode alterar produtos.");
    const current = await stockItemsRepository.findById(id);
    if (!current) throw new DomainError("STOCK_ITEM_NOT_FOUND", "Produto não encontrado.");
    await stockItemsRepository.save(updateStockItem(current, { ...input, active: input.active ?? true }));
    await refresh();
  }

  async function createSupplierRecord(input: SupplierDraft) {
    if (!permissions.manageSuppliers) throw new DomainError("INSUFFICIENT_ROLE", "Seu perfil não pode alterar fornecedores.");
    await suppliersRepository.save(createSupplier({ organizationId, ...input }));
    await refresh();
  }

  async function editSupplier(id: EntityId, input: SupplierDraft) {
    if (!permissions.manageSuppliers) throw new DomainError("INSUFFICIENT_ROLE", "Seu perfil não pode alterar fornecedores.");
    const current = await suppliersRepository.findById(id);
    if (!current) throw new DomainError("SUPPLIER_NOT_FOUND", "Fornecedor não encontrado.");
    await suppliersRepository.save(updateSupplier(current, { ...input, active: input.active ?? true }));
    await refresh();
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
    if (!permissions.recordStockEntry) throw new DomainError("INSUFFICIENT_ROLE", "Seu perfil não pode registrar entradas de estoque.");
    await stockEntryGateway.record({ organizationId, ...input });
    await refresh();
  }

  async function recordWithdrawal(input: {
    stockItemId: EntityId;
    stockLocationId: EntityId;
    quantity: string;
    preferredBatchId?: EntityId;
    notes?: string;
  }) {
    if (!permissions.recordStockWithdrawal) throw new DomainError("INSUFFICIENT_ROLE", "Seu perfil não pode registrar retiradas de estoque.");
    await stockWithdrawalGateway.record({ organizationId, ...input });
    await refresh();
  }

  const value: RuntimeWorkspaceValue = {
    organizationId,
    organizationName,
    categories: referenceData.categories,
    unitsOfMeasure: referenceData.unitsOfMeasure,
    stockLocations: referenceData.stockLocations,
    stockItems,
    suppliers,
    balances: referenceData.balances,
    batches: referenceData.batches,
    permissions,
    createStockItem: createItem,
    updateStockItem: editItem,
    createSupplier: createSupplierRecord,
    updateSupplier: editSupplier,
    recordEntry,
    recordWithdrawal,
    errorMessage(error) {
      if (error instanceof DomainError) return error.message;
      if (error instanceof Error) return error.message;
      return "Não foi possível concluir a operação.";
    },
  };

  return <RuntimeWorkspaceContext.Provider value={value}>{children}</RuntimeWorkspaceContext.Provider>;
}

export function useRuntimeWorkspace(): RuntimeWorkspaceValue {
  const context = useContext(RuntimeWorkspaceContext);
  if (!context) throw new Error("useRuntimeWorkspace must be used inside RuntimeWorkspaceProvider.");
  return context;
}
