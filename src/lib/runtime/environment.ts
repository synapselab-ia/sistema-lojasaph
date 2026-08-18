import { DomainError } from "@/domain/common/domain-error";

export type AppEnvironment = "development" | "preview" | "production" | "unknown";
export type EnvironmentSource = "explicit" | "vercel" | "local" | "unknown";
export type RuntimeAccess = "allowed" | "blocked";

export interface RuntimeEnvironmentSource {
  readonly [key: string]: string | undefined;
}

export interface SupabasePublicConfig {
  readonly url: string;
  readonly publishableKey: string;
}

export interface RuntimeEnvironmentPolicy {
  readonly environment: AppEnvironment;
  readonly environmentSource: EnvironmentSource;
  readonly supabaseAccess: RuntimeAccess;
  readonly supabaseReason: string;
  readonly supabaseConfig?: SupabasePublicConfig;
  readonly adminAccess: RuntimeAccess;
  readonly adminReason: string;
  readonly appUrl?: string;
}

const APP_ENVIRONMENTS = new Set(["development", "preview", "production"]);

function trimmed(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function parseEnvironment(value: string | undefined): Exclude<AppEnvironment, "unknown"> | undefined {
  const normalized = trimmed(value)?.toLowerCase();
  if (!normalized || !APP_ENVIRONMENTS.has(normalized)) return undefined;
  return normalized as Exclude<AppEnvironment, "unknown">;
}

function environmentIdentity(source: RuntimeEnvironmentSource): {
  environment: AppEnvironment;
  source: EnvironmentSource;
  reason?: string;
} {
  const explicitRaw = trimmed(source.LOJASAPH_APP_ENV);
  const vercelRaw = trimmed(source.VERCEL_ENV);
  const explicit = parseEnvironment(explicitRaw);
  const vercel = parseEnvironment(vercelRaw);

  if (explicitRaw && !explicit) {
    return { environment: "unknown", source: "unknown", reason: "invalid_explicit_environment" };
  }
  if (vercelRaw && !vercel) {
    return { environment: "unknown", source: "unknown", reason: "invalid_vercel_environment" };
  }
  if (explicit && vercel && explicit !== vercel) {
    return { environment: "unknown", source: "unknown", reason: "environment_mismatch" };
  }
  if (explicit) return { environment: explicit, source: "explicit" };
  if (vercel) return { environment: vercel, source: "vercel" };

  const nodeEnv = trimmed(source.NODE_ENV)?.toLowerCase();
  if (nodeEnv === "development" || nodeEnv === "test") {
    return { environment: "development", source: "local" };
  }

  return { environment: "unknown", source: "unknown", reason: "environment_unverified" };
}

function parseUrl(value: string | undefined): URL | undefined {
  const normalized = trimmed(value);
  if (!normalized) return undefined;
  try {
    return new URL(normalized);
  } catch {
    return undefined;
  }
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized === "host.docker.internal" ||
    normalized.startsWith("127.")
  );
}

function isLocalUrl(url: URL): boolean {
  return isLocalHostname(url.hostname);
}

export function supabaseProjectRefFromUrl(value: string | undefined): string | undefined {
  const url = parseUrl(value);
  if (!url) return undefined;
  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith(".supabase.co")) return undefined;
  const projectRef = hostname.slice(0, -".supabase.co".length);
  return projectRef && !projectRef.includes(".") ? projectRef : undefined;
}

