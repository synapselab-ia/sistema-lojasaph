import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/common/domain-error";
import {
  REDACTED_VALUE,
  createStructuredLogRecord,
  correlationIdFromHeaders,
  redactLogContext,
  sanitizeLogText,
} from "./core";
import { toPublicError } from "./public-error";

describe("observability core", () => {
  it("creates a stable structured log envelope", () => {
    const record = createStructuredLogRecord({
      level: "warn",
      event: "auth.callback.failed",
      correlationId: "request-12345678",
      context: { route: "/auth/callback", attempts: 1 },
      now: () => new Date("2026-08-18T18:00:00.000Z"),
    });

    expect(record).toEqual({
      timestamp: "2026-08-18T18:00:00.000Z",
      service: "sistema-lojasaph",
      level: "warn",
      event: "auth.callback.failed",
      correlationId: "request-12345678",
      context: { route: "/auth/callback", attempts: 1 },
    });
  });

  it("redacts credential and common PII fields recursively", () => {
    const context = redactLogContext({
      organizationId: "org-1",
      password: "never-log-me",
      nested: {
        authorization: "Bearer secret-token",
        email: "cliente@example.com",
        token_hash: "abc123",
      },
    });

    expect(context).toEqual({
      organizationId: "org-1",
      password: REDACTED_VALUE,
      nested: {
        authorization: REDACTED_VALUE,
        email: REDACTED_VALUE,
        token_hash: REDACTED_VALUE,
      },
    });
  });

  it("sanitizes secrets embedded in free-form error text", () => {
    const value = sanitizeLogText(
      "Bearer super-secret eyJabcdefgh.ijklmnop.qrstuvwx postgres://admin:password@db.example.com/app cliente@example.com",
    );

    expect(value).not.toContain("super-secret");
    expect(value).not.toContain("eyJabcdefgh");
    expect(value).not.toContain("admin:password");
    expect(value).not.toContain("cliente@example.com");
  });

  it("reuses only valid inbound correlation identifiers", () => {
    expect(correlationIdFromHeaders(new Headers({ "x-correlation-id": "req-12345678" }))).toBe("req-12345678");

    const generated = correlationIdFromHeaders(new Headers({ "x-correlation-id": "bad id with spaces" }));
    expect(generated).not.toBe("bad id with spaces");
    expect(generated).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("public error mapping", () => {
  it("keeps explicit domain-rule messages", () => {
    const error = new DomainError("INVALID_STOCK_QUANTITY", "A quantidade deve ser maior que zero.");

    expect(toPublicError(error, "req-12345678")).toEqual({
      code: "INVALID_STOCK_QUANTITY",
      message: "A quantidade deve ser maior que zero.",
      reference: "req-12345678",
    });
  });

  it("does not expose persistence details to the UI", () => {
    const error = new DomainError(
      "SUPABASE_PERSISTENCE_ERROR",
      "Failed to record stock entry: database detail cliente@example.com",
    );

    const result = toPublicError(error);
    expect(result.code).toBe("OPERATION_FAILED");
    expect(result.message).toBe("Não foi possível concluir a operação. Tente novamente.");
    expect(result.message).not.toContain("database detail");
  });

  it("maps unknown errors to a generic public failure", () => {
    const result = toPublicError(new Error("postgres://admin:password@db.internal/app"));

    expect(result).toEqual({
      code: "UNEXPECTED_ERROR",
      message: "Não foi possível concluir a operação. Tente novamente.",
    });
  });
});
