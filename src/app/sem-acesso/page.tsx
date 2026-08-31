import Link from "next/link";
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
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Permissões</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Acesso operacional indisponível</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {context.authenticated
            ? "Sua sessão é válida, mas não há um acesso ativo a uma organização disponível. Um administrador precisa criar ou reativar seu acesso."
            : "Sua sessão não está ativa. Entre novamente para continuar."}
        </p>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {!context.authenticated && <Link href="/login" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Entrar</Link>}
          {context.authenticated && bootstrap.eligible && <Link href="/bootstrap" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Configurar acesso inicial</Link>}
          <form action="/auth/signout" method="post"><button type="submit" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">Encerrar sessão</button></form>
        </div>
      </section>
    </main>
  );
}
