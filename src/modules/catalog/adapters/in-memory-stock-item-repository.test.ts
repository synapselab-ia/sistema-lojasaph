import { describe, expect, it } from "vitest";
import { asEntityId } from "@/domain/common/entity-id";
import { InMemoryStockItemRepository } from "./in-memory-stock-item-repository";
import { createStockItem } from "../domain/stock-item";

describe("InMemoryStockItemRepository", () => {
  it("keeps organization scopes isolated", async () => {
    const repository = new InMemoryStockItemRepository();
    const organizationA = asEntityId("org-a");
    const organizationB = asEntityId("org-b");

    await repository.save(
      createStockItem({
        organizationId: organizationA,
        categoryId: asEntityId("category-a"),
        name: "Água 500 ml",
        baseUnitCode: "un",
        type: "merchandise",
      }),
    );

    await repository.save(
      createStockItem({
        organizationId: organizationB,
        categoryId: asEntityId("category-b"),
        name: "Carvão",
        baseUnitCode: "pct",
        type: "supply",
      }),
    );

    const items = await repository.listByOrganization(organizationA);

    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Água 500 ml");
  });
});
