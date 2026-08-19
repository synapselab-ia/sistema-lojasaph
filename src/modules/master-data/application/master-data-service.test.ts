import { describe, expect, it } from "vitest";
import { asEntityId } from "@/domain/common/entity-id";
import { InMemoryStockItemRepository } from "@/modules/catalog/adapters/in-memory-stock-item-repository";
import { InMemorySupplierItemOfferRepository } from "@/modules/suppliers/adapters/in-memory-supplier-item-offer-repository";
import { InMemorySupplierRepository } from "@/modules/suppliers/adapters/in-memory-supplier-repository";
import { MasterDataService } from "./master-data-service";

describe("MasterDataService", () => {
  it("creates products and suppliers without coupling the use case to a database", async () => {
    const service = new MasterDataService(
      new InMemoryStockItemRepository(),
      new InMemorySupplierRepository(),
      new InMemorySupplierItemOfferRepository(),
    );
    const organizationId = asEntityId("org-test");

    const item = await service.createStockItem({
      organizationId,
      categoryId: asEntityId("category-test"),
      name: "Água",
      baseUnitCode: "un",
      type: "merchandise",
    });
    const supplier = await service.createSupplier({
      organizationId,
      tradeName: "Fornecedor Teste",
      contacts: [{ name: "Contato", isPrimary: true }],
    });
    const offer = await service.createOffer({
      supplierId: supplier.id,
      stockItemId: item.id,
      unitPrice: "2.35",
    });

    expect((await service.listStockItems(organizationId))[0]?.name).toBe("Água");
    expect((await service.listSuppliers(organizationId))[0]?.contacts).toHaveLength(1);
    expect(offer.unitPrice.toDecimal()).toBe("2.35");
  });
});
