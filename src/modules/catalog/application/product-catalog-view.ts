import { EntityId } from "@/domain/common/entity-id";
import { StockItem, StockItemType } from "@/modules/catalog/domain/stock-item";

export type ProductStatusFilter = "all" | "active" | "inactive";
export type ProductTypeFilter = "all" | StockItemType;

export interface ProductCategoryReference {
  readonly id: EntityId;
  readonly name: string;
}

export interface ProductCatalogRow {
  readonly item: StockItem;
  readonly categoryName: string;
}

export interface ProductCatalogFilters {
  readonly query: string;
  readonly status: ProductStatusFilter;
  readonly categoryId: "all" | EntityId;
  readonly type: ProductTypeFilter;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function buildProductCatalogRows(
  stockItems: readonly StockItem[],
  categories: readonly ProductCategoryReference[],
): ProductCatalogRow[] {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return stockItems
    .map((item) => ({
      item,
      categoryName: categoryNames.get(item.categoryId) ?? "Categoria indisponível",
    }))
    .sort((left, right) => left.item.name.localeCompare(right.item.name, "pt-BR"));
}

export function filterProductCatalogRows(
  rows: readonly ProductCatalogRow[],
  filters: ProductCatalogFilters,
): ProductCatalogRow[] {
  const query = normalizeSearchValue(filters.query);

  return rows.filter(({ item, categoryName }) => {
    if (filters.status === "active" && !item.active) return false;
    if (filters.status === "inactive" && item.active) return false;
    if (filters.categoryId !== "all" && item.categoryId !== filters.categoryId) return false;
    if (filters.type !== "all" && item.type !== filters.type) return false;
    if (!query) return true;

    const searchableValues = [
      item.name,
      categoryName,
      item.ean,
      item.ncm,
      item.cest,
      item.baseUnitCode,
    ].filter((value): value is string => Boolean(value));

    return searchableValues.some((value) => normalizeSearchValue(value).includes(query));
  });
}
