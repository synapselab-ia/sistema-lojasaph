export interface ImplicitInviteTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export type ImplicitInviteParseResult =
  | { readonly ok: true; readonly tokens: ImplicitInviteTokens }
  | {
      readonly ok: false;
      readonly reason: "missing_fragment" | "provider_error" | "not_invite" | "missing_tokens";
    };

const MAX_TOKEN_LENGTH = 32_768;

function validToken(value: string | null): value is string {
  return Boolean(value && value.length <= MAX_TOKEN_LENGTH);
}

export function parseImplicitInviteFragment(fragment: string): ImplicitInviteParseResult {
  const normalized = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  if (!normalized) return { ok: false, reason: "missing_fragment" };

  const params = new URLSearchParams(normalized);
  if (params.has("error") || params.has("error_code") || params.has("error_description")) {
    return { ok: false, reason: "provider_error" };
  }

  if (params.get("type") !== "invite") {
    return { ok: false, reason: "not_invite" };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!validToken(accessToken) || !validToken(refreshToken)) {
    return { ok: false, reason: "missing_tokens" };
  }

  return {
    ok: true,
    tokens: { accessToken, refreshToken },
  };
}

export function isSameOriginInviteRequest(origin: string | null, expectedOrigin: string): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

export function isExpectedBootstrapInviteEmail(
  actualEmail: string | null | undefined,
  expectedEmail: string | undefined,
): boolean {
  const actual = actualEmail?.trim().toLowerCase();
  const expected = expectedEmail?.trim().toLowerCase();
  return Boolean(actual && expected && actual === expected);
}
