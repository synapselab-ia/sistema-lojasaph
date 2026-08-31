"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getApplicationBaseUrl,
  getRuntimeAccessSummary,
} from "@/lib/runtime/server";
import { createServerAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildBootstrapInviteRedirectUrl,
  classifyBootstrapIdentity,
  determineBootstrapInvitationState,
  isBootstrapInviteReady,
  normalizeBootstrapOwnerEmail,
  resolveBootstrapOrganizationId,
  type BootstrapIdentityState,
  type BootstrapInvitationState,
} from "./bootstrap-policy";
import { ORGANIZATION_COOKIE } from "./runtime";
import { urlWithMessage } from "./redirect";

interface BootstrapStatus {
  readonly configured: boolean;
  readonly authenticated: boolean;
  readonly eligible: boolean;
  readonly invitationState: BootstrapInvitationState;
}

interface OwnerRow {
  readonly id: string;
  readonly user_id: string;
}

const AUTH_USERS_PER_PAGE = 1000;
const MAX_AUTH_USER_PAGES = 100;

function configuredOwnerEmail(): string | undefined {
  return normalizeBootstrapOwnerEmail(process.env.LOJASAPH_BOOTSTRAP_OWNER_EMAIL);
}

function configuredInviteReadiness(): string | undefined {
  return process.env.LOJASAPH_BOOTSTRAP_INVITE_READY
    ?? process.env.LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY;
}

function organizationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "BOOTSTRAP_ORGANIZATION_NOT_AVAILABLE") {
    return "A organização definida para a configuração inicial não existe ou está inativa.";
  }
  if (error instanceof Error && error.message === "BOOTSTRAP_ORGANIZATION_AMBIGUOUS") {
    return "A configuração inicial precisa indicar qual organização será usada.";
  }
  return "Não foi possível verificar a organização da configuração inicial.";
}

async function resolveBootstrapOrganization(admin: SupabaseClient): Promise<string> {
  const configuredOrganizationId = process.env.LOJASAPH_BOOTSTRAP_ORGANIZATION_ID?.trim();

  if (configuredOrganizationId) {
    const { data, error } = await admin
      .from("organizations")
      .select("id")
      .eq("id", configuredOrganizationId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw new Error("BOOTSTRAP_ORGANIZATION_LOOKUP_FAILED");

    return resolveBootstrapOrganizationId(
      configuredOrganizationId,
      data ? [data.id as string] : [],
    );
  }

  const { data, error } = await admin
    .from("organizations")
    .select("id")
    .eq("status", "active")
    .limit(2);
  if (error) throw new Error("BOOTSTRAP_ORGANIZATION_LOOKUP_FAILED");

  return resolveBootstrapOrganizationId(
    undefined,
    (data ?? []).map((row) => row.id as string),
  );
}

async function readActiveOwners(admin: SupabaseClient, organizationId: string): Promise<readonly OwnerRow[]> {
  const { data, error } = await admin
    .from("organization_memberships")
    .select("id, user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .eq("active", true)
    .limit(2);
  if (error) throw new Error("BOOTSTRAP_OWNER_LOOKUP_FAILED");
  return (data ?? []) as OwnerRow[];
}

async function readBootstrapIdentityState(
  admin: SupabaseClient,
  expectedEmail: string,
): Promise<BootstrapIdentityState> {
  for (let page = 1; page <= MAX_AUTH_USER_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: AUTH_USERS_PER_PAGE,
    });
    if (error) throw new Error("BOOTSTRAP_AUTH_USER_LOOKUP_FAILED");

    const state = classifyBootstrapIdentity(
      data.users.map((user) => ({
        email: user.email,
        emailConfirmedAt: user.email_confirmed_at,
      })),
      expectedEmail,
    );
    if (state !== "missing") return state;
    if (data.users.length < AUTH_USERS_PER_PAGE) return "missing";
  }

  throw new Error("BOOTSTRAP_AUTH_USER_LOOKUP_LIMIT");
}