function publicSupabaseConfig(source: RuntimeEnvironmentSource): SupabasePublicConfig | undefined {
  const url = trimmed(source.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = trimmed(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !publishableKey || !parseUrl(url)) return undefined;
  return { url, publishableKey };
}

function resolveSupabaseAccess(
  environment: AppEnvironment,
  identityReason: string | undefined,
  source: RuntimeEnvironmentSource,
): { access: RuntimeAccess; reason: string; config?: SupabasePublicConfig } {
  if (environment === "unknown") {
    return { access: "blocked", reason: identityReason ?? "environment_unverified" };
  }

  const config = publicSupabaseConfig(source);
  if (!config) return { access: "blocked", reason: "supabase_not_configured" };

  const url = new URL(config.url);
  const actualRef = supabaseProjectRefFromUrl(config.url);
  const productionRef = trimmed(source.LOJASAPH_PRODUCTION_SUPABASE_REF);

  if (environment === "production") {
    if (isLocalUrl(url)) return { access: "blocked", reason: "production_backend_is_local" };
    if (productionRef && actualRef !== productionRef) {
      return { access: "blocked", reason: "production_backend_mismatch" };
    }
    return { access: "allowed", reason: "production_backend", config };
  }

  if (environment === "preview") {
    const previewRef = trimmed(source.LOJASAPH_PREVIEW_SUPABASE_REF);
    if (!productionRef || !previewRef || !actualRef) {
      return { access: "blocked", reason: "preview_backend_unverified" };
    }
    if (previewRef === productionRef || actualRef === productionRef || actualRef !== previewRef) {
      return { access: "blocked", reason: "preview_backend_mismatch" };
    }
    return { access: "allowed", reason: "preview_isolated_backend", config };
  }

  if (isLocalUrl(url)) {
    return { access: "allowed", reason: "development_local_backend", config };
  }

  const developmentRef = trimmed(source.LOJASAPH_DEVELOPMENT_SUPABASE_REF);
  if (!productionRef || !developmentRef || !actualRef) {
    return { access: "blocked", reason: "development_backend_unverified" };
  }
  if (developmentRef === productionRef || actualRef === productionRef || actualRef !== developmentRef) {
    return { access: "blocked", reason: "development_backend_mismatch" };
  }
  return { access: "allowed", reason: "development_isolated_backend", config };
}

function normalizedBaseUrl(value: string | undefined, requireHttps: boolean): string | undefined {
  const url = parseUrl(value);
  if (!url) return undefined;
  if (requireHttps && url.protocol !== "https:") return undefined;
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  return url.toString().replace(/\/$/, "");
}

function vercelHostUrl(value: string | undefined): string | undefined {
  const host = trimmed(value);
  if (!host) return undefined;
  const candidate = host.includes("://") ? host : `https://${host}`;
  return normalizedBaseUrl(candidate, true);
}

function resolveAppUrl(environment: AppEnvironment, source: RuntimeEnvironmentSource): string | undefined {
  if (environment === "preview") {
    return vercelHostUrl(source.VERCEL_URL);
  }
  if (environment === "production") {
    return (
      normalizedBaseUrl(source.NEXT_PUBLIC_APP_URL, true) ??
      vercelHostUrl(source.VERCEL_PROJECT_PRODUCTION_URL)
    );
  }
  if (environment === "development") {
    const configured = normalizedBaseUrl(source.NEXT_PUBLIC_APP_URL, false);
    if (configured) {
      const url = new URL(configured);
      if (isLocalUrl(url)) return configured;
    }
    return "http://localhost:3000";
  }
  return undefined;
}

export function evaluateRuntimeEnvironment(source: RuntimeEnvironmentSource): RuntimeEnvironmentPolicy {
  const identity = environmentIdentity(source);
  const supabase = resolveSupabaseAccess(identity.environment, identity.reason, source);
  const secretPresent = Boolean(trimmed(source.SUPABASE_SECRET_KEY));
  const nonProductionAdminExplicit = trimmed(source.LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN)?.toLowerCase() === "true";
  const adminAllowed =
    supabase.access === "allowed" &&
    secretPresent &&
    (identity.environment === "production" || nonProductionAdminExplicit);

  return {
    environment: identity.environment,
    environmentSource: identity.source,
    supabaseAccess: supabase.access,
    supabaseReason: supabase.reason,
    ...(supabase.config ? { supabaseConfig: supabase.config } : {}),
    adminAccess: adminAllowed ? "allowed" : "blocked",
    adminReason: adminAllowed
      ? identity.environment === "production"
        ? "production_admin"
        : "explicit_isolated_non_production_admin"
      : secretPresent
        ? "admin_environment_blocked"
        : "admin_secret_not_configured",
    ...(resolveAppUrl(identity.environment, source) ? { appUrl: resolveAppUrl(identity.environment, source) } : {}),
  };
}

export function requireSupabaseConfig(policy: RuntimeEnvironmentPolicy): SupabasePublicConfig {
  if (policy.supabaseAccess !== "allowed" || !policy.supabaseConfig) {
    throw new DomainError(
      "ENVIRONMENT_ISOLATION_BLOCKED",
      "Este ambiente não possui um backend Supabase isolado e aprovado para uso operacional.",
    );
  }
  return policy.supabaseConfig;
}
