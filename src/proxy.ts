import { type NextRequest } from "next/server";
import {
  CORRELATION_HEADER,
  correlationIdFromHeaders,
} from "@/lib/observability/core";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const correlationId = correlationIdFromHeaders(request.headers);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_HEADER, correlationId);

  const response = await updateSupabaseSession(request, requestHeaders);
  response.headers.set(CORRELATION_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
