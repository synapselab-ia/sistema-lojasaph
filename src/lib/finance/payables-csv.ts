import { Money } from "@/domain/common/money";

export type PayablesExportInstallmentStatus =
  | "cancelled"
  | "paid"
  | "overdue"
  | "due_today"
  | "upcoming";

export type PayablesExportDocumentStatus = "active" | "cancelled";

export interface PayablesExportRow {
  readonly supplierName: string;
  readonly unitName: string;
  readonly sectorName?: string;
  readonly documentType: string;
  readonly documentNumber?: string;
  readonly series?: string;
  readonly issuedAt?: string;
  readonly installmentNumber: number;
  readonly installmentCount: number;
  readonly dueDate: string;
  readonly installmentStatus: PayablesExportInstallmentStatus;
  readonly documentStatus: PayablesExportDocumentStatus;
  readonly nominalAmount: Money;
  readonly netPaidAmount: Money;
  readonly balanceAmount: Money;
}

const HEADERS = [
  "Fornecedor",
  "Unidade",
  "Setor",
  "Tipo documento",
  "Número documento",
  "Série",
  "Data emissão",
  "Parcela",
  "Vencimento",
  "Status parcela",
  "Situação documento",
  "Valor nominal",
  "Pago líquido",
  "Saldo",
] as const;

const installmentStatusLabel: Record<PayablesExportInstallmentStatus, string> = {
  cancelled: "Cancelada",
  paid: "Paga",
  overdue: "Vencida",
  due_today: "Vence hoje",
  upcoming: "A vencer",
};

const documentStatusLabel: Record<PayablesExportDocumentStatus, string> = {
  active: "Ativo",
  cancelled: "Cancelado",
};

function neutralizeSpreadsheetFormula(value: string): string {
  // Excel/Sheets may evaluate cells whose first non-space character starts a formula.
  return /^[\u0000-\u0020]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function quoteCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function textCell(value: string | undefined): string {
  return quoteCsv(neutralizeSpreadsheetFormula(value ?? ""));
}

function literalCell(value: string): string {
  return quoteCsv(value);
}

export async function collectPayablesExportPages<T>(
  fetchPage: (from: number, to: number) => Promise<readonly T[]>,
  pageSize = 500,
): Promise<readonly T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("pageSize must be a positive integer");
  }

  const rows: T[] = [];
  let from = 0;

  while (true) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return Object.freeze(rows);
    from += pageSize;
  }
}

export function buildPayablesCsv(rows: readonly PayablesExportRow[]): string {
  const lines = [HEADERS.map((header) => literalCell(header)).join(",")];

  for (const row of rows) {
    lines.push([
      textCell(row.supplierName),
      textCell(row.unitName),
      textCell(row.sectorName),
      textCell(row.documentType),
      textCell(row.documentNumber),
      textCell(row.series),
      literalCell(row.issuedAt ?? ""),
      literalCell(`${row.installmentNumber} de ${row.installmentCount}`),
      literalCell(row.dueDate),
      literalCell(installmentStatusLabel[row.installmentStatus]),
      literalCell(documentStatusLabel[row.documentStatus]),
      literalCell(row.nominalAmount.toDecimal()),
      literalCell(row.netPaidAmount.toDecimal()),
      literalCell(row.balanceAmount.toDecimal()),
    ].join(","));
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function payablesCsvFilename(now = new Date()): string {
  return `contas-a-pagar-${now.toISOString().slice(0, 10)}.csv`;
}
