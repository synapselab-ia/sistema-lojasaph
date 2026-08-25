import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import {
  collectPayablesExportPages,
  type PayablesExportDocumentStatus,
  type PayablesExportInstallmentStatus,
  type PayablesExportRow,
} from "@/lib/finance/payables-csv";

const EXPORT_PAGE_SIZE = 500;
const LOOKUP_CHUNK_SIZE = 200;

interface ExportSummaryRow {
  installment_id: string;
  unit_id: string;
  sector_id: string | null;
  supplier_id: string;
  document_type: string;
  document_number: string | null;
  series: string | null;
  issued_at: string | null;
  lifecycle_status: PayablesExportDocumentStatus;
  installment_number: number;
  installment_count: number;
  nominal_amount: number | string;
  due_date: string;
  net_paid_amount: number | string;
  balance_amount: number | string;
  payment_status: PayablesExportInstallmentStatus;
}

interface IdNameRow {
  id: string;
  name: string;
}

interface SupplierNameRow {
  id: string;
  trade_name: string;
}

function exportError(message: string): DomainError {
  return new DomainError("PAYABLES_EXPORT_ERROR", message);
}

function uniqueIds(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function chunks(values: readonly string[]): readonly string[][] {
  const result: string[][] = [];
  for (let index = 0; index < values.length; index += LOOKUP_CHUNK_SIZE) {
    result.push(values.slice(index, index + LOOKUP_CHUNK_SIZE));
  }
  return result;
}

export class SupabasePayablesExportGateway {
  constructor(private readonly client: SupabaseClient) {}

  async listRows(organizationId: EntityId): Promise<readonly PayablesExportRow[]> {
    const summaries = await collectPayablesExportPages<ExportSummaryRow>(async (from, to) => {
      const { data, error } = await this.client
        .from("payable_installment_summary")
        .select("installment_id, unit_id, sector_id, supplier_id, document_type, document_number, series, issued_at, lifecycle_status, installment_number, installment_count, nominal_amount, due_date, net_paid_amount, balance_amount, payment_status")
        .eq("organization_id", organizationId)
        .order("due_date", { ascending: true })
        .order("installment_id", { ascending: true })
        .range(from, to);

      if (error) throw exportError("Não foi possível carregar as contas a pagar para exportação.");
      return (data ?? []) as ExportSummaryRow[];
    }, EXPORT_PAGE_SIZE);

    const supplierIds = uniqueIds(summaries.map((row) => row.supplier_id));
    const unitIds = uniqueIds(summaries.map((row) => row.unit_id));
    const sectorIds = uniqueIds(summaries.map((row) => row.sector_id));

    const [supplierNames, unitNames, sectorNames] = await Promise.all([
      this.loadSupplierNames(organizationId, supplierIds),
      this.loadNames("units", organizationId, unitIds),
      this.loadNames("sectors", organizationId, sectorIds),
    ]);

    return Object.freeze(summaries.map((row) => Object.freeze({
      supplierName: supplierNames.get(row.supplier_id) ?? "Fornecedor indisponível",
      unitName: unitNames.get(row.unit_id) ?? "Unidade indisponível",
      sectorName: row.sector_id ? sectorNames.get(row.sector_id) ?? "Setor indisponível" : undefined,
      documentType: row.document_type,
      documentNumber: row.document_number ?? undefined,
      series: row.series ?? undefined,
      issuedAt: row.issued_at ?? undefined,
      installmentNumber: row.installment_number,
      installmentCount: row.installment_count,
      dueDate: row.due_date,
      installmentStatus: row.payment_status,
      documentStatus: row.lifecycle_status,
      nominalAmount: Money.fromDecimal(String(row.nominal_amount)),
      netPaidAmount: Money.fromDecimal(String(row.net_paid_amount)),
      balanceAmount: Money.fromDecimal(String(row.balance_amount)),
    })));
  }

  private async loadSupplierNames(
    organizationId: EntityId,
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    const names = new Map<string, string>();

    for (const idChunk of chunks(ids)) {
      const { data, error } = await this.client
        .from("suppliers")
        .select("id, trade_name")
        .eq("organization_id", organizationId)
        .in("id", idChunk);

      if (error) throw exportError("Não foi possível carregar os fornecedores da exportação.");
      for (const row of (data ?? []) as SupplierNameRow[]) names.set(row.id, row.trade_name);
    }

    return names;
  }

  private async loadNames(
    table: "units" | "sectors",
    organizationId: EntityId,
    ids: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    const names = new Map<string, string>();

    for (const idChunk of chunks(ids)) {
      const { data, error } = await this.client
        .from(table)
        .select("id, name")
        .eq("organization_id", organizationId)
        .in("id", idChunk);

      if (error) throw exportError(`Não foi possível carregar ${table === "units" ? "as unidades" : "os setores"} da exportação.`);
      for (const row of (data ?? []) as IdNameRow[]) names.set(row.id, row.name);
    }

    return names;
  }
}
