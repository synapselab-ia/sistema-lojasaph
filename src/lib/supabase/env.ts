import "server-only";

import {
  getSupabaseAdminRuntimeConfig,
  getSupabaseRuntimeConfig,
} from "@/lib/runtime/server";

export function getSupabasePublicEnv() {
  return getSupabaseRuntimeConfig();
}

export function getSupabaseServerEnv() {
  return getSupabaseAdminRuntimeConfig();
}
