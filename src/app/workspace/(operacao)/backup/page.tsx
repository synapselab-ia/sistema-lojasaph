import { redirect } from "next/navigation";
import { EmptyState, PageHeader, Panel, SemanticTone, StatusBadge } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseProtectionQuery } from "@/modules/protection/adapters/supabase-protection-query";
import {
  buildProtectionOverview,
  PROTECTION_RETENTION_DAYS,
  PROTECTION_RPO_HOURS,
  ProtectionHealth,
  ProtectionRun,
} from "@/modules/protection/application/protection-summary";

const healthTones: Record<ProtectionHealth, SemanticTone> = {
  healthy: "success",
  attention: "attention",
  critical: "danger",
};

const healthLabels: Record<ProtectionHealth, string> = {
  healthy: "Dentro da política",
  attention: "Atenção",
  critical: "Crítico",
};

function formatDateTime(value: string | null, timeZone: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

function formatSize(value: number | null): string {
  if (value === null) return "—";
  if (value < 1000) return `${value} B`;
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)} kB`;
  return `${(value / 1_000_000).toFixed(1)} MB`;
}

function statusLabel(run: ProtectionRun): string {
  if (run.status === "succeeded") return "Concluído";
  if (run.status === "running") return "Em andamento";
  return "Falhou";
}

function typeLabel(run: ProtectionRun): string {
  if (run.protectionType === "automatic_database") return "Backup PostgreSQL";
  if (run.protectionType === "automatic_storage") return "Backup de anexos";
  if (run.protectionType === "restore_drill") return "Teste de restauração";
  return "Exportação manual";
}

function logicalDestination(run: ProtectionRun | null): string {
  if (!run) return "—";
  if (run.protectionType === "restore_drill") return "Ambiente isolado de verificação";
  if (run.coverage === "postgres") return "Cópia externa protegida";
  if (run.coverage === "storage") return "Armazenamento externo protegido";
  return "Cópia sob custódia da organização";
}

function integrityLabel(run: ProtectionRun | null): string {
  if (!run) return "Sem evidência";
  if (run.status === "running") return "Aguardando conclusão";
  return run.integrityVerified ? "Verificada" : "Não comprovada";
}

export default async function DataProtectionPage() {
  const context = await resolveMembershipContext();
  if (!context.authenticated) {
    redirect("/login?next=/workspace/backup&error=Sessão+expirada.+Entre+novamente.");
  }
  if (context.organizations.length === 0) redirect("/sem-acesso");
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");

  const organization = context.selectedOrganization;
  const supabase = await createServerSupabaseClient();
  const query = new SupabaseProtectionQuery(supabase);
  const snapshot = await query.load(organization.id as EntityId);
  const overview = buildProtectionOverview(snapshot.runs);
  const latestRun = overview.latestDatabaseRun;
  const validRun = overview.latestValidDatabaseRun;
  const restoreDrill = overview.latestRestoreDrill;
  const healthTone = healthTones[overview.health];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Proteção dos dados"
        title="Estado da proteção"
        description={(
          <p>
            Visão somente leitura da evidência registrada pela automação para {organization.name}. O status abaixo vem da fonte autoritativa protegida por RLS, não do horário do agendamento.
          </p>
        )}
      />

      <Panel tone={healthTone} aria-live="polite">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">Proteção PostgreSQL</p>
            <h2 className="mt-1 text-xl font-semibold">{overview.headline}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 opacity-80">{overview.detail}</p>
          </div>
          <StatusBadge tone={healthTone}>{healthLabels[overview.health]}</StatusBadge>
        </div>
      </Panel>

      {!latestRun && (
        <EmptyState
          title="Histórico ainda vazio"
          description="Ainda não existe uma execução autoritativa registrada para esta organização. O histórico começa com a automação integrada; backups anteriores não são inseridos manualmente apenas para preencher esta tela."
        />
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel as="article">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Última execução PostgreSQL</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">{latestRun ? statusLabel(latestRun) : "Sem execução"}</p>
          <p className="mt-1 text-sm text-neutral-600">Início: {formatDateTime(latestRun?.startedAt ?? null, snapshot.timeZone)}</p>
          <p className="mt-1 text-sm text-neutral-600">Fim: {formatDateTime(latestRun?.finishedAt ?? null, snapshot.timeZone)}</p>
        </Panel>

        <Panel as="article">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Última cópia válida</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">{formatDateTime(validRun?.validCopyAt ?? null, snapshot.timeZone)}</p>
          <p className="mt-1 text-sm text-neutral-600">Integridade: {integrityLabel(validRun)}</p>
          <p className="mt-1 text-sm text-neutral-600">Tamanho: {formatSize(validRun?.sizeBytes ?? null)}</p>
        </Panel>

        <Panel as="article">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Janela do RPO</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">{PROTECTION_RPO_HOURS} horas</p>
          <p className="mt-1 text-sm text-neutral-600">Prazo da cópia atual: {formatDateTime(overview.rpoDeadline, snapshot.timeZone)}</p>
          <p className="mt-1 text-sm text-neutral-600">Atraso não bloqueia automaticamente a operação do sistema.</p>
        </Panel>

        <Panel as="article">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Destino lógico</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">{logicalDestination(latestRun)}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Detalhes físicos e credenciais do armazenamento não são expostos nesta interface.</p>
        </Panel>

        <Panel as="article">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Retenção</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">{PROTECTION_RETENTION_DAYS} dias</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Política operacional aplicada ao destino externo de recuperação.</p>
        </Panel>

        <Panel as="article">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Teste de restauração</p>
          <p className="mt-2 text-lg font-semibold text-neutral-950">{restoreDrill ? statusLabel(restoreDrill) : "Sem registro autoritativo"}</p>
          <p className="mt-1 text-sm text-neutral-600">Última execução: {formatDateTime(restoreDrill?.startedAt ?? null, snapshot.timeZone)}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">Política: teste mensal em ambiente isolado, nunca sobre Production.</p>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel as="article" tone="success">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Cobertura atual</p>
          <h2 className="mt-1 text-lg font-semibold text-emerald-950">PostgreSQL</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            A trilha automática cobre o backup lógico do banco e registra sua evidência operacional nesta fonte autoritativa.
          </p>
        </Panel>
        <Panel as="article" tone="attention">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Cobertura pendente</p>
          <h2 className="mt-1 text-lg font-semibold text-amber-950">Anexos e Supabase Storage</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Os arquivos binários de anexos ainda não fazem parte desta proteção. Por isso, esta tela não declara backup completo da plataforma.
          </p>
        </Panel>
      </section>

      <Panel padding="none" className="overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="font-semibold text-neutral-950">Histórico recente</h2>
          <p className="mt-1 text-sm text-neutral-600">Somente execuções visíveis para a organização atual pela RLS.</p>
        </div>

        {overview.recentRuns.length === 0 ? (
          <p className="px-5 py-8 text-sm text-neutral-600">Nenhuma execução autoritativa registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Início</th>
                  <th className="px-5 py-3 font-semibold">Cópia válida</th>
                  <th className="px-5 py-3 font-semibold">Integridade</th>
                  <th className="px-5 py-3 font-semibold">Tamanho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {overview.recentRuns.slice(0, 10).map((run) => (
                  <tr key={run.id}>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-neutral-950">{typeLabel(run)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-neutral-700">{statusLabel(run)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-neutral-700">{formatDateTime(run.startedAt, snapshot.timeZone)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-neutral-700">{formatDateTime(run.validCopyAt, snapshot.timeZone)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-neutral-700">{integrityLabel(run)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-neutral-700">{formatSize(run.sizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
