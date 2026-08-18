import "server-only";

import { DomainError } from "@/domain/common/domain-error";
import {
  evaluateRuntimeEnvironment,
  requireSupabaseConfig,
  type RuntimeEnvironmentPolicy,
  type SupabasePublicConfig,
} from "./environment";

export interface RuntimeAccessSummary {
  readonly environment: RuntimeEnvironmentPolicy["environment"];
  readonly environmentSource: RuntimeEnvironmentPolicy["environmentSource"];
  readonly supabaseAccess: RuntimeEnvironmentPolicy["supabaseAccess"];
  readonly supabaseReason: string;
  readonly adminAccess: RuntimeEnvironmentPolicy["adminAccess"];
  readonly adminReason: string;
}

export function getRuntimeEnvironmentPolicy(): RuntimeEnvironmentPolicy {
  return evaluateRuntimeEnvironment(process.env);
}

export function getRuntimeAccessSummary(): RuntimeAccessSummary {
  const policy = getRuntimeEnvironmentPolicy();
  return {
    environment: policy.environment,
    environmentSource: policy.environmentSource,
    supabaseAccess: policy.supabaseAccess,
    supabaseReason: policy.supabaseReason,
    adminAccess: policy.adminAccess,
    adminReason: policy.adminReason,
  };
}

export function getSupabaseRuntimeConfig(): SupabasePublicConfig {
  return requireSupabaseConfig(getRuntimeEnvironmentPolicy());
}

export function getOptionalSupabaseRuntimeConfig(): SupabasePublicConfig | null {
  const policy = getRuntimeEnvironmentPolicy();
  return policy.supabaseAccess === "allowed" && policy.supabaseConfig ? policy.supabaseConfig : null;
}

export function getSupabaseAdminRuntimeConfig(): SupabasePublicConfig & { readonly secretKey: string } {
  const policy = getRuntimeEnvironmentPolicy();
  const config = requireSupabaseConfig(policy);
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (policy.adminAccess !== "allowed" || !secretKey) {
    throw new DomainError(
      "ADMIN_ENVIRONMENT_BLOCKED",
      "Credenciais administrativas não estão habilitadas para este ambiente.",
    );
  }

  return { ...config, secretKey };
}

export function getApplicationBaseUrl(): string {
  const policy = getRuntimeEnvironmentPolicy();
  if (!policy.appUrl) {
    throw new DomainError(
      "APP_URL_UNVERIFIED",
      "A URL pública deste ambiente não está configurada de forma segura.",
    );
  }
  return policy.appUrl;
}
