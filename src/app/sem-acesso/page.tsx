import Link from "next/link";
import { Button, FeedbackMessage, Panel } from "@/components/ui";
import { getBootstrapStatus } from "@/lib/auth/bootstrap";
import { resolveMembershipContext } from "@/lib/auth/runtime";

interface NoAccessPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NoAccessPage({ searchParams }: NoAccessPageProps) {
  const context = await resolveMembershipContext();
  const bootstrap = await getBootstrapStatus();
  const error = first((await searchParams).error);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-8 sm:px-5 sm:py-10">
      <Panel className="w-full sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Permissões</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Acesso operacional indisponível</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {context.authenticated
            ? "Sua sessão é válida, mas não há um acesso ativo a uma organização disponível. Um administrador precisa criar ou reativar seu acesso."
            : "Sua sessão não está ativa. Entre novamente para continuar."}
        </p>
        {error && (
          <FeedbackMessage tone="danger" className="mt-5" role="alert">
            {error}
          </FeedbackMessage>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {!context.authenticated && (
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Entrar
            </Link>
          )}
          {context.authenticated && bootstrap.eligible && (
            <Link
              href="/bootstrap"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Configurar acesso inicial
            </Link>
          )}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary">
              Encerrar sessão
            </Button>
          </form>
        </div>
      </Panel>
    </main>
  );
}
