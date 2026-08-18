import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ORGANIZATION_COOKIE } from "@/lib/auth/runtime";
import { correlationIdFromHeaders } from "@/lib/observability/core";
import { serverLogger } from "@/lib/observability/server";
import { getRuntimeAccessSummary } from "@/lib/runtime/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const correlationId = correlationIdFromHeaders(request.headers);
  const runtime = getRuntimeAccessSummary();

  if (runtime.supabaseAccess === "allowed") {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        serverLogger.warn("auth.signout.provider_failed", {
          correlationId,
          error,
        });
      }
    }
  } else {
    serverLogger.info("auth.signout.environment_blocked", {
      correlationId,
      context: {
        environment: runtime.environment,
        reason: runtime.supabaseReason,
      },
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(ORGANIZATION_COOKIE);
  revalidatePath("/", "layout");
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 302 });
  response.headers.set("x-correlation-id", correlationId);
  return response;
}
