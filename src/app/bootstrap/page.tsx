import Link from "next/link";
import { bootstrapOwnerAction, getBootstrapStatus } from "@/lib/auth/bootstrap";

interface BootstrapPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BootstrapPage({ searchParams }: BootstrapPageProps) {
  const status = await getBootstrapStatus();
  const error = first((await searchParams).error);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Inicialização administrativa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Configurar primeiro owner</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">Esta rotina existe apenas para o primeiro vínculo administrativo. Ela exige e-mail explicitamente autorizado no ambiente, sessão válida e ausência de outro owner ativo.</p>

        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {!status.configured && <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">Bootstrap desabilitado. Configure as variáveis server-only somente no ambiente em que a inicialização será executada.</p>}
        {status.configured && !status.authenticated && <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">Entre com a conta autorizada antes de executar o bootstrap.</p>}
        {status.authenticated && !status.eligible && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">A conta autenticada não corresponde ao e-mail autorizado para bootstrap.</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          {status.eligible && <form action={bootstrapOwnerAction}><button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Criar vínculo owner inicial</button></form>}
          {!status.authenticated && <Link href="/login?next=/bootstrap" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Entrar</Link>}
          <Link href="/" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">Voltar</Link>
        </div>
      </section>
    </main>
  );
}
