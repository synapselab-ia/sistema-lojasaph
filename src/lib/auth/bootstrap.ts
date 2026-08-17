"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { ORGANIZATION_COOKIE } from "./runtime";
import { urlWithMessage } from "./redirect";

interface BootstrapStatus {
  configured: boolean;
  authenticated: boolean;
  eligible: boolean;
  email?: string;
}

function configuredOwnerEmail(): string | undefined {
  const value = process.env.LOJASAPH_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  return value || undefined;
}

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  const expectedEmail = configuredOwnerEmail();
  if (!expectedEmail) return { configured: false, authenticated: false, eligible: false };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !data.user || !email) {
    return { configured: true, authenticated: false, eligible: false };
  }

  return {
    configured: true,
    authenticated: true,
    eligible: email === expectedEmail,
    email,
  };
}

export async function bootstrapOwnerAction() {
  const expectedEmail = configuredOwnerEmail();
  if (!expectedEmail) {
    redirect(urlWithMessage("/bootstrap", "error", "Bootstrap não está habilitado neste ambiente."));
  }

  const userClient = await createServerSupabaseClient();
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  const email = user?.email?.trim().toLowerCase();
  if (userError || !user || !email) {
    redirect("/login?next=/bootstrap");
  }
  if (email !== expectedEmail) {
    redirect(urlWithMessage("/sem-acesso", "error", "Este usuário não está autorizado para o bootstrap inicial."));
  }

  const admin = createServerAdminSupabaseClient();
  const configuredOrganizationId = process.env.LOJASAPH_BOOTSTRAP_ORGANIZATION_ID?.trim();
  let organizationId = configuredOrganizationId;

  if (organizationId) {
    const { data, error } = await admin
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .eq("status", "active")
      .maybeSingle();
    if (error || !data) {
      redirect(urlWithMessage("/bootstrap", "error", "A organização configurada para bootstrap não existe ou está inativa."));
    }
  } else {
    const { data, error } = await admin.from("organizations").select("id").eq("status", "active").limit(2);
    if (error || !data || data.length !== 1) {
      redirect(
        urlWithMessage(
          "/bootstrap",
          "error",
          "Defina LOJASAPH_BOOTSTRAP_ORGANIZATION_ID quando houver zero ou mais de uma organização ativa.",
        ),
      );
    }
    organizationId = data[0]!.id as string;
  }

  const { data: owners, error: ownersError } = await admin
    .from("organization_memberships")
    .select("id, user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .eq("active", true)
    .limit(2);
  if (ownersError) {
    redirect(urlWithMessage("/bootstrap", "error", "Não foi possível verificar o owner atual."));
  }

  const existingForUser = owners?.find((owner) => owner.user_id === user.id);
  if (!existingForUser && (owners?.length ?? 0) > 0) {
    redirect(urlWithMessage("/sem-acesso", "error", "A organização já possui owner ativo. O bootstrap inicial está encerrado."));
  }

  let membershipId = existingForUser?.id as string | undefined;
  if (!membershipId) {
    const { data: membership, error: membershipError } = await admin
      .from("organization_memberships")
      .insert({ organization_id: organizationId, user_id: user.id, role: "owner", active: true })
      .select("id")
      .single();
    if (membershipError || !membership) {
      redirect(urlWithMessage("/bootstrap", "error", "Não foi possível criar o vínculo owner inicial."));
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
      redirect(urlWithMessage("/bootstrap", "error", "O bootstrap foi revertido porque a auditoria não pôde ser registrada."));
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
