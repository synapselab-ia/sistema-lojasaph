import { describe, expect, it } from "vitest";
import {
  isAuthorizedApplicationInvite,
  isExpectedBootstrapInviteEmail,
  isSameOriginInviteRequest,
  parseImplicitInviteFragment,
} from "./implicit-invite";

describe("implicit invite flow", () => {
  it("accepts only complete invite fragments", () => {
    expect(parseImplicitInviteFragment(
      "#access_token=access&refresh_token=refresh&token_type=bearer&type=invite",
    )).toEqual({
      ok: true,
      tokens: { accessToken: "access", refreshToken: "refresh" },
    });

    expect(parseImplicitInviteFragment("#access_token=access&type=invite"))
      .toEqual({ ok: false, reason: "missing_tokens" });
    expect(parseImplicitInviteFragment("#access_token=access&refresh_token=refresh&type=recovery"))
      .toEqual({ ok: false, reason: "not_invite" });
  });

  it("does not surface provider error details from the URL fragment", () => {
    expect(parseImplicitInviteFragment(
      "#error=access_denied&error_code=otp_expired&error_description=secret-detail&type=invite",
    )).toEqual({ ok: false, reason: "provider_error" });
  });

  it("requires an exact same-origin POST", () => {
    expect(isSameOriginInviteRequest("https://sistema.example", "https://sistema.example/auth/invite/session"))
      .toBe(true);
    expect(isSameOriginInviteRequest("https://evil.example", "https://sistema.example/auth/invite/session"))
      .toBe(false);
    expect(isSameOriginInviteRequest(null, "https://sistema.example/auth/invite/session"))
      .toBe(false);
  });

  it("matches the bootstrap email case-insensitively without accepting missing values", () => {
    expect(isExpectedBootstrapInviteEmail(" OWNER@example.com ", "owner@example.com")).toBe(true);
    expect(isExpectedBootstrapInviteEmail("other@example.com", "owner@example.com")).toBe(false);
    expect(isExpectedBootstrapInviteEmail(undefined, "owner@example.com")).toBe(false);
  });

  it("accepts bootstrap or membership-backed invites and rejects unrelated ones", () => {
    expect(isAuthorizedApplicationInvite({ bootstrapEmailMatches: true, hasActiveMembership: false })).toBe(true);
    expect(isAuthorizedApplicationInvite({ bootstrapEmailMatches: false, hasActiveMembership: true })).toBe(true);
    expect(isAuthorizedApplicationInvite({ bootstrapEmailMatches: false, hasActiveMembership: false })).toBe(false);
  });
});
