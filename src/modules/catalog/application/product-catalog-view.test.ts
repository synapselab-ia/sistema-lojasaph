import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { StockItem } from "@/modules/catalog/domain/stock-item";
import { buildProductCatalogRows, filterProductCatalogRows } from "./product-catalog-view";

const organizationId = "00000000-0000-4000-8000-000000000001" as EntityId;
const beveragesId = "00000000-0000-4000-8000-000000000010" as EntityId;
const cleaningId = "00000000-0000-4000-8000-000000000011" as EntityId;

const items: StockItem[] = [
  {
    id: "00000000-0000-4000-8000-000000000101" as EntityId,
    organizationId,
    categoryId: cleaningId,
    name: "Álcool 70%",
    baseUnitCode: "un",
    type: "supply",
    ean: "789100000001",
    ncm: "3808",
    active: true,
    trackExpiration: true,
    trackBatch: true,
    isReturnable: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000102" as EntityId,
    organizationId,
    categoryId: beveragesId,
    name: "Refrigerante lata",
    baseUnitCode: "un",
    type: "merchandise",
    active: false,
    trackExpiration: true,
    trackBatch: false,
    isReturnable: false,
  },
];

const rows = buildProductCatalogRows(items, [
  { id: beveragesId, name: "Bebidas" },
  { id: cleaningId, name: "Limpeza" },
]);

describe("product catalog view", () => {
  it("orders products by name and resolves category labels", () => {
    expect(rows.map((row) => [row.item.name, row.categoryName])).toEqual([
      ["Álcool 70%", "Limpeza"],
      ["Refrigerante lata", "Bebidas"],
    ]);
  });

  it("searches without accents across product and identification fields", () => {
    const byName = filterProductCatalogRows(rows, {
      query: "alcool",
      status: "all",
      categoryId: "all",
      type: "all",
    });
    const byEan = filterProductCatalogRows(rows, {
      query: "789100000001",
      status: "all",
      categoryId: "all",
      type: "all",
    });

    expect(byName.map((row) => row.item.name)).toEqual(["Álcool 70%"]);
    expect(byEan.map((row) => row.item.name)).toEqual(["Álcool 70%"]);
  });

  it("combines status, category and type filters", () => {
    const result = filterProductCatalogRows(rows, {
      query: "",
      status: "inactive",
      categoryId: beveragesId,
      type: "merchandise",
    });

    expect(result.map((row) => row.item.name)).toEqual(["Refrigerante lata"]);
  });
});
