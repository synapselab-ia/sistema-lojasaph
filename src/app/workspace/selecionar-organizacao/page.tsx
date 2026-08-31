import { redirect } from "next/navigation";
import { FeedbackMessage, PageHeader, Panel, SubmitButton } from "@/components/ui";
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
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-5 sm:py-16">
      <PageHeader
        eyebrow="Organização"
        title="Selecione onde deseja trabalhar"
        description="Sua escolha define a organização usada na operação atual. O sistema continua respeitando os acessos já configurados e você poderá trocar de organização depois."
      />

      {error && <FeedbackMessage tone="danger" className="mt-6" role="alert">{error}</FeedbackMessage>}

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {context.organizations.map((organization) => (
          <form key={organization.id} action={selectOrganizationAction} className="h-full">
            <Panel as="article" className="flex h-full flex-col">
              <input type="hidden" name="organizationId" value={organization.id} />
              <h2 className="font-semibold">{organization.name}</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-600">Acesso disponível para esta organização.</p>
              <SubmitButton variant="primary" block pendingLabel="Selecionando..." className="mt-5">
                Usar esta organização
              </SubmitButton>
            </Panel>
          </form>
        ))}
      </div>
    </main>
  );
}