function optionalApplicationBaseUrl(): string | undefined {
  try {
    return getApplicationBaseUrl();
  } catch {
    return undefined;
  }
}

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  const runtime = getRuntimeAccessSummary();
  const expectedEmail = configuredOwnerEmail();
  if (
    runtime.supabaseAccess !== "allowed"
    || runtime.adminAccess !== "allowed"
    || !expectedEmail
  ) {
    return {
      configured: false,
      authenticated: false,
      eligible: false,
      invitationState: "not_configured",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const authenticatedEmail = userData.user?.email?.trim().toLowerCase();
  const authenticated = !userError && Boolean(userData.user && authenticatedEmail);
  const eligible = authenticated && authenticatedEmail === expectedEmail;

  let invitationState: BootstrapInvitationState = "unavailable";
  try {
    const admin = createServerAdminSupabaseClient();
    const organizationId = await resolveBootstrapOrganization(admin);
    const owners = await readActiveOwners(admin, organizationId);

    if (owners.length > 0) {
      invitationState = "closed";
    } else {
      const identityState = await readBootstrapIdentityState(admin, expectedEmail);
      invitationState = determineBootstrapInvitationState({
        configured: true,
        inviteReady: isBootstrapInviteReady(configuredInviteReadiness()),
        appUrlReady: Boolean(optionalApplicationBaseUrl()),
        ownerExists: false,
        identityState,
      });
    }
  } catch {
    invitationState = "unavailable";
  }

  return {
    configured: true,
    authenticated,
    eligible,
    invitationState,
  };
}

export async function inviteBootstrapOwnerAction() {
  const runtime = getRuntimeAccessSummary();
  if (runtime.supabaseAccess !== "allowed" || runtime.adminAccess !== "allowed") {
    redirect(urlWithMessage("/bootstrap", "error", "A configuração inicial não está habilitada neste ambiente."));
  }

  const expectedEmail = configuredOwnerEmail();
  if (!expectedEmail) {
    redirect(urlWithMessage("/bootstrap", "error", "A configuração inicial não está habilitada neste ambiente."));
  }

  let admin: SupabaseClient;
  try {
    admin = createServerAdminSupabaseClient();
  } catch {
    redirect(urlWithMessage("/bootstrap", "error", "A configuração inicial não está pronta neste ambiente."));
  }

  let organizationId: string;
  try {
    organizationId = await resolveBootstrapOrganization(admin);
  } catch (error) {
    redirect(urlWithMessage("/bootstrap", "error", organizationErrorMessage(error)));
  }

  let owners: readonly OwnerRow[];
  try {
    owners = await readActiveOwners(admin, organizationId);
  } catch {
    redirect(urlWithMessage("/bootstrap", "error", "Não foi possível verificar o acesso administrativo existente."));
  }

  if (owners.length > 0) {
    redirect(urlWithMessage("/bootstrap", "error", "A organização já possui acesso administrativo inicial ativo. A configuração inicial está encerrada."));
  }

  let identityState: BootstrapIdentityState;
  try {
    identityState = await readBootstrapIdentityState(admin, expectedEmail);
  } catch {
    redirect(urlWithMessage("/bootstrap", "error", "Não foi possível verificar a conta autorizada. O convite não foi enviado."));
  }

  if (identityState === "pending") {
    redirect(urlWithMessage(
      "/bootstrap",
      "message",
      "O endereço autorizado já possui convite pendente. Use o link recebido; um novo envio precisa ser feito de forma controlada.",
    ));
  }

  if (identityState === "confirmed") {
    redirect(urlWithMessage(
      "/bootstrap",
      "message",
      "A conta autorizada já existe. Entre com essa conta para concluir o acesso inicial.",
    ));
  }

  if (!isBootstrapInviteReady(configuredInviteReadiness())) {
    redirect(urlWithMessage(
      "/bootstrap",
      "error",
      "O convite permanece bloqueado até as configurações de endereço e entrega de e-mail estarem prontas.",
    ));
  }

  const appUrl = optionalApplicationBaseUrl();
  if (!appUrl) {
    redirect(urlWithMessage(
      "/bootstrap",
      "error",
      "O endereço público seguro da aplicação não está configurado para o convite.",
    ));
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(expectedEmail, {
    redirectTo: buildBootstrapInviteRedirectUrl(appUrl),
  });
  if (inviteError) {
    redirect(urlWithMessage(
      "/bootstrap",
      "error",
      "Não foi possível enviar o convite inicial. Nenhum acesso foi criado.",
    ));
  }

  redirect(urlWithMessage(
    "/bootstrap",
    "message",
    "Convite inicial enviado ao endereço autorizado. O acesso à organização será concluído depois que a conta for confirmada.",
  ));
}

export async function bootstrapOwnerAction() {
  const runtime = getRuntimeAccessSummary();
  if (runtime.supabaseAccess !== "allowed" || runtime.adminAccess !== "allowed") {
    redirect(urlWithMessage("/bootstrap", "error", "A configuração inicial não está habilitada neste ambiente."));
  }

  const expectedEmail = configuredOwnerEmail();
  if (!expectedEmail) {
    redirect(urlWithMessage("/bootstrap", "error", "A configuração inicial não está habilitada neste ambiente."));
  }

  const userClient = await createServerSupabaseClient();
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  const email = user?.email?.trim().toLowerCase();
  if (userError || !user || !email) {
    redirect("/login?next=/bootstrap");
  }
  if (email !== expectedEmail) {
    redirect(urlWithMessage("/sem-acesso", "error", "Esta conta não está autorizada para a configuração inicial."));
  }

  let admin: SupabaseClient;
  try {
    admin = createServerAdminSupabaseClient();
  } catch {
    redirect(urlWithMessage("/bootstrap", "error", "A configuração inicial não está pronta neste ambiente."));
  }

  let organizationId: string;
  try {
    organizationId = await resolveBootstrapOrganization(admin);
  } catch (error) {
    redirect(urlWithMessage("/bootstrap", "error", organizationErrorMessage(error)));
  }

  let owners: readonly OwnerRow[];
  try {
    owners = await readActiveOwners(admin, organizationId);
  } catch {
    redirect(urlWithMessage("/bootstrap", "error", "Não foi possível verificar o acesso administrativo existente."));
  }

  const existingForUser = owners.find((owner) => owner.user_id === user.id);
  if (!existingForUser && owners.length > 0) {
    redirect(urlWithMessage("/sem-acesso", "error", "A organização já possui acesso administrativo inicial ativo. A configuração inicial está encerrada."));
  }

  let membershipId = existingForUser?.id;
  if (!membershipId) {
    const { data: membership, error: membershipError } = await admin
      .from("organization_memberships")
      .insert({ organization_id: organizationId, user_id: user.id, role: "owner", active: true })
      .select("id")
      .single();
    if (membershipError || !membership) {
      redirect(urlWithMessage("/bootstrap", "error", "Não foi possível concluir o acesso administrativo inicial."));
    }
    membershipId = membership.id as string;

    const { error: auditError } = await admin.from("audit_logs").insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      action: "membership.bootstrap_owner",
      entity_type: "organization_membership",
      entity_id: membershipId,
      after_data: { user_id: user.id, role: "owner", active: true },
      metadata: { source: "server_bootstrap" },
    });

    if (auditError) {
      await admin.from("organization_memberships").delete().eq("id", membershipId);
      redirect(urlWithMessage("/bootstrap", "error", "A configuração inicial foi revertida porque o registro de auditoria não pôde ser concluído."));
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
  redirect("/workspace");
}
