export const CORRELATION_HEADER = "x-correlation-id";
export const REDACTED_VALUE = "[REDACTED]";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredError {
  readonly name: string;
  readonly code?: string;
  readonly digest?: string;
  readonly message?: string;
}

export interface StructuredLogRecord {
  readonly timestamp: string;
  readonly service: "sistema-lojasaph";
  readonly level: LogLevel;
  readonly event: string;
  readonly correlationId: string;
  readonly context?: Record<string, unknown>;
  readonly error?: StructuredError;
}

interface LogRecordInput {
  readonly level: LogLevel;
  readonly event: string;
  readonly correlationId?: string | null;
  readonly context?: Record<string, unknown>;
  readonly error?: unknown;
  readonly now?: () => Date;
}

type HeaderSource =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

const MAX_TEXT_LENGTH = 2_000;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizedKey(key);
  return (
    normalized.includes("authorization") ||
    normalized.includes("cookie") ||
    normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("apikey") ||
    normalized.includes("service_role") ||
    normalized.includes("servicerole") ||
    normalized.includes("connectionstring") ||
    normalized.includes("databaseurl") ||
    normalized === "email" ||
    normalized === "phone" ||
    normalized === "cpf" ||
    normalized === "cnpj" ||
    normalized === "document"
  );
}

export function sanitizeLogText(value: string): string {
  return value
    .slice(0, MAX_TEXT_LENGTH)
    .replace(/Bearer\s+[^\s,;]+/gi, `Bearer ${REDACTED_VALUE}`)
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, REDACTED_VALUE)
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9._-]+\b/gi, `sb_${REDACTED_VALUE}`)
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^@\s/]+)@/gi, `$1${REDACTED_VALUE}@`)
    .replace(/([?&](?:token|access_token|refresh_token|apikey|api_key|secret|password)=)[^&\s]+/gi, `$1${REDACTED_VALUE}`)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]");
}

function redactValue(value: unknown, key: string | undefined, seen: WeakSet<object>, depth: number): unknown {
  if (key && isSensitiveKey(key)) return REDACTED_VALUE;
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return sanitizeLogText(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value);
  if (depth >= 6) return "[MAX_DEPTH]";

  if (typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);

    if (Array.isArray(value)) {
      return value.slice(0, 25).map((item) => redactValue(item, undefined, seen, depth + 1));
    }

    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      output[entryKey] = redactValue(entryValue, entryKey, seen, depth + 1);
    }
    return output;
  }

  return String(value);
}

export function redactLogContext(context: Record<string, unknown>): Record<string, unknown> {
  return redactValue(context, undefined, new WeakSet<object>(), 0) as Record<string, unknown>;
}

export function resolveCorrelationId(value?: string | null): string {
  const candidate = value?.trim();
  if (candidate && CORRELATION_ID_PATTERN.test(candidate)) return candidate;
  return globalThis.crypto.randomUUID();
}

export function correlationIdFromHeaders(headers: HeaderSource): string {
  let raw: string | string[] | undefined | null;
  if ("get" in headers && typeof headers.get === "function") {
    raw = headers.get(CORRELATION_HEADER);
  } else {
    raw = headers[CORRELATION_HEADER] ?? headers[CORRELATION_HEADER.toLowerCase()];
  }
  return resolveCorrelationId(Array.isArray(raw) ? raw[0] : raw);
}

export function serializeError(error: unknown): StructuredError {
  if (error instanceof Error) {
    const extended = error as Error & { code?: unknown; digest?: unknown };
    return {
      name: error.name || "Error",
      ...(typeof extended.code === "string" ? { code: sanitizeLogText(extended.code) } : {}),
      ...(typeof extended.digest === "string" ? { digest: sanitizeLogText(extended.digest) } : {}),
      ...(error.message ? { message: sanitizeLogText(error.message) } : {}),
    };
  }

  return {
    name: "UnknownError",
    message: sanitizeLogText(String(error)),
  };
}

export function createStructuredLogRecord(input: LogRecordInput): StructuredLogRecord {
  return {
    timestamp: (input.now ?? (() => new Date()))().toISOString(),
    service: "sistema-lojasaph",
    level: input.level,
    event: input.event,
    correlationId: resolveCorrelationId(input.correlationId),
    ...(input.context ? { context: redactLogContext(input.context) } : {}),
    ...(input.error !== undefined ? { error: serializeError(input.error) } : {}),
  };
}
