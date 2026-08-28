import { StockItem, StockItemType } from "@/modules/catalog/domain/stock-item";

export const productTypeLabels: Record<StockItemType, string> = {
  consumable: "Consumível",
  merchandise: "Mercadoria",
  reusable: "Retornável",
  supply: "Insumo",
};

export function productFiscalSummary(item: StockItem): string {
  const values = [
    item.ncm ? `NCM ${item.ncm}` : null,
    item.cest ? `CEST ${item.cest}` : null,
  ].filter((value): value is string => Boolean(value));

  return values.length > 0 ? values.join(" · ") : "Sem dados fiscais";
}
