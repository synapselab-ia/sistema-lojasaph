export const PROTECTION_RPO_HOURS = 24;
export const PROTECTION_RETENTION_DAYS = 30;

const PROTECTION_RPO_MS = PROTECTION_RPO_HOURS * 60 * 60 * 1000;

export type ProtectionType =
  | "automatic_database"
  | "automatic_storage"
  | "manual_export"
  | "restore_drill";

export type ProtectionRunStatus = "running" | "succeeded" | "failed";
export type ProtectionCoverage = "postgres" | "storage" | "organization_export";
export type ProtectionHealth = "healthy" | "attention" | "critical";

export interface ProtectionRun {
  readonly id: string;
  readonly protectionType: ProtectionType;
  readonly status: ProtectionRunStatus;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly validCopyAt: string | null;
  readonly integrityVerified: boolean;
  readonly sizeBytes: number | null;
  readonly provider: string | null;
  readonly destination: string | null;
  readonly coverage: ProtectionCoverage;
  readonly errorSummary: string | null;
}

export interface ProtectionSnapshot {
  readonly timeZone: string;
  readonly runs: readonly ProtectionRun[];
}

export interface ProtectionOverview {
  readonly health: ProtectionHealth;
  readonly headline: string;
  readonly detail: string;
  readonly latestDatabaseRun: ProtectionRun | null;
  readonly latestValidDatabaseRun: ProtectionRun | null;
  readonly rpoDeadline: string | null;
  readonly latestRestoreDrill: ProtectionRun | null;
  readonly recentRuns: readonly ProtectionRun[];
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidDatabaseCopy(run: ProtectionRun): boolean {
  return run.protectionType === "automatic_database"
    && run.coverage === "postgres"
    && run.status === "succeeded"
    && run.integrityVerified
    && run.validCopyAt !== null;
}

export function sortProtectionRuns(runs: readonly ProtectionRun[]): readonly ProtectionRun[] {
  return [...runs].sort((left, right) => timestamp(right.startedAt) - timestamp(left.startedAt));
}

export function buildProtectionOverview(
  runs: readonly ProtectionRun[],
  now: Date = new Date(),
): ProtectionOverview {
  const recentRuns = sortProtectionRuns(runs);
  const databaseRuns = recentRuns.filter(
    (run) => run.protectionType === "automatic_database" && run.coverage === "postgres",
  );
  const latestDatabaseRun = databaseRuns[0] ?? null;
  const latestValidDatabaseRun = databaseRuns.find(isValidDatabaseCopy) ?? null;
  const latestRestoreDrill = recentRuns.find((run) => run.protectionType === "restore_drill") ?? null;
  const validCopyTimestamp = latestValidDatabaseRun?.validCopyAt
    ? timestamp(latestValidDatabaseRun.validCopyAt)
    : null;
  const rpoDeadline = validCopyTimestamp
    ? new Date(validCopyTimestamp + PROTECTION_RPO_MS).toISOString()
    : null;
  const nowTimestamp = now.getTime();

  if (!latestDatabaseRun) {
    return {
      health: "attention",
      headline: "Histórico autoritativo ainda não iniciado",
      detail: "Nenhuma execução PostgreSQL foi registrada pela automação autoritativa para esta organização.",
      latestDatabaseRun,
      latestValidDatabaseRun,
      rpoDeadline,
      latestRestoreDrill,
      recentRuns,
    };
  }

  if (latestDatabaseRun.status === "failed") {
    return {
      health: "critical",
      headline: "Falha de proteção registrada",
      detail: "A execução PostgreSQL mais recente terminou com falha e requer atenção operacional.",
      latestDatabaseRun,
      latestValidDatabaseRun,
      rpoDeadline,
      latestRestoreDrill,
      recentRuns,
    };
  }

  if (validCopyTimestamp !== null && validCopyTimestamp + PROTECTION_RPO_MS <= nowTimestamp) {
    return {
      health: "critical",
      headline: "Cópia válida fora do RPO",
      detail: `A última cópia PostgreSQL válida ultrapassou a política de ${PROTECTION_RPO_HOURS} horas.`,
      latestDatabaseRun,
      latestValidDatabaseRun,
      rpoDeadline,
      latestRestoreDrill,
      recentRuns,
    };
  }

  if (!latestValidDatabaseRun) {
    const runAge = Math.max(0, nowTimestamp - timestamp(latestDatabaseRun.startedAt));
    const beyondRpo = runAge >= PROTECTION_RPO_MS;

    return {
      health: beyondRpo ? "critical" : "attention",
      headline: beyondRpo ? "Sem cópia válida dentro do RPO" : "Proteção em observação",
      detail: beyondRpo
        ? `Ainda não há cópia PostgreSQL válida registrada dentro da política de ${PROTECTION_RPO_HOURS} horas.`
        : "A automação já possui execução autoritativa, mas ainda não há uma cópia PostgreSQL válida concluída.",
      latestDatabaseRun,
      latestValidDatabaseRun,
      rpoDeadline,
      latestRestoreDrill,
      recentRuns,
    };
  }

  if (latestDatabaseRun.status === "running") {
    return {
      health: "attention",
      headline: "Proteção em andamento",
      detail: "Existe uma cópia válida dentro do RPO, mas uma nova execução PostgreSQL ainda está em andamento.",
      latestDatabaseRun,
      latestValidDatabaseRun,
      rpoDeadline,
      latestRestoreDrill,
      recentRuns,
    };
  }

  if (isValidDatabaseCopy(latestDatabaseRun)) {
    return {
      health: "healthy",
      headline: "Proteção PostgreSQL dentro da política",
      detail: `A execução mais recente foi concluída com integridade verificada e a cópia válida está dentro do RPO de ${PROTECTION_RPO_HOURS} horas.`,
      latestDatabaseRun,
      latestValidDatabaseRun,
      rpoDeadline,
      latestRestoreDrill,
      recentRuns,
    };
  }

  return {
    health: "critical",
    headline: "Evidência de proteção inconsistente",
    detail: "A execução PostgreSQL mais recente não contém evidência suficiente para declarar a proteção saudável.",
    latestDatabaseRun,
    latestValidDatabaseRun,
    rpoDeadline,
    latestRestoreDrill,
    recentRuns,
  };
}
