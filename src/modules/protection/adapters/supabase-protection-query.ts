import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import {
  ProtectionCoverage,
  ProtectionRun,
  ProtectionRunStatus,
  ProtectionSnapshot,
  ProtectionType,
} from "../application/protection-summary";

interface OrganizationRow {
  timezone: string;
}

interface CoverageRow {
  run_id: string;
}

interface ProtectionRunRow {
  id: string;
  protection_type: ProtectionType;
  status: ProtectionRunStatus;
  started_at: string;
  finished_at: string | null;
  valid_copy_at: string | null;
  integrity_verified: boolean;
  size_bytes: number | string | null;
  provider: string | null;
  destination: string | null;
  coverage: ProtectionCoverage;
  error_summary: string | null;
}

function queryError(scope: string, message: string): Error {
  return new Error(`Não foi possível carregar ${scope}: ${message}`);
}

function normalizeSize(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function mapRun(row: ProtectionRunRow): ProtectionRun {
  return Object.freeze({
    id: row.id,
    protectionType: row.protection_type,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    validCopyAt: row.valid_copy_at,
    integrityVerified: row.integrity_verified,
    sizeBytes: normalizeSize(row.size_bytes),
    provider: row.provider,
    destination: row.destination,
    coverage: row.coverage,
    errorSummary: row.error_summary,
  });
}

export class SupabaseProtectionQuery {
  constructor(private readonly client: SupabaseClient) {}

  async load(organizationId: EntityId): Promise<ProtectionSnapshot> {
    const [organizationResult, coverageResult] = await Promise.all([
      this.client
        .from("organizations")
        .select("timezone")
        .eq("id", organizationId)
        .single(),
      this.client
        .from("protection_run_organizations")
        .select("run_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (organizationResult.error) {
      throw queryError("a política de horário da organização", organizationResult.error.message);
    }
    if (coverageResult.error) {
      throw queryError("o histórico de proteção da organização", coverageResult.error.message);
    }

    const organization = organizationResult.data as OrganizationRow;
    const runIds = ((coverageResult.data ?? []) as CoverageRow[]).map((row) => row.run_id);

    if (runIds.length === 0) {
      return Object.freeze({ timeZone: organization.timezone, runs: [] });
    }

    const runsResult = await this.client
      .from("protection_runs")
      .select("id, protection_type, status, started_at, finished_at, valid_copy_at, integrity_verified, size_bytes, provider, destination, coverage, error_summary")
      .in("id", runIds)
      .order("started_at", { ascending: false })
      .limit(20);

    if (runsResult.error) {
      throw queryError("as evidências autoritativas de proteção", runsResult.error.message);
    }

    const runs = ((runsResult.data ?? []) as ProtectionRunRow[]).map(mapRun);
    return Object.freeze({ timeZone: organization.timezone, runs });
  }
}
