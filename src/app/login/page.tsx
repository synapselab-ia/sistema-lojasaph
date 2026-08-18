import Link from "next/link";
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
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Sistema Lojasaph</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Acesso operacional protegido por sessão e permissões da organização.</p>

        {!operational && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Este ambiente está isolado do backend operacional. Login e mutações permanecem desabilitados até existir um backend próprio aprovado.
          </p>
        )}
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {message && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

        {operational && (
          <form action={loginAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <label className="block text-sm font-medium">
              E-mail
              <input name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-neutral-800" />
            </label>
            <label className="block text-sm font-medium">
              Senha
              <input name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal outline-none focus:border-neutral-800" />
            </label>
            <button type="submit" className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700">Entrar no workspace</button>
          </form>
        )}

        <div className="mt-5 flex items-center justify-between gap-4 text-sm">
          {operational ? (
            <Link href="/recuperar-senha" className="font-medium text-neutral-700 underline underline-offset-4">Esqueci minha senha</Link>
          ) : <span />}
          <Link href="/" className="text-neutral-500 hover:text-neutral-900">Voltar</Link>
        </div>
      </section>
    </main>
  );
}
