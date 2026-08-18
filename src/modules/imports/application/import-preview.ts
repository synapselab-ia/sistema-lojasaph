import { createHash } from "node:crypto";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ImportPreviewState =
  | "accepted"
  | "duplicate"
  | "warning"
  | "rejected"
  | "pending_mapping";

export interface ImportSourceRow {
  sourceSheet: string;
  sourceRow: number;
  sourceRawIdentifier?: string;
  rawPayload: JsonObject;
}

export interface ParsedTabularRow {
  [key: string]: JsonValue;
}

export interface ImportRowEvaluation {
  state: Exclude<ImportPreviewState, "duplicate">;
  normalizedPayload: JsonObject;
  targetEntity?: string;
  targetEntityId?: string;
  resolution?: string;
  warnings?: string[];
  errors?: string[];
}

export interface ImportPreviewRow extends ImportSourceRow {
  sourceIdentity: string;
  state: ImportPreviewState;
  normalizedPayload: JsonObject;
  targetEntity?: string;
  targetEntityId?: string;
  resolution?: string;
  warnings: string[];
  errors: string[];
}

export interface ImportPreviewReport {
  totalRows: number;
  acceptedRows: number;
  duplicateRows: number;
  warningRows: number;
  rejectedRows: number;
  pendingMappingRows: number;
}

export interface PrepareImportPreviewInput {
  organizationId: string;
  sourceSha256: string;
  rows: readonly ImportSourceRow[];
  existingSourceIdentities?: ReadonlySet<string>;
  evaluateRow: (row: ImportSourceRow) => ImportRowEvaluation;
}

export interface StockItemReference {
  id: string;
  name: string;
}

export interface StockItemAliasReference {
  stockItemId: string;
  alias: string;
}

export type StockItemResolution =
  | {
      status: "matched";
      stockItemId: string;
      resolution: "canonical_name" | "explicit_alias";
    }
  | {
      status: "pending_mapping";
      reason: "reference_required" | "not_found" | "ambiguous";
    };

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function normalizeImportReference(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("pt-BR");
}

export function parseTabularRows(
  sourceSheet: string,
  records: readonly ParsedTabularRow[],
  firstDataRow = 2,
): ImportSourceRow[] {
  const normalizedSheet = sourceSheet.trim();

  if (!normalizedSheet) {
    throw new Error("IMPORT_SOURCE_SHEET_REQUIRED");
  }

  if (!Number.isInteger(firstDataRow) || firstDataRow <= 0) {
    throw new Error("IMPORT_FIRST_DATA_ROW_INVALID");
  }

  return records.map((record, index) => ({
    sourceSheet: normalizedSheet,
    sourceRow: firstDataRow + index,
    rawPayload: structuredClone(record),
  }));
}

export function canonicalizeJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);

    if (serialized === undefined) {
      throw new Error("IMPORT_JSON_VALUE_INVALID");
    }

    return serialized;
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalizeJson(entryValue)}`)
    .join(",")}}`;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function buildSourceIdentity(input: {
  organizationId: string;
  sourceSha256: string;
  row: ImportSourceRow;
}): string {
  const organizationId = input.organizationId.trim();
  const sourceSha256 = input.sourceSha256.trim().toLowerCase();
  const sheet = normalizeImportReference(input.row.sourceSheet);

  if (!organizationId) {
    throw new Error("IMPORT_ORGANIZATION_REQUIRED");
  }

  if (!SHA256_PATTERN.test(sourceSha256)) {
    throw new Error("IMPORT_SOURCE_SHA256_INVALID");
  }

  if (!sheet) {
    throw new Error("IMPORT_SOURCE_SHEET_REQUIRED");
  }

  if (!Number.isInteger(input.row.sourceRow) || input.row.sourceRow <= 0) {
    throw new Error("IMPORT_SOURCE_ROW_INVALID");
  }

  const rawPayloadSha256 = sha256(canonicalizeJson(input.row.rawPayload));

  return sha256(
    [
      organizationId,
      sourceSha256,
      sheet,
      String(input.row.sourceRow),
      rawPayloadSha256,
    ].join("\u001f"),
  );
}

export function resolveStockItemReference(input: {
  reference: string | null | undefined;
  stockItems: readonly StockItemReference[];
  aliases: readonly StockItemAliasReference[];
}): StockItemResolution {
  const normalizedReference = input.reference
    ? normalizeImportReference(input.reference)
    : "";

  if (!normalizedReference) {
    return { status: "pending_mapping", reason: "reference_required" };
  }

  const itemById = new Map(input.stockItems.map((item) => [item.id, item]));
  const candidateReasons = new Map<string, "canonical_name" | "explicit_alias">();

  for (const item of input.stockItems) {
    if (normalizeImportReference(item.name) === normalizedReference) {
      candidateReasons.set(item.id, "canonical_name");
    }
  }

  for (const alias of input.aliases) {
    if (
      itemById.has(alias.stockItemId) &&
      normalizeImportReference(alias.alias) === normalizedReference &&
      !candidateReasons.has(alias.stockItemId)
    ) {
      candidateReasons.set(alias.stockItemId, "explicit_alias");
    }
  }

  if (candidateReasons.size === 0) {
    return { status: "pending_mapping", reason: "not_found" };
  }

  if (candidateReasons.size > 1) {
    return { status: "pending_mapping", reason: "ambiguous" };
  }

  const [stockItemId, resolution] = candidateReasons.entries().next().value as [
    string,
    "canonical_name" | "explicit_alias",
  ];

  return { status: "matched", stockItemId, resolution };
}

export function prepareImportPreview(
  input: PrepareImportPreviewInput,
): { rows: ImportPreviewRow[]; report: ImportPreviewReport } {
  const seenSourceIdentities = new Set(input.existingSourceIdentities ?? []);
  const rows = input.rows.map((row): ImportPreviewRow => {
    const sourceIdentity = buildSourceIdentity({
      organizationId: input.organizationId,
      sourceSha256: input.sourceSha256,
      row,
    });
    const evaluation = input.evaluateRow(row);
    const duplicate =
      seenSourceIdentities.has(sourceIdentity) && evaluation.state !== "rejected";

    if (!duplicate) {
      seenSourceIdentities.add(sourceIdentity);
    }

    return {
      ...row,
      sourceIdentity,
      state: duplicate ? "duplicate" : evaluation.state,
      normalizedPayload: structuredClone(evaluation.normalizedPayload),
      targetEntity: evaluation.targetEntity,
      targetEntityId: evaluation.targetEntityId,
      resolution: evaluation.resolution,
      warnings: [...(evaluation.warnings ?? [])],
      errors: [...(evaluation.errors ?? [])],
    };
  });

  return {
    rows,
    report: summarizeImportPreview(rows),
  };
}

export function summarizeImportPreview(
  rows: readonly Pick<ImportPreviewRow, "state">[],
): ImportPreviewReport {
  const report: ImportPreviewReport = {
    totalRows: rows.length,
    acceptedRows: 0,
    duplicateRows: 0,
    warningRows: 0,
    rejectedRows: 0,
    pendingMappingRows: 0,
  };

  for (const row of rows) {
    switch (row.state) {
      case "accepted":
        report.acceptedRows += 1;
        break;
      case "duplicate":
        report.duplicateRows += 1;
        break;
      case "warning":
        report.warningRows += 1;
        break;
      case "rejected":
        report.rejectedRows += 1;
        break;
      case "pending_mapping":
        report.pendingMappingRows += 1;
        break;
    }
  }

  return report;
}
