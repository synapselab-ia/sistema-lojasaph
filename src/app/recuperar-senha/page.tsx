import Link from "next/link";
import { Button, FeedbackMessage, FormField, Input, Panel } from "@/components/ui";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { getRuntimeAccessSummary } from "@/lib/runtime/server";

interface RecoveryPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const error = first((await searchParams).error);
  const operational = getRuntimeAccessSummary().supabaseAccess === "allowed";

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-5 sm:py-10">
      <Panel className="w-full sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Acesso</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Informe o e-mail da conta. Por segurança, a confirmação não informa se o endereço está cadastrado.
        </p>

        {!operational && (
          <FeedbackMessage tone="attention" className="mt-5">
            A recuperação de senha não está disponível neste ambiente.
          </FeedbackMessage>
        )}
        {error && (
          <FeedbackMessage tone="danger" className="mt-5" role="alert">
            {error}
          </FeedbackMessage>
        )}

        {operational && (
          <form action={requestPasswordResetAction} className="mt-6 space-y-4">
            <FormField id="recovery-email" label="E-mail" required>
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
            <Button type="submit" variant="primary" block>
              Enviar instruções
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-5 inline-flex min-h-11 items-center font-medium text-neutral-700 underline underline-offset-4"
        >
          Voltar ao login
        </Link>
      </Panel>
    </main>
  );
}
