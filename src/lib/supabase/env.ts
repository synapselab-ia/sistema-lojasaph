import { DomainError } from "@/domain/common/domain-error";

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new DomainError("MISSING_SUPABASE_ENV", `Missing required environment variable: ${name}.`);
  }
  return value.trim();
}

export function getSupabasePublicEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  } as const;
}

export function getSupabaseServerEnv() {
  return {
    ...getSupabasePublicEnv(),
    secretKey: required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  } as const;
}
