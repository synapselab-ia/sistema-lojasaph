"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EntityId, asEntityId } from "@/domain/common/entity-id";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { urlWithMessage } from "@/lib/auth/redirect";
import { getApplicationBaseUrl, getRuntimeAccessSummary } from "@/lib/runtime/server";
import { createServerAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageOrganizationAccess } from "@/modules/administration/application/administration-permissions";
import { parseAdministrationScope } from "@/modules/administration/application/administration-scope";
import {
  isAdministrationRole,
  isAdministrationStatus,
  isStockLocationType,
} from "@/modules/administration/domain/administration";

const STRUCTURE_PATH = "/workspace/administracao/estrutura";
const ACCESS_PATH = "/workspace/administracao/acessos";
const AUTH_USERS_PER_PAGE = 1000;
const MAX_AUTH_USER_PAGES = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function requiredEntityId(formData: FormData, name: string): EntityId | null {
  const value = field(formData, name);
  return UUID_PATTERN.test(value) ? asEntityId(value) : null;
}

function optionalEntityId(formData: FormData, name: string): EntityId | undefined | null {
  const value = field(formData, name);
  if (!value) return undefined;
  return UUID_PATTERN.test(value) ? asEntityId(value) : null;
}

async function selectedOrganization(path: string) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (context.organizations.length === 0) redirect("/sem-acesso");
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");
  if (!context.userId) redirect(`/login?next=${encodeURIComponent(path)}`);
  return {
    context,
    organization: context.selectedOrganization,
    organizationId: asEntityId(context.selectedOrganization.id),
    userId: asEntityId(context.userId),
  };
}

function normalizedNameAndCode(formData: FormData): { name: string; code: string } | null {
  const name = field(formData, "name");
  const code = field(formData, "code").toLowerCase();
  if (!name || !code || name.length > 160 || code.length > 80) return null;
  return { name, code };
}

function genericStructureError(path: string): never {
  redirect(urlWithMessage(path, "error", "Não foi possível salvar a estrutura. Confira os dados e seu escopo de acesso."));
}

function accessErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("LAST_ORGANIZATION_OWNER_REQUIRED")) {
    return "Mantenha ao menos um proprietário ativo com acesso a toda a organização.";
  }
  if (message.includes("MEMBERSHIP_SCOPE_HIERARCHY_MISMATCH")) {
    return "O escopo escolhido não corresponde à estrutura da organização.";
  }
  return "Não foi possível atualizar o acesso. Confira os dados e tente novamente.";
}

async function validateLocationSector(
  organizationId: EntityId,
  unitId: EntityId,
  sectorId: EntityId | undefined,
): Promise<boolean> {
  if (!sectorId) return true;
  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("sectors")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", sectorId)
    .eq("unit_id", unitId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function createBusinessAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const values = normalizedNameAndCode(formData);
  if (!values) genericStructureError(STRUCTURE_PATH);

  const client = await createServerSupabaseClient();
  const { error } = await client.from("businesses").insert({
    organization_id: organizationId,
    name: values.name,
    code: values.code,
    status: "active",
  });
  if (error) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Negócio adicionado à estrutura."));
}

export async function updateBusinessAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const id = requiredEntityId(formData, "id");
  const values = normalizedNameAndCode(formData);
  const status = field(formData, "status");
  if (!id || !values || !isAdministrationStatus(status)) genericStructureError(STRUCTURE_PATH);

  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("businesses")
    .update({ name: values.name, code: values.code, status })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Negócio atualizado."));
}

export async function createUnitAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const businessId = requiredEntityId(formData, "businessId");
  const values = normalizedNameAndCode(formData);
  if (!businessId || !values) genericStructureError(STRUCTURE_PATH);

  const client = await createServerSupabaseClient();
  const { error } = await client.from("units").insert({
    organization_id: organizationId,
    business_id: businessId,
    name: values.name,
    code: values.code,
    status: "active",
  });
  if (error) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Unidade adicionada à estrutura."));
}

export async function updateUnitAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const id = requiredEntityId(formData, "id");
  const values = normalizedNameAndCode(formData);
  const status = field(formData, "status");
  if (!id || !values || !isAdministrationStatus(status)) genericStructureError(STRUCTURE_PATH);

  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("units")
    .update({ name: values.name, code: values.code, status })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Unidade atualizada."));
}

export async function createSectorAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const unitId = requiredEntityId(formData, "unitId");
  const values = normalizedNameAndCode(formData);
  if (!unitId || !values) genericStructureError(STRUCTURE_PATH);

  const client = await createServerSupabaseClient();
  const { error } = await client.from("sectors").insert({
    organization_id: organizationId,
    unit_id: unitId,
    name: values.name,
    code: values.code,
    status: "active",
  });
  if (error) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Setor adicionado à estrutura."));
}

export async function updateSectorAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const id = requiredEntityId(formData, "id");
  const values = normalizedNameAndCode(formData);
  const status = field(formData, "status");
  if (!id || !values || !isAdministrationStatus(status)) genericStructureError(STRUCTURE_PATH);

  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("sectors")
    .update({ name: values.name, code: values.code, status })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Setor atualizado."));
}

export async function createStockLocationAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const unitId = requiredEntityId(formData, "unitId");
  const sectorId = optionalEntityId(formData, "sectorId");
  const values = normalizedNameAndCode(formData);
  const locationType = field(formData, "locationType");
  if (!unitId || sectorId === null || !values || !isStockLocationType(locationType)) genericStructureError(STRUCTURE_PATH);
  if (!(await validateLocationSector(organizationId, unitId, sectorId))) genericStructureError(STRUCTURE_PATH);

  const client = await createServerSupabaseClient();
  const { error } = await client.from("stock_locations").insert({
    organization_id: organizationId,
    unit_id: unitId,
    sector_id: sectorId ?? null,
    name: values.name,
    code: values.code,
    location_type: locationType,
    status: "active",
  });
  if (error) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Local de estoque adicionado."));
}

