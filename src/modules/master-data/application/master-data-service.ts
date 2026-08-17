import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import {
  CreateStockItemInput,
  StockItem,
  UpdateStockItemInput,
  createStockItem,
  updateStockItem,
} from "@/modules/catalog/domain/stock-item";
import { StockItemRepository } from "@/modules/catalog/repositories/stock-item-repository";
import {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
  createSupplier,
  updateSupplier,
} from "@/modules/suppliers/domain/supplier";
import { createSupplierItemOffer, SupplierItemOffer } from "@/modules/suppliers/domain/supplier-item-offer";
import { SupplierItemOfferRepository } from "@/modules/suppliers/repositories/supplier-item-offer-repository";
import { SupplierRepository } from "@/modules/suppliers/repositories/supplier-repository";

export class MasterDataService {
  constructor(
    private readonly stockItems: StockItemRepository,
    private readonly suppliers: SupplierRepository,
    private readonly offers: SupplierItemOfferRepository,
  ) {}

  listStockItems(organizationId: EntityId): Promise<readonly StockItem[]> {
    return this.stockItems.listByOrganization(organizationId);
  }

  async createStockItem(input: CreateStockItemInput): Promise<StockItem> {
    const item = createStockItem(input);
    await this.stockItems.save(item);
    return item;
  }

  async updateStockItem(id: EntityId, input: UpdateStockItemInput): Promise<StockItem> {
    const current = await this.stockItems.findById(id);
    if (!current) {
      throw new DomainError("STOCK_ITEM_NOT_FOUND", "Stock item not found.");
    }
    const item = updateStockItem(current, input);
    await this.stockItems.save(item);
    return item;
  }

  listSuppliers(organizationId: EntityId): Promise<readonly Supplier[]> {
    return this.suppliers.listByOrganization(organizationId);
  }

  async createSupplier(input: CreateSupplierInput): Promise<Supplier> {
    const supplier = createSupplier(input);
    await this.suppliers.save(supplier);
    return supplier;
  }

  async updateSupplier(id: EntityId, input: UpdateSupplierInput): Promise<Supplier> {
    const current = await this.suppliers.findById(id);
    if (!current) {
      throw new DomainError("SUPPLIER_NOT_FOUND", "Supplier not found.");
    }
    const supplier = updateSupplier(current, input);
    await this.suppliers.save(supplier);
    return supplier;
  }

  listOffers(): Promise<readonly SupplierItemOffer[]> {
    return this.offers.list();
  }

  async createOffer(input: {
    supplierId: EntityId;
    stockItemId: EntityId;
    unitPrice: string;
  }): Promise<SupplierItemOffer> {
    if (!(await this.suppliers.findById(input.supplierId))) {
      throw new DomainError("SUPPLIER_NOT_FOUND", "Supplier not found.");
    }
    if (!(await this.stockItems.findById(input.stockItemId))) {
      throw new DomainError("STOCK_ITEM_NOT_FOUND", "Stock item not found.");
    }
    const price = Money.fromDecimal(input.unitPrice);
    if (price.isNegative()) {
      throw new DomainError("INVALID_PRICE", "Supplier price cannot be negative.");
    }
    const offer = createSupplierItemOffer({
      supplierId: input.supplierId,
      stockItemId: input.stockItemId,
      unitPrice: price,
    });
    await this.offers.save(offer);
    return offer;
  }
}
