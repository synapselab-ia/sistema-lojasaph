import { describe, expect, it } from "vitest";

import {
  buildSourceIdentity,
  canonicalizeJson,
  parseTabularRows,
  prepareImportPreview,
  resolveStockItemReference,
  type ImportSourceRow,
} from "./import-preview";

const organizationId = "00000000-0000-4000-8000-000000000001";
const sourceSha256 = "a".repeat(64);

describe("import preview foundation", () => {
  it("preserves sheet, row number and raw payload when parsing tabular records", () => {
    const rows = parseTabularRows(
      " Produtos ",
      [
        { codigo: "A-1", nome: "Água 500 ml" },
        { codigo: "A-2", nome: "Carvão" },
      ],
      3,
    );

    expect(rows).toEqual([
      {
        sourceSheet: "Produtos",
        sourceRow: 3,
        rawPayload: { codigo: "A-1", nome: "Água 500 ml" },
      },
      {
        sourceSheet: "Produtos",
        sourceRow: 4,
        rawPayload: { codigo: "A-2", nome: "Carvão" },
      },
    ]);
  });

  it("canonicalizes object keys and produces a stable source identity", () => {
    expect(canonicalizeJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');

    const first: ImportSourceRow = {
      sourceSheet: "Estoque",
      sourceRow: 2,
      rawPayload: { b: 2, a: 1 },
    };
    const second: ImportSourceRow = {
      sourceSheet: " estoque ",
      sourceRow: 2,
      rawPayload: { a: 1, b: 2 },
    };

    expect(
      buildSourceIdentity({ organizationId, sourceSha256, row: first }),
    ).toBe(
      buildSourceIdentity({ organizationId, sourceSha256, row: second }),
    );
  });

  it("resolves only canonical names or explicit aliases, never fuzzy similarity", () => {
    const stockItems = [
      { id: "item-water", name: "Água 500 ml" },
      { id: "item-coal", name: "Carvão" },
    ];
    const aliases = [
      { stockItemId: "item-water", alias: "Água mineral 500 ml" },
    ];

    expect(
      resolveStockItemReference({
        reference: " água mineral   500 ml ",
        stockItems,
        aliases,
      }),
    ).toEqual({
      status: "matched",
      stockItemId: "item-water",
      resolution: "explicit_alias",
    });

    expect(
      resolveStockItemReference({
        reference: "Agua minera 500ml",
        stockItems,
        aliases,
      }),
    ).toEqual({ status: "pending_mapping", reason: "not_found" });
  });

  it("requires review when the same explicit reference points to multiple items", () => {
    expect(
      resolveStockItemReference({
        reference: "Combo",
        stockItems: [
          { id: "item-a", name: "Produto A" },
          { id: "item-b", name: "Produto B" },
        ],
        aliases: [
          { stockItemId: "item-a", alias: "Combo" },
          { stockItemId: "item-b", alias: "Combo" },
        ],
      }),
    ).toEqual({ status: "pending_mapping", reason: "ambiguous" });
  });

  it("keeps stock item rows without an explicit category as pending mapping", () => {
    const rows = parseTabularRows("Produtos", [
      { nome: "Água 500 ml", categoria: null },
    ]);

    const preview = prepareImportPreview({
      organizationId,
      sourceSha256,
      rows,
      evaluateRow: (row) => {
        const category = row.rawPayload.categoria;

        if (typeof category !== "string" || !category.trim()) {
          return {
            state: "pending_mapping",
            normalizedPayload: { name: row.rawPayload.nome },
            resolution: "ITEM_CATEGORY_REQUIRED",
          };
        }

        return {
          state: "accepted",
          normalizedPayload: { name: row.rawPayload.nome, category },
        };
      },
    });

    expect(preview.rows[0]?.state).toBe("pending_mapping");
    expect(preview.rows[0]?.resolution).toBe("ITEM_CATEGORY_REQUIRED");
    expect(preview.rows[0]?.normalizedPayload).toEqual({ name: "Água 500 ml" });
    expect(preview.report.pendingMappingRows).toBe(1);
  });

  it("reports accepted, duplicate, warning, rejected and pending mappings without writes", () => {
    const rows = parseTabularRows("Itens", [
      { status: "accepted" },
      { status: "warning" },
      { status: "rejected" },
      { status: "pending" },
    ]);

    const existingIdentity = buildSourceIdentity({
      organizationId,
      sourceSha256,
      row: rows[0],
    });

    const preview = prepareImportPreview({
      organizationId,
      sourceSha256,
      rows,
      existingSourceIdentities: new Set([existingIdentity]),
      evaluateRow: (row) => {
        const status = row.rawPayload.status;

        if (status === "warning") {
          return {
            state: "warning",
            normalizedPayload: row.rawPayload,
            warnings: ["SYNTHETIC_WARNING"],
          };
        }

        if (status === "rejected") {
          return {
            state: "rejected",
            normalizedPayload: {},
            errors: ["SYNTHETIC_REJECTION"],
          };
        }

        if (status === "pending") {
          return {
            state: "pending_mapping",
            normalizedPayload: row.rawPayload,
            resolution: "OPEN_QUESTION_REVIEW",
          };
        }

        return { state: "accepted", normalizedPayload: row.rawPayload };
      },
    });

    expect(preview.rows.map((row) => row.state)).toEqual([
      "duplicate",
      "warning",
      "rejected",
      "pending_mapping",
    ]);
    expect(preview.report).toEqual({
      totalRows: 4,
      acceptedRows: 0,
      duplicateRows: 1,
      warningRows: 1,
      rejectedRows: 1,
      pendingMappingRows: 1,
    });
  });
});
