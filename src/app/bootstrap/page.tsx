import Link from "next/link";
import { FeedbackMessage, Panel, SubmitButton } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import {
  bootstrapOwnerAction,
  getBootstrapStatus,
  inviteBootstrapOwnerAction,
} from "@/lib/auth/bootstrap";

interface BootstrapPageProps {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BootstrapPage({ searchParams }: BootstrapPageProps) {
  const status = await getBootstrapStatus();
  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);
  const canCreateMembership = status.eligible && status.invitationState !== "closed";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-8 sm:px-5 sm:py-10">
      <Panel className="w-full sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Inicialização administrativa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Configurar acesso inicial</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Esta rotina é usada somente para habilitar o primeiro acesso administrativo. O endereço autorizado é definido previamente na configuração protegida e não pode ser trocado por esta tela.
        </p>

        {error && <FeedbackMessage tone="danger" className="mt-5" role="alert">{error}</FeedbackMessage>}
        {message && <FeedbackMessage tone="success" className="mt-5" role="status">{message}</FeedbackMessage>}

        {!status.configured && (
          <FeedbackMessage className="mt-5">
            A configuração inicial não está habilitada neste ambiente.
          </FeedbackMessage>
        )}

        {status.configured && status.invitationState === "configuration_required" && (
          <FeedbackMessage tone="attention" className="mt-5">
            O convite permanece bloqueado até as configurações de endereço público e entrega de e-mail estarem prontas.
          </FeedbackMessage>
        )}

        {status.configured && status.invitationState === "ready" && !status.authenticated && (
          <FeedbackMessage tone="success" className="mt-5">
            Ainda não existe uma conta administrativa autorizada. O ambiente está pronto para enviar um único convite ao endereço previamente configurado.
          </FeedbackMessage>
        )}

        {status.configured && status.invitationState === "pending" && (
          <FeedbackMessage tone="info" className="mt-5">
            O endereço autorizado já possui um convite pendente. O sistema não reenvia automaticamente para evitar duplicidade.
          </FeedbackMessage>
        )}

        {status.configured && status.invitationState === "confirmed" && !status.authenticated && (
          <FeedbackMessage tone="info" className="mt-5">
            A conta autorizada já existe. Entre com essa conta para concluir o acesso inicial; se necessário, use a recuperação de senha.
          </FeedbackMessage>
        )}

        {status.configured && status.invitationState === "closed" && (
          <FeedbackMessage tone="success" className="mt-5">
            A inicialização está encerrada porque a organização já possui acesso administrativo inicial ativo.
          </FeedbackMessage>
        )}

        {status.configured && status.invitationState === "unavailable" && (
          <FeedbackMessage tone="danger" className="mt-5" role="alert">
            Não foi possível confirmar com segurança o estado da configuração inicial. Nenhum convite será oferecido até a configuração ser corrigida.
          </FeedbackMessage>
        )}

        {status.authenticated && !status.eligible && (
          <FeedbackMessage tone="danger" className="mt-5" role="alert">
            A conta atual não corresponde ao endereço autorizado para a configuração inicial.
          </FeedbackMessage>
        )}

        {canCreateMembership && (
          <FeedbackMessage tone="info" className="mt-5">
            A conta autorizada está autenticada. A etapa abaixo conclui o acesso administrativo inicial e registra a operação para auditoria.
          </FeedbackMessage>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {status.invitationState === "ready" && !status.authenticated && (
            <form action={inviteBootstrapOwnerAction} className="w-full sm:w-auto">
              <SubmitButton variant="primary" pendingLabel="Enviando convite..." className="w-full sm:w-auto">
                Enviar convite inicial
              </SubmitButton>
            </form>
          )}
          {canCreateMembership && (
            <form action={bootstrapOwnerAction} className="w-full sm:w-auto">
              <SubmitButton variant="primary" pendingLabel="Concluindo acesso..." className="w-full sm:w-auto">
                Concluir acesso inicial
              </SubmitButton>
            </form>
          )}
          {!status.authenticated && status.configured && status.invitationState !== "configuration_required" && status.invitationState !== "unavailable" && (
            <Link href="/login?next=/bootstrap" className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}>
              Entrar
            </Link>
          )}
          <Link href="/" className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}>
            Voltar
          </Link>
        </div>
      </Panel>
    </main>
  );
}
