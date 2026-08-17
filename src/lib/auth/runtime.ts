import "server-only";

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const ORGANIZATION_COOKIE = "lojasaph-organization-id";

export interface RuntimeOrganization {
  readonly id: string;
  readonly name: string;
  readonly roles: readonly string[];
}

export interface MembershipContext {
  readonly authenticated: boolean;
  readonly userId?: string;
  readonly email?: string;
  readonly organizations: readonly RuntimeOrganization[];
  readonly selectedOrganization?: RuntimeOrganization;
}

interface MembershipRow {
  organization_id: string;
  role: string;
}

interface OrganizationRow {
  id: string;
  name: string;
}

export async function resolveMembershipContext(): Promise<MembershipContext> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : undefined;

  if (claimsError || !userId) {
    return { authenticated: false, organizations: [] };
  }

  const emailClaim = claims?.email;
  const email = typeof emailClaim === "string" ? emailClaim : undefined;
  const { data: membershipData, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("active", true);

  if (membershipError) {
    throw new Error(`Não foi possível carregar os vínculos do usuário: ${membershipError.message}`);
  }

  const memberships = (membershipData ?? []) as MembershipRow[];
  if (memberships.length === 0) {
    return { authenticated: true, userId, email, organizations: [] };
  }

  const organizationIds = [...new Set(memberships.map((membership) => membership.organization_id))];
  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", organizationIds)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (organizationError) {
    throw new Error(`Não foi possível carregar as organizações do usuário: ${organizationError.message}`);
  }

  const rolesByOrganization = new Map<string, Set<string>>();
  for (const membership of memberships) {
    const roles = rolesByOrganization.get(membership.organization_id) ?? new Set<string>();
    roles.add(membership.role);
    rolesByOrganization.set(membership.organization_id, roles);
  }

  const organizations = ((organizationData ?? []) as OrganizationRow[]).map((organization) => ({
    id: organization.id,
    name: organization.name,
    roles: [...(rolesByOrganization.get(organization.id) ?? new Set<string>())].sort(),
  }));

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ORGANIZATION_COOKIE)?.value;
  const selectedOrganization =
    organizations.length === 1
      ? organizations[0]
      : organizations.find((organization) => organization.id === selectedId);

  return {
    authenticated: true,
    userId,
    email,
    organizations,
    selectedOrganization,
  };
}

export function hasAnyRole(organization: RuntimeOrganization, allowedRoles: readonly string[]): boolean {
  const allowed = new Set(allowedRoles);
  return organization.roles.some((role) => allowed.has(role));
}
