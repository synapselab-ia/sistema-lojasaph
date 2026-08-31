import { describe, expect, it } from "vitest";
import {
  buildProtectionOverview,
  ProtectionRun,
  sortProtectionRuns,
} from "./protection-summary";

const NOW = new Date("2026-08-26T20:00:00.000Z");

function run(overrides: Partial<ProtectionRun> = {}): ProtectionRun {
  return {
    id: "run-1",
    protectionType: "automatic_database",
    status: "succeeded",
    startedAt: "2026-08-26T18:00:00.000Z",
    finishedAt: "2026-08-26T18:10:00.000Z",
    validCopyAt: "2026-08-26T18:05:00.000Z",
    integrityVerified: true,
    sizeBytes: 53185,
    provider: "cloudflare_r2",
    destination: "s3_compatible_offsite",
    coverage: "postgres",
    errorSummary: null,
    ...overrides,
  };
}

describe("protection status policy", () => {
  it("keeps the legitimate initial empty state in attention", () => {
    const overview = buildProtectionOverview([], NOW);

    expect(overview.health).toBe("attention");
    expect(overview.latestDatabaseRun).toBeNull();
    expect(overview.latestValidDatabaseRun).toBeNull();
  });

  it("is healthy only with a recent successful and verified PostgreSQL copy", () => {
    const overview = buildProtectionOverview([run()], NOW);

    expect(overview.health).toBe("healthy");
    expect(overview.rpoDeadline).toBe("2026-08-27T18:05:00.000Z");
  });

  it("marks a running latest execution as attention while a prior valid copy remains inside RPO", () => {
    const overview = buildProtectionOverview([
      run({ id: "valid", startedAt: "2026-08-26T17:00:00.000Z", validCopyAt: "2026-08-26T17:05:00.000Z" }),
      run({
        id: "running",
        status: "running",
        startedAt: "2026-08-26T19:30:00.000Z",
        finishedAt: null,
        validCopyAt: null,
        integrityVerified: false,
        sizeBytes: null,
      }),
    ], NOW);

    expect(overview.health).toBe("attention");
    expect(overview.latestDatabaseRun?.id).toBe("running");
    expect(overview.latestValidDatabaseRun?.id).toBe("valid");
  });

  it("treats a persisted failure as critical even if an older valid copy is still inside RPO", () => {
    const overview = buildProtectionOverview([
      run({ id: "valid", startedAt: "2026-08-26T17:00:00.000Z", validCopyAt: "2026-08-26T17:05:00.000Z" }),
      run({
        id: "failed",
        status: "failed",
        startedAt: "2026-08-26T19:00:00.000Z",
        finishedAt: "2026-08-26T19:10:00.000Z",
        validCopyAt: null,
        integrityVerified: false,
        sizeBytes: null,
        errorSummary: "Automatic PostgreSQL backup failed before verified off-site completion.",
      }),
    ], NOW);

    expect(overview.health).toBe("critical");
    expect(overview.latestDatabaseRun?.id).toBe("failed");
  });

  it("marks a valid copy older than the 24-hour RPO as critical", () => {
    const overview = buildProtectionOverview([
      run({
        startedAt: "2026-08-25T18:00:00.000Z",
        finishedAt: "2026-08-25T18:10:00.000Z",
        validCopyAt: "2026-08-25T18:05:00.000Z",
      }),
    ], NOW);

    expect(overview.health).toBe("critical");
    expect(overview.headline).toBe("Cópia válida fora do prazo");
  });

  it("marks a long-running execution without any valid copy as critical after the RPO", () => {
    const overview = buildProtectionOverview([
      run({
        status: "running",
        startedAt: "2026-08-25T18:00:00.000Z",
        finishedAt: null,
        validCopyAt: null,
        integrityVerified: false,
        sizeBytes: null,
      }),
    ], NOW);

    expect(overview.health).toBe("critical");
  });

  it("sorts recent history by authoritative start time", () => {
    const sorted = sortProtectionRuns([
      run({ id: "older", startedAt: "2026-08-25T10:00:00.000Z" }),
      run({ id: "newer", startedAt: "2026-08-26T10:00:00.000Z" }),
      run({ id: "middle", startedAt: "2026-08-26T08:00:00.000Z" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["newer", "middle", "older"]);
  });

  it("reports the latest restore drill independently from PostgreSQL health", () => {
    const overview = buildProtectionOverview([
      run(),
      run({
        id: "drill",
        protectionType: "restore_drill",
        status: "failed",
        coverage: "postgres",
        startedAt: "2026-08-26T19:00:00.000Z",
        finishedAt: "2026-08-26T19:05:00.000Z",
        validCopyAt: null,
        integrityVerified: false,
        sizeBytes: null,
        errorSummary: "Restore drill failed.",
      }),
    ], NOW);

    expect(overview.health).toBe("healthy");
    expect(overview.latestRestoreDrill?.id).toBe("drill");
  });
});
