import { createBrowserClient } from "@supabase/ssr";
import {
  evaluateRuntimeEnvironment,
  requireSupabaseConfig,
  type SupabasePublicConfig,
} from "@/lib/runtime/environment";

function browserRuntimeConfig(): SupabasePublicConfig {
  const policy = evaluateRuntimeEnvironment({
    VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_LOJASAPH_PRODUCTION_SUPABASE_REF:
      process.env.NEXT_PUBLIC_LOJASAPH_PRODUCTION_SUPABASE_REF,
    NEXT_PUBLIC_LOJASAPH_PREVIEW_SUPABASE_REF:
      process.env.NEXT_PUBLIC_LOJASAPH_PREVIEW_SUPABASE_REF,
    NEXT_PUBLIC_LOJASAPH_DEVELOPMENT_SUPABASE_REF:
      process.env.NEXT_PUBLIC_LOJASAPH_DEVELOPMENT_SUPABASE_REF,
  });
  return requireSupabaseConfig(policy);
}

export function createBrowserSupabaseClient(config?: SupabasePublicConfig) {
  const resolved = config ?? browserRuntimeConfig();
  return createBrowserClient(resolved.url, resolved.publishableKey);
}
