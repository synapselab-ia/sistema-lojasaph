import { redirect } from "next/navigation";
import { selectOrganizationAction } from "@/lib/auth/actions";
import { resolveMembershipContext } from "@/lib/auth/runtime";

interface OrganizationPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OrganizationSelectionPage({ searchParams }: OrganizationPageProps) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect("/login?next=/workspace/selecionar-organizacao");
  if (context.organizations.length === 0) redirect("/sem-acesso");
  if (context.organizations.length === 1) redirect("/workspace");

  const error = first((await searchParams).error);
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:py-16">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Organização</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Selecione onde deseja trabalhar</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
          Sua escolha define a organização usada na operação atual. O sistema continua respeitando os acessos já configurados e você poderá trocar de organização depois.
        </p>
      </header>
      {error && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {context.organizations.map((organization) => (
          <form key={organization.id} action={selectOrganizationAction} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="organizationId" value={organization.id} />
            <h2 className="font-semibold">{organization.name}</h2>
            <p className="mt-1 text-xs text-neutral-500">Acesso disponível para esta organização.</p>
            <button type="submit" className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Usar esta organização</button>
          </form>
        ))}
      </div>
    </main>
  );
}
