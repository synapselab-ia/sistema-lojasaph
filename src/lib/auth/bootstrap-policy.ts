export type BootstrapIdentityState = "unknown" | "missing" | "pending" | "confirmed";

export type BootstrapInvitationState =
  | "not_configured"
  | "configuration_required"
  | "ready"
  | "pending"
  | "confirmed"
  | "closed"
  | "unavailable";

export interface BootstrapAuthUserLike {
  readonly email?: string | null;
  readonly emailConfirmedAt?: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeBootstrapOwnerEmail(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || !EMAIL_PATTERN.test(normalized)) return undefined;
  return normalized;
}

export function isBootstrapInviteReady(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function resolveBootstrapOrganizationId(
  configuredId: string | undefined,
  activeOrganizationIds: readonly string[],
): string {
  const configured = configuredId?.trim();

  if (configured) {
    if (!activeOrganizationIds.includes(configured)) {
      throw new Error("BOOTSTRAP_ORGANIZATION_NOT_AVAILABLE");
    }
    return configured;
  }

  if (activeOrganizationIds.length !== 1) {
    throw new Error("BOOTSTRAP_ORGANIZATION_AMBIGUOUS");
  }

  return activeOrganizationIds[0]!;
}

export function classifyBootstrapIdentity(
  users: readonly BootstrapAuthUserLike[],
  expectedEmail: string,
): BootstrapIdentityState {
  const normalizedExpectedEmail = expectedEmail.trim().toLowerCase();
  const match = users.find((user) => user.email?.trim().toLowerCase() === normalizedExpectedEmail);
  if (!match) return "missing";
  return match.emailConfirmedAt ? "confirmed" : "pending";
}

export function determineBootstrapInvitationState(input: {
  readonly configured: boolean;
  readonly inviteReady: boolean;
  readonly appUrlReady: boolean;
  readonly ownerExists: boolean;
  readonly identityState: BootstrapIdentityState;
}): BootstrapInvitationState {
  if (!input.configured) return "not_configured";
  if (input.ownerExists) return "closed";
  if (input.identityState === "unknown") return "unavailable";
  if (input.identityState === "pending") return "pending";
  if (input.identityState === "confirmed") return "confirmed";
  if (!input.inviteReady || !input.appUrlReady) return "configuration_required";
  return "ready";
}

export function buildBootstrapInviteRedirectUrl(appBaseUrl: string): string {
  const url = new URL("/auth/invite", appBaseUrl);
  url.searchParams.set("next", "/bootstrap");
  return url.toString();
}
