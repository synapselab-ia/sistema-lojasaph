import { type NextRequest, NextResponse } from "next/server";
import { normalizeBootstrapOwnerEmail } from "@/lib/auth/bootstrap-policy";
import {
  isExpectedBootstrapInviteEmail,
  isSameOriginInviteRequest,
} from "@/lib/auth/implicit-invite";
import { getRuntimeAccessSummary } from "@/lib/runtime/server";
import {
  createServerRlsSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

const MAX_REQUEST_BYTES = 70_000;
const MAX_TOKEN_LENGTH = 32_768;

function noStoreJson(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_TOKEN_LENGTH;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginInviteRequest(request.headers.get("origin"), request.url)) {
    return noStoreJson({ ok: false }, 403);
  }

  const runtime = getRuntimeAccessSummary();
  if (runtime.supabaseAccess !== "allowed") {
    return noStoreJson({ ok: false }, 403);
  }

  const expectedEmail = normalizeBootstrapOwnerEmail(process.env.LOJASAPH_BOOTSTRAP_OWNER_EMAIL);
  if (!expectedEmail) {
    return noStoreJson({ ok: false }, 403);
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return noStoreJson({ ok: false }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return noStoreJson({ ok: false }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ ok: false }, 400);
  }

  if (!body || typeof body !== "object") {
    return noStoreJson({ ok: false }, 400);
  }

  const accessToken = "accessToken" in body ? body.accessToken : undefined;
  const refreshToken = "refreshToken" in body ? body.refreshToken : undefined;
  if (!validToken(accessToken) || !validToken(refreshToken)) {
    return noStoreJson({ ok: false }, 400);
  }

  const verifier = createServerRlsSupabaseClient(accessToken);
  const { data: verifiedData, error: verifyError } = await verifier.auth.getUser(accessToken);
  const verifiedUser = verifiedData.user;
  if (
    verifyError
    || !verifiedUser
    || !verifiedUser.email_confirmed_at
    || !isExpectedBootstrapInviteEmail(verifiedUser.email, expectedEmail)
  ) {
    return noStoreJson({ ok: false }, 403);
  }

  const sessionClient = await createServerSupabaseClient();
  const { data: sessionData, error: sessionError } = await sessionClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (
    sessionError
    || !sessionData.user
    || sessionData.user.id !== verifiedUser.id
    || !isExpectedBootstrapInviteEmail(sessionData.user.email, expectedEmail)
  ) {
    await sessionClient.auth.signOut();
    return noStoreJson({ ok: false }, 401);
  }

  return noStoreJson({ ok: true }, 200);
}
