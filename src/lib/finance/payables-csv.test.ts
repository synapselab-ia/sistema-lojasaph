import { describe, expect, it } from "vitest";
import { Money } from "@/domain/common/money";
import {
  buildPayablesCsv,
  collectPayablesExportPages,
  payablesCsvFilename,
  type PayablesExportRow,
} from "./payables-csv";

function row(overrides: Partial<PayablesExportRow> = {}): PayablesExportRow {
  return {
    supplierName: "Café & Cia",
    unitName: "Tabatinga",
    sectorName: "Cozinha",
    documentType: "supplier_document",
    documentNumber: "NF 123",
    series: "1",
    issuedAt: "2026-08-20",
    installmentNumber: 1,
    installmentCount: 3,
    dueDate: "2026-09-10",
    installmentStatus: "upcoming",
    documentStatus: "active",
    nominalAmount: Money.fromDecimal("1234.50"),
    netPaidAmount: Money.fromDecimal("100.25"),
    balanceAmount: Money.fromDecimal("1134.25"),
    ...overrides,
  };
}

describe("payables CSV", () => {
  it("writes BOM, stable headers, CRLF and exact decimal values", () => {
    const csv = buildPayablesCsv([row({ balanceAmount: Money.fromDecimal("-1.23") })]);

    expect(csv.startsWith("\uFEFF\"Fornecedor\",\"Unidade\",\"Setor\"" )).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv).toContain('"Café & Cia"');
    expect(csv).toContain('"1 de 3"');
    expect(csv).toContain('"1234.50","100.25","-1.23"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("escapes quotes, commas and newlines without losing text", () => {
    const csv = buildPayablesCsv([row({
      supplierName: 'Fornecedor "A", filial',
      documentNumber: "NF\nlinha 2",
    })]);

    expect(csv).toContain('"Fornecedor ""A"", filial"');
    expect(csv).toContain('"NF\nlinha 2"');
  });

  it("neutralizes spreadsheet formulas only in textual cells", () => {
    const csv = buildPayablesCsv([row({
      supplierName: "=HYPERLINK(\"https://example.invalid\")",
      unitName: "  +SUM(1,2)",
      sectorName: "@malicious",
      documentNumber: "-1+1",
      balanceAmount: Money.fromDecimal("-12.34"),
    })]);

    expect(csv).toContain('"\'=HYPERLINK(""https://example.invalid"")"');
    expect(csv).toContain('"\'  +SUM(1,2)"');
    expect(csv).toContain('"\'@malicious"');
    expect(csv).toContain('"\'-1+1"');
    expect(csv).toContain('"-12.34"');
    expect(csv).not.toContain('"\'-12.34"');
  });

  it("paginates until a short page is returned", async () => {
    const calls: Array<[number, number]> = [];
    const all = ["a", "b", "c", "d", "e"];

    const result = await collectPayablesExportPages(async (from, to) => {
      calls.push([from, to]);
      return all.slice(from, to + 1);
    }, 2);

    expect(result).toEqual(all);
    expect(calls).toEqual([[0, 1], [2, 3], [4, 5]]);
  });

  it("rejects an invalid page size and builds a deterministic filename", async () => {
    await expect(collectPayablesExportPages(async () => [], 0)).rejects.toThrow("pageSize");
    expect(payablesCsvFilename(new Date("2026-08-25T12:00:00Z"))).toBe("contas-a-pagar-2026-08-25.csv");
  });
});
