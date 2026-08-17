import { redirect } from "next/navigation";
import { updatePasswordAction } from "@/lib/auth/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface UpdatePasswordPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?error=O+link+de+recuperação+expirou.+Solicite+um+novo.");

  const error = first((await searchParams).error);
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Segurança</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Definir nova senha</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">Use uma senha exclusiva para o Sistema Lojasaph.</p>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <form action={updatePasswordAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Nova senha<input name="password" type="password" minLength={8} autoComplete="new-password" required className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal" /></label>
          <label className="block text-sm font-medium">Confirmar nova senha<input name="passwordConfirmation" type="password" minLength={8} autoComplete="new-password" required className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-normal" /></label>
          <button type="submit" className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700">Atualizar senha</button>
        </form>
      </section>
    </main>
  );
}
