import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/auth/redirect";
import {
  CORRELATION_HEADER,
  correlationIdFromHeaders,
} from "@/lib/observability/core";
import { serverLogger } from "@/lib/observability/server";

export async function GET(request: NextRequest) {
  const correlationId = correlationIdFromHeaders(request.headers);
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeInternalPath(searchParams.get("next"), "/workspace");
  const supabase = await createServerSupabaseClient();

  let error: Error | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error;
  } else {
    error = new Error("Missing authentication callback parameters");
  }

  if (error) {
    serverLogger.warn("auth.callback.failed", {
      correlationId,
      error,
      context: {
        hasCode: Boolean(code),
        hasTokenHash: Boolean(tokenHash),
        hasType: Boolean(type),
      },
    });

    const failure = new URL("/login", request.url);
    failure.searchParams.set("error", "O link de autenticação é inválido ou expirou.");
    const response = NextResponse.redirect(failure);
    response.headers.set(CORRELATION_HEADER, correlationId);
    return response;
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  response.headers.set(CORRELATION_HEADER, correlationId);
  return response;
}
