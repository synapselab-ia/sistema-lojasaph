import { redirect } from "next/navigation";
import { FeedbackMessage, FormField, Input, Panel, SubmitButton } from "@/components/ui";
import { updatePasswordAction } from "@/lib/auth/actions";
import { safeInternalPath } from "@/lib/auth/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface UpdatePasswordPageProps {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?error=O+link+de+autenticação+expirou.+Solicite+um+novo.");

  const params = await searchParams;
  const error = first(params.error);
  const next = safeInternalPath(first(params.next), "/workspace");

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-5 sm:py-10">
      <Panel className="w-full sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Segurança</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Definir nova senha</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Use uma senha exclusiva para o Sistema Lojasaph.</p>

        {error && (
          <FeedbackMessage tone="danger" className="mt-5" role="alert">
            {error}
          </FeedbackMessage>
        )}

        <form action={updatePasswordAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <FormField id="new-password" label="Nova senha" hint="Use pelo menos 8 caracteres." required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            )}
          </FormField>
          <FormField id="new-password-confirmation" label="Confirmar nova senha" required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="passwordConfirmation"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            )}
          </FormField>
          <SubmitButton variant="primary" block pendingLabel="Atualizando senha...">
            Atualizar senha
          </SubmitButton>
        </form>
      </Panel>
    </main>
  );
}
