import { asEntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { ItemCategory, UnitOfMeasureOption } from "@/modules/catalog/domain/item-category";
import { StockItem } from "@/modules/catalog/domain/stock-item";
import { OrganizationStructure } from "@/modules/organization/domain/organization-structure";
import { Supplier } from "@/modules/suppliers/domain/supplier";
import { SupplierItemOffer } from "@/modules/suppliers/domain/supplier-item-offer";

export const DEMO_ORGANIZATION_ID = asEntityId("org-demo-lojasaph");

export const demoStructure: OrganizationStructure = {
  id: DEMO_ORGANIZATION_ID,
  name: "Grupo de operações",
  businesses: [
    {
      id: asEntityId("business-demo-main"),
      name: "Negócio principal (provisório)",
      units: [
        {
          id: asEntityId("unit-tabatinga"),
          name: "Tabatinga",
          sectors: [
            { id: asEntityId("sector-tab-cozinha"), name: "Cozinha" },
            { id: asEntityId("sector-tab-quiosque"), name: "Quiosque" },
            { id: asEntityId("sector-tab-emporio"), name: "Empório" },
          ],
          stockLocations: [
            { id: asEntityId("stock-tab-principal"), name: "Estoque principal" },
          ],
        },
        {
          id: asEntityId("unit-capricornio"),
          name: "Capricórnio",
          sectors: [],
          stockLocations: [
            { id: asEntityId("stock-cap-principal"), name: "Estoque principal" },
          ],
        },
        {
          id: asEntityId("unit-barba-negra"),
          name: "Barba Negra",
          sectors: [],
          stockLocations: [
            { id: asEntityId("stock-barba-principal"), name: "Estoque principal" },
          ],
        },
      ],
    },
  ],
};

export const demoCategories: readonly ItemCategory[] = [
  { id: asEntityId("cat-bebidas"), organizationId: DEMO_ORGANIZATION_ID, name: "Bebidas" },
  { id: asEntityId("cat-alimentos"), organizationId: DEMO_ORGANIZATION_ID, name: "Alimentos" },
  { id: asEntityId("cat-insumos"), organizationId: DEMO_ORGANIZATION_ID, name: "Insumos" },
  { id: asEntityId("cat-retornaveis"), organizationId: DEMO_ORGANIZATION_ID, name: "Retornáveis" },
];

export const demoUnitsOfMeasure: readonly UnitOfMeasureOption[] = [
  { code: "un", name: "Unidade" },
  { code: "kg", name: "Quilograma" },
  { code: "g", name: "Grama" },
  { code: "l", name: "Litro" },
  { code: "ml", name: "Mililitro" },
  { code: "cx", name: "Caixa" },
  { code: "pct", name: "Pacote" },
];

export const demoStockItems: readonly StockItem[] = [
  {
    id: asEntityId("item-agua-500"),
    organizationId: DEMO_ORGANIZATION_ID,
    categoryId: asEntityId("cat-bebidas"),
    name: "Água 500 ml",
    baseUnitCode: "un",
    type: "merchandise",
    active: true,
    trackExpiration: true,
    trackBatch: true,
    isReturnable: false,
  },
  {
    id: asEntityId("item-espeto-demo"),
    organizationId: DEMO_ORGANIZATION_ID,
    categoryId: asEntityId("cat-alimentos"),
    name: "Espeto bovino",
    baseUnitCode: "un",
    type: "consumable",
    active: true,
    trackExpiration: true,
    trackBatch: true,
    isReturnable: false,
  },
  {
    id: asEntityId("item-carvao-demo"),
    organizationId: DEMO_ORGANIZATION_ID,
    categoryId: asEntityId("cat-insumos"),
    name: "Carvão",
    baseUnitCode: "pct",
    type: "supply",
    active: true,
    trackExpiration: false,
    trackBatch: false,
    isReturnable: false,
  },
];

export const demoSuppliers: readonly Supplier[] = [
  {
    id: asEntityId("supplier-bebidas-demo"),
    organizationId: DEMO_ORGANIZATION_ID,
    tradeName: "Fornecedor Bebidas Demo",
    active: true,
    contacts: [
      {
        id: asEntityId("contact-bebidas-demo"),
        name: "Contato Comercial",
        phone: "(00) 00000-0000",
        isPrimary: true,
      },
    ],
  },
  {
    id: asEntityId("supplier-alimentos-demo"),
    organizationId: DEMO_ORGANIZATION_ID,
    tradeName: "Fornecedor Alimentos Demo",
    active: true,
    contacts: [],
  },
];

export const demoOffers: readonly SupplierItemOffer[] = [
  {
    id: asEntityId("offer-agua-demo"),
    supplierId: asEntityId("supplier-bebidas-demo"),
    stockItemId: asEntityId("item-agua-500"),
    unitPrice: Money.fromDecimal("2.10"),
    observedAt: "2026-08-01T12:00:00.000Z",
  },
];
