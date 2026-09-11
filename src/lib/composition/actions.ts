"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asEntityId } from "@/domain/common/entity-id";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { urlWithMessage } from "@/lib/auth/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  CapabilityDependencyError,
  validateCapabilityChange,
} from "@/modules/composition/application/capability-resolver";
import { loadResolvedOrganizationCapabilities } from "@/modules/composition/adapters/supabase-capability-settings";
import { getCapabilityDefinition, isCapabilityId } from "@/modules/composition/domain/capability";

const MODULES_PATH = "/workspace/administracao/modulos";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function complete(message: string): never {
  revalidatePath(MODULES_PATH);
  revalidatePath("/workspace", "layout");
  redirect(urlWithMessage(MODULES_PATH, "message", message));
}

function fail(message: string): never {
  redirect(urlWithMessage(MODULES_PATH, "error", message));
}

export async function setOrganizationCapabilityAction(formData: FormData) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect(`/login?next=${encodeURIComponent(MODULES_PATH)}`);
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");

  const organization = context.selectedOrganization;
  if (!organization.organizationWideRoles.includes("owner")) {
    fail("Somente um proprietário com acesso a toda a organização pode alterar os módulos.");
  }

  const rawCapabilityId = field(formData, "capabilityId");
  const rawEnabled = field(formData, "enabled");
  if (!isCapabilityId(rawCapabilityId) || (rawEnabled !== "true" && rawEnabled !== "false")) {
    fail("A alteração solicitada não é válida.");
  }

  const capability = getCapabilityDefinition(rawCapabilityId);
  if (!capability.configurable) {
    fail("Esse módulo ainda não pode ser alterado nesta etapa do rollout.");
  }

  const organizationId = asEntityId(organization.id);
  const client = await createServerSupabaseClient();
  const states = await loadResolvedOrganizationCapabilities(client, organizationId);
  const nextEnabled = rawEnabled === "true";

  try {
    validateCapabilityChange(states, rawCapabilityId, nextEnabled);
  } catch (error) {
    if (error instanceof CapabilityDependencyError) fail(error.message);
    throw error;
  }

  const { error } = await client.rpc("set_organization_capability", {
    p_organization_id: organizationId,
    p_capability_id: rawCapabilityId,
    p_enabled: nextEnabled,
  });

  if (error) {
    if (error.message.includes("CAPABILITY_DEPENDENCY_DISABLED")) {
      fail("Esse módulo depende de outra área que não está ativa.");
    }
    if (error.message.includes("INSUFFICIENT_ROLE")) {
      fail("Somente um proprietário com acesso a toda a organização pode alterar os módulos.");
    }
    fail("Não foi possível alterar a composição do sistema agora.");
  }

  complete(nextEnabled ? `${capability.name} ativado.` : `${capability.name} desativado sem apagar histórico.`);
}
