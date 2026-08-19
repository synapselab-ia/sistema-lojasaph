"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { correlationIdFromHeaders } from "@/lib/observability/core";
import { serverLogger } from "@/lib/observability/server";
import {
  getApplicationBaseUrl,
  getRuntimeAccessSummary,
} from "@/lib/runtime/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ORGANIZATION_COOKIE, resolveMembershipContext } from "./runtime";
import { safeInternalPath, urlWithMessage } from "./redirect";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function requestCorrelationId(): Promise<string> {
  return correlationIdFromHeaders(await headers());
}

async function requireOperationalBackend(path: string): Promise<void> {
  const runtime = getRuntimeAccessSummary();
  if (runtime.supabaseAccess === "allowed") return;

  serverLogger.warn("environment.supabase_access_blocked", {
    correlationId: await requestCorrelationId(),
    context: {
      environment: runtime.environment,
      reason: runtime.supabaseReason,
    },
  });
  redirect(
    urlWithMessage(
      path,
      "error",
      "Este ambiente não possui backend operacional isolado habilitado.",
    ),
  );
}

export async function loginAction(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const next = safeInternalPath(formData.get("next"), "/workspace");

  if (!email || !password) {
    redirect(urlWithMessage(`/login?next=${encodeURIComponent(next)}`, "error", "Informe e-mail e senha."));
  }

  await requireOperationalBackend(`/login?next=${encodeURIComponent(next)}`);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(urlWithMessage(`/login?next=${encodeURIComponent(next)}`, "error", "E-mail ou senha inválidos."));
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = field(formData, "email").toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(urlWithMessage("/recuperar-senha", "error", "Informe um e-mail válido."));
  }

  await requireOperationalBackend("/recuperar-senha");

  let appUrl: string;
  try {
    appUrl = getApplicationBaseUrl();
  } catch {
    serverLogger.warn("auth.password_reset.configuration_missing", {
      correlationId: await requestCorrelationId(),
    });
    redirect(urlWithMessage("/recuperar-senha", "error", "Recuperação de senha ainda não está configurada neste ambiente."));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/auth/atualizar-senha")}`,
  });

  if (error) {
    serverLogger.warn("auth.password_reset.provider_failed", {
      correlationId: await requestCorrelationId(),
      error,
    });
  }

  redirect(
    urlWithMessage(
      "/login",
      "message",
      "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.",
    ),
  );
}

export async function updatePasswordAction(formData: FormData) {
  const password = field(formData, "password");
  const confirmation = field(formData, "passwordConfirmation");
  const next = safeInternalPath(formData.get("next"), "/workspace");
  const updatePath = `/auth/atualizar-senha?next=${encodeURIComponent(next)}`;

  if (password.length < 8) {
    redirect(urlWithMessage(updatePath, "error", "A nova senha deve ter pelo menos 8 caracteres."));
  }
  if (password !== confirmation) {
    redirect(urlWithMessage(updatePath, "error", "As senhas não coincidem."));
  }

  await requireOperationalBackend(updatePath);
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    redirect(urlWithMessage("/login", "error", "O link de autenticação expirou. Solicite um novo."));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    serverLogger.warn("auth.password_update.provider_failed", {
      correlationId: await requestCorrelationId(),
      error,
    });
    redirect(urlWithMessage(updatePath, "error", "Não foi possível atualizar a senha. Solicite um novo link."));
  }

  revalidatePath("/", "layout");
  redirect(urlWithMessage(next, "message", "Senha atualizada com sucesso."));
}

export async function selectOrganizationAction(formData: FormData) {
  await requireOperationalBackend("/workspace/selecionar-organizacao");
  const organizationId = field(formData, "organizationId");
  const context = await resolveMembershipContext();

  if (!context.authenticated) redirect("/login?next=/workspace/selecionar-organizacao");
  const allowed = context.organizations.some((organization) => organization.id === organizationId);
  if (!allowed) {
    redirect(urlWithMessage("/workspace/selecionar-organizacao", "error", "Organização inválida para este usuário."));
  }

  const cookieStore = await cookies();
  cookieStore.set(ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/workspace", "layout");
  redirect("/workspace");
}
