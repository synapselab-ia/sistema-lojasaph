import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOptionalSupabaseRuntimeConfig } from "@/lib/runtime/server";

export async function updateSupabaseSession(request: NextRequest, requestHeaders = new Headers(request.headers)) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const config = getOptionalSupabaseRuntimeConfig();

  // Preview/Development remain renderable when an isolated backend is not proven.
  // Auth and operational data access stay fail-closed because no Supabase client is created.
  if (!config) return response;

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // getClaims validates the JWT and refreshes the cookie-backed session when necessary.
  await supabase.auth.getClaims();
  return response;
}