export async function updateStockLocationAction(formData: FormData) {
  const { organizationId } = await selectedOrganization(STRUCTURE_PATH);
  const id = requiredEntityId(formData, "id");
  const sectorId = optionalEntityId(formData, "sectorId");
  const values = normalizedNameAndCode(formData);
  const status = field(formData, "status");
  const locationType = field(formData, "locationType");
  if (!id || sectorId === null || !values || !isAdministrationStatus(status) || !isStockLocationType(locationType)) {
    genericStructureError(STRUCTURE_PATH);
  }

  const client = await createServerSupabaseClient();
  const { data: existing, error: lookupError } = await client
    .from("stock_locations")
    .select("unit_id")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (lookupError || !existing) genericStructureError(STRUCTURE_PATH);
  const unitId = asEntityId(existing.unit_id as string);
  if (!(await validateLocationSector(organizationId, unitId, sectorId))) genericStructureError(STRUCTURE_PATH);

  const { data, error } = await client
    .from("stock_locations")
    .update({
      name: values.name,
      code: values.code,
      sector_id: sectorId ?? null,
      location_type: locationType,
      status,
    })
    .eq("organization_id", organizationId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) genericStructureError(STRUCTURE_PATH);

  revalidatePath(STRUCTURE_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(STRUCTURE_PATH, "message", "Local de estoque atualizado."));
}

async function findAuthUserByEmail(email: string): Promise<User | undefined> {
  const admin = createServerAdminSupabaseClient();
  for (let page = 1; page <= MAX_AUTH_USER_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: AUTH_USERS_PER_PAGE });
    if (error) throw new Error("AUTH_DIRECTORY_UNAVAILABLE");
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (match) return match;
    if (data.users.length < AUTH_USERS_PER_PAGE) return undefined;
  }
  throw new Error("AUTH_DIRECTORY_LIMIT");
}

async function inviteAuthUser(email: string): Promise<User> {
  const runtime = getRuntimeAccessSummary();
  if (runtime.adminAccess !== "allowed") throw new Error("ADMIN_ENVIRONMENT_BLOCKED");

  const appUrl = getApplicationBaseUrl();
  const redirectUrl = new URL("/auth/invite", appUrl);
  redirectUrl.searchParams.set("next", "/workspace");

  const admin = createServerAdminSupabaseClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl.toString(),
  });
  if (error || !data.user) throw new Error("AUTH_INVITE_FAILED");
  return data.user;
}

export async function inviteOrganizationAccessAction(formData: FormData) {
  const { organization, organizationId } = await selectedOrganization(ACCESS_PATH);
  if (!canManageOrganizationAccess(organization.organizationWideRoles)) {
    redirect(urlWithMessage(ACCESS_PATH, "error", "Seu acesso não permite administrar usuários e permissões da organização."));
  }

  const email = field(formData, "email").toLowerCase();
  const role = field(formData, "role");
  const scope = parseAdministrationScope(field(formData, "scope"));
  if (!EMAIL_PATTERN.test(email) || !isAdministrationRole(role) || !scope) {
    redirect(urlWithMessage(ACCESS_PATH, "error", "Informe e-mail, papel e escopo válidos."));
  }

  try {
    let user = await findAuthUserByEmail(email);
    let invitationSent = false;
    if (!user) {
      user = await inviteAuthUser(email);
      invitationSent = true;
    }

    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("admin_create_organization_membership", {
      target_organization_id: organizationId,
      target_user_id: user.id,
      target_role: role,
      target_business_id: scope.businessId ?? null,
      target_unit_id: scope.unitId ?? null,
      target_sector_id: scope.sectorId ?? null,
    });
    if (error) throw new Error(error.message);

    revalidatePath(ACCESS_PATH);
    revalidatePath("/workspace", "layout");
    redirect(urlWithMessage(
      ACCESS_PATH,
      "message",
      invitationSent
        ? "Convite enviado e acesso preparado. A pessoa define a senha pelo link recebido."
        : "Acesso adicionado à identidade já existente.",
    ));
  } catch (error) {
    redirect(urlWithMessage(ACCESS_PATH, "error", accessErrorMessage(error)));
  }
}

export async function updateOrganizationAccessAction(formData: FormData) {
  await selectedOrganization(ACCESS_PATH);
  const membershipId = requiredEntityId(formData, "membershipId");
  const role = field(formData, "role");
  const scope = parseAdministrationScope(field(formData, "scope"));
  const active = field(formData, "active") === "true";
  if (!membershipId || !isAdministrationRole(role) || !scope) {
    redirect(urlWithMessage(ACCESS_PATH, "error", "Informe papel, escopo e estado válidos."));
  }

  try {
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("admin_update_organization_membership", {
      target_membership_id: membershipId,
      target_role: role,
      target_business_id: scope.businessId ?? null,
      target_unit_id: scope.unitId ?? null,
      target_sector_id: scope.sectorId ?? null,
      target_active: active,
    });
    if (error) throw new Error(error.message);

    revalidatePath(ACCESS_PATH);
    revalidatePath("/workspace", "layout");
    redirect(urlWithMessage(ACCESS_PATH, "message", "Acesso atualizado."));
  } catch (error) {
    redirect(urlWithMessage(ACCESS_PATH, "error", accessErrorMessage(error)));
  }
}
