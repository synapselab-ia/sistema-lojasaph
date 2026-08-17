import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseServerEnv } from "./env";

export function createServerRlsSupabaseClient(accessToken: string): SupabaseClient {
  const { url, publishableKey } = getSupabasePublicEnv();
  const token = accessToken.trim();
  if (!token) throw new Error("Authenticated Supabase access token is required.");

  return createClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createServerAdminSupabaseClient(): SupabaseClient {
  const { url, secretKey } = getSupabaseServerEnv();
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
