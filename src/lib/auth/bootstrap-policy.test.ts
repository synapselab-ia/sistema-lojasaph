import { describe, expect, it } from "vitest";
import {
  buildBootstrapInviteRedirectUrl,
  classifyBootstrapIdentity,
  determineBootstrapInvitationState,
  isBootstrapInviteReady,
  normalizeBootstrapOwnerEmail,
  resolveBootstrapOrganizationId,
} from "./bootstrap-policy";

describe("bootstrap owner policy", () => {
  it("normalizes only a configured valid owner email", () => {
    expect(normalizeBootstrapOwnerEmail("  OWNER@Example.com ")).toBe("owner@example.com");
    expect(normalizeBootstrapOwnerEmail(undefined)).toBeUndefined();
    expect(normalizeBootstrapOwnerEmail("not-an-email")).toBeUndefined();
  });

  it("requires an explicit server-side readiness flag for invite delivery", () => {
    expect(isBootstrapInviteReady("true")).toBe(true);
    expect(isBootstrapInviteReady(" TRUE ")).toBe(true);
    expect(isBootstrapInviteReady(undefined)).toBe(false);
    expect(isBootstrapInviteReady("false")).toBe(false);
  });

  it("resolves the configured Organization only when it is active", () => {
    expect(resolveBootstrapOrganizationId("org-a", ["org-a", "org-b"])).toBe("org-a");
    expect(() => resolveBootstrapOrganizationId("org-c", ["org-a", "org-b"]))
      .toThrow("BOOTSTRAP_ORGANIZATION_NOT_AVAILABLE");
  });

  it("fails closed when Organization inference is ambiguous", () => {
    expect(resolveBootstrapOrganizationId(undefined, ["org-a"])).toBe("org-a");
    expect(() => resolveBootstrapOrganizationId(undefined, [])).toThrow("BOOTSTRAP_ORGANIZATION_AMBIGUOUS");
    expect(() => resolveBootstrapOrganizationId(undefined, ["org-a", "org-b"]))
      .toThrow("BOOTSTRAP_ORGANIZATION_AMBIGUOUS");
  });

  it("distinguishes missing, pending and confirmed Auth identities", () => {
    expect(classifyBootstrapIdentity([], "owner@example.com")).toBe("missing");
    expect(classifyBootstrapIdentity([
      { email: "OWNER@example.com", emailConfirmedAt: null },
    ], "owner@example.com")).toBe("pending");
    expect(classifyBootstrapIdentity([
      { email: "owner@example.com", emailConfirmedAt: "2026-08-19T20:00:00Z" },
    ], "owner@example.com")).toBe("confirmed");
  });

  it("never offers another invite for an existing owner or Auth identity", () => {
    expect(determineBootstrapInvitationState({
      configured: true,
      inviteReady: true,
      appUrlReady: true,
      ownerExists: true,
      identityState: "confirmed",
    })).toBe("closed");

    expect(determineBootstrapInvitationState({
      configured: true,
      inviteReady: true,
      appUrlReady: true,
      ownerExists: false,
      identityState: "pending",
    })).toBe("pending");

    expect(determineBootstrapInvitationState({
      configured: true,
      inviteReady: true,
      appUrlReady: true,
      ownerExists: false,
      identityState: "confirmed",
    })).toBe("confirmed");
  });

  it("offers the invite only after all server-side prerequisites are ready", () => {
    expect(determineBootstrapInvitationState({
      configured: true,
      inviteReady: false,
      appUrlReady: true,
      ownerExists: false,
      identityState: "missing",
    })).toBe("configuration_required");

    expect(determineBootstrapInvitationState({
      configured: true,
      inviteReady: true,
      appUrlReady: true,
      ownerExists: false,
      identityState: "missing",
    })).toBe("ready");
  });

  it("uses the dedicated implicit invite page and explicit bootstrap destination", () => {
    expect(buildBootstrapInviteRedirectUrl("https://sistema.example/"))
      .toBe("https://sistema.example/auth/invite?next=%2Fbootstrap");
  });
});
