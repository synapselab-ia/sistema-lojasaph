import { createBrowserClient } from "@supabase/ssr";
import { type SupabasePublicConfig } from "@/lib/runtime/environment";

export function createBrowserSupabaseClient(config: SupabasePublicConfig) {
  return createBrowserClient(config.url, config.publishableKey);
}
