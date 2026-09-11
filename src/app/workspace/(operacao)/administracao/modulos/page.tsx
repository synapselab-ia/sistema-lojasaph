import { redirect } from "next/navigation";
import { Button, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { asEntityId } from "@/domain/common/entity-id";
import { setOrganizationCapabilityAction } from "@/lib/composition/actions";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadResolvedOrganizationCapabilities } from "@/modules/composition/adapters/supabase-capability-settings";
import { capabilityIds, getCapabilityDefinition } from "@/modules/composition/domain/capability";

interface ModulesPageProps {
  searchParams: Promise<{ error?: string | string[]; message?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdministrationModulesPage({ searchParams }: ModulesPageProps) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect("/login?next=/workspace/administracao/modulos");
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");

  const organization = context.selectedOrganization;
  if (!organization.organizationWideRoles.includes("owner")) redirect("/workspace");

  const organizationId = asEntityId(organization.id);
  const client = await createServerSupabaseClient();
  const states = await loadResolvedOrganizationCapabilities(client, organizationId);
  const inventory = states.find((state) => state.definition.id === capabilityIds.inventory);
  const stockLoans = states.find((state) => state.definition.id === capabilityIds.stockLoans);
  if (!inventory || !stockLoans) throw new Error("Registry de capabilities incompleto.");

  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);
  const stockLoansDefinition = getCapabilityDefinition(capabilityIds.stockLoans);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Administração · Composição"
        title="Montar sistema"
        description="Ative somente as peças que fazem sentido para esta organização. Desativar uma peça interrompe novas operações daquela capability, mas não apaga dados nem histórico."
      />

      {error && <FeedbackMessage tone="danger">{error}</FeedbackMessage>}
      {message && <FeedbackMessage tone="success">{message}</FeedbackMessage>}

      <FeedbackMessage tone="info">
        Esta é a primeira etapa do compositor modular. A base de segurança, contexto da organização e auditoria é obrigatória. Outros módulos serão liberados para configuração somente depois de seus boundaries e dependências serem validados.
      </FeedbackMessage>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Biblioteca inicial de módulos">
        <Panel as="article" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Base operacional</p>
              <h2 className="mt-1 text-xl font-semibold">{inventory.definition.name}</h2>
            </div>
            <StatusBadge tone="neutral">Base necessária</StatusBadge>
          </div>
          <p className="text-sm leading-6 text-neutral-600">{inventory.definition.description}</p>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
            <p className="font-semibold">Estado: ativo nesta etapa</p>
            <p className="mt-1 leading-6">Empréstimos dependem de Estoque. O desligamento de Estoque só será liberado quando todas as capabilities dependentes puderem ser resolvidas sem estado incoerente.</p>
          </div>
        </Panel>

        <Panel as="article" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Estoque · Capability configurável</p>
              <h2 className="mt-1 text-xl font-semibold">{stockLoansDefinition.name}</h2>
            </div>
            <StatusBadge tone={stockLoans.enabled ? "success" : "neutral"}>
              {stockLoans.enabled ? "Ativo" : "Desativado"}
            </StatusBadge>
          </div>

          <p className="text-sm leading-6 text-neutral-600">{stockLoansDefinition.description}</p>
          <dl className="grid gap-3 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-neutral-500">Requer</dt>
              <dd className="mt-1 font-semibold">Estoque ativo</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Ao desativar</dt>
              <dd className="mt-1 font-semibold">Bloqueia novos empréstimos</dd>
            </div>
          </dl>

          <p className="text-sm leading-6 text-neutral-600">
            O histórico permanece no banco. Restituições de empréstimos existentes continuam permitidas para não deixar mercadoria ou valor pendente sem caminho de liquidação. Ao reativar, a navegação e a criação voltam sem reconstruir dados.
          </p>

          <details className="rounded-xl border border-neutral-200 p-4">
            <summary className="cursor-pointer font-semibold">
              {stockLoans.enabled ? "Desativar Empréstimos" : "Ativar Empréstimos"}
            </summary>
            <div className="mt-3 space-y-3 text-sm leading-6 text-neutral-600">
              <p>
                {stockLoans.enabled
                  ? "A opção sairá da navegação e o backend recusará novos empréstimos. Nenhuma tabela, lançamento ou histórico será apagado."
                  : "A opção voltará à navegação e novos empréstimos serão aceitos novamente, preservando todo o histórico anterior."}
              </p>
              <form action={setOrganizationCapabilityAction}>
                <input type="hidden" name="capabilityId" value={capabilityIds.stockLoans} />
                <input type="hidden" name="enabled" value={stockLoans.enabled ? "false" : "true"} />
                <Button type="submit" variant={stockLoans.enabled ? "secondary" : "primary"}>
                  {stockLoans.enabled ? "Confirmar desativação" : "Confirmar ativação"}
                </Button>
              </form>
            </div>
          </details>
        </Panel>
      </section>

      <Panel tone="attention">
        <h2 className="font-semibold">Rollout controlado</h2>
        <p className="mt-1 text-sm leading-6">
          Compras, Financeiro, Caixa, Cadastros e demais áreas continuam ativas e fora dos toggles nesta etapa. Elas só entram no compositor depois do mapeamento de dependências e de gates equivalentes no backend.
        </p>
      </Panel>
    </div>
  );
}
