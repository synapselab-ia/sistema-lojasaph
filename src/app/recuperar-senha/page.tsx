import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/auth/actions";

interface RecoveryPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const error = first((await searchParams).error);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Acesso</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Informe o e-mail da conta. A resposta é deliberadamente neutra para não revelar quais endereços estão cadastrados.</p>

        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <form action={requestPasswordResetAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            E-mail
            <input name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-neutral-800" />
          </label>
          <button type="submit" className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700">Enviar instruções</button>
        </form>

        <Link href="/login" className="mt-5 inline-block text-sm font-medium text-neutral-700 underline underline-offset-4">Voltar ao login</Link>
      </section>
    </main>
  );
}
