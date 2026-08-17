"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ORGANIZATION_COOKIE, resolveMembershipContext } from "./runtime";
import { safeInternalPath, urlWithMessage } from "./redirect";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(formData: FormData) {
  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const next = safeInternalPath(formData.get("next"), "/workspace");

  if (!email || !password) {
    redirect(urlWithMessage(`/login?next=${encodeURIComponent(next)}`, "error", "Informe e-mail e senha."));
  }

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  if (!email || !email.includes("@")) {
    redirect(urlWithMessage("/recuperar-senha", "error", "Informe um e-mail válido."));
  }
  if (!appUrl) {
    redirect(urlWithMessage("/recuperar-senha", "error", "Recuperação de senha ainda não está configurada neste ambiente."));
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/auth/atualizar-senha")}`,
  });

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

  if (password.length < 8) {
    redirect(urlWithMessage("/auth/atualizar-senha", "error", "A nova senha deve ter pelo menos 8 caracteres."));
  }
  if (password !== confirmation) {
    redirect(urlWithMessage("/auth/atualizar-senha", "error", "As senhas não coincidem."));
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    redirect(urlWithMessage("/login", "error", "O link de recuperação expirou. Solicite um novo."));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(urlWithMessage("/auth/atualizar-senha", "error", "Não foi possível atualizar a senha. Solicite um novo link."));
  }

  revalidatePath("/", "layout");
  redirect(urlWithMessage("/workspace", "message", "Senha atualizada com sucesso."));
}

export async function selectOrganizationAction(formData: FormData) {
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
