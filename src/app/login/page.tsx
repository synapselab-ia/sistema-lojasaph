import Link from "next/link";
import { Button, FeedbackMessage, FormField, Input, Panel } from "@/components/ui";
import { loginAction } from "@/lib/auth/actions";
import { safeInternalPath } from "@/lib/auth/redirect";
import { getRuntimeAccessSummary } from "@/lib/runtime/server";

interface LoginPageProps {
  searchParams: Promise<{ error?: string | string[]; message?: string | string[]; next?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);
  const next = safeInternalPath(first(params.next), "/workspace");
  const runtime = getRuntimeAccessSummary();
  const operational = runtime.supabaseAccess === "allowed";

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-5 sm:py-10">
      <Panel className="w-full sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Sistema Lojasaph</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Use sua conta autorizada para acessar as áreas disponíveis da organização.</p>

        {!operational && (
          <FeedbackMessage tone="attention" className="mt-5">
            O acesso operacional não está disponível neste ambiente.
          </FeedbackMessage>
        )}
        {error && <FeedbackMessage tone="danger" className="mt-5" role="alert">{error}</FeedbackMessage>}
        {message && <FeedbackMessage tone="success" className="mt-5" role="status">{message}</FeedbackMessage>}

        {operational && (
          <form action={loginAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <FormField id="login-email" label="E-mail" required>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              )}
            </FormField>
            <FormField id="login-password" label="Senha" required>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              )}
            </FormField>
            <Button type="submit" variant="primary" block>Entrar no sistema</Button>
          </form>
        )}

        <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {operational ? (
            <Link href="/recuperar-senha" className="inline-flex min-h-11 items-center font-medium text-neutral-700 underline underline-offset-4">Esqueci minha senha</Link>
          ) : <span />}
          <Link href="/" className="inline-flex min-h-11 items-center text-neutral-500 hover:text-neutral-900 sm:justify-end">Voltar</Link>
        </div>
      </Panel>
    </main>
  );
}
