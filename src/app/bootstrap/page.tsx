import Link from "next/link";
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
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Inicialização administrativa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Configurar acesso inicial</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Esta rotina é usada somente para habilitar o primeiro acesso administrativo. O endereço autorizado é definido previamente na configuração protegida e não pode ser trocado por esta tela.
        </p>

        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {message && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>}

        {!status.configured && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            A configuração inicial não está habilitada neste ambiente.
          </p>
        )}

        {status.configured && status.invitationState === "configuration_required" && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            O convite permanece bloqueado até as configurações de endereço público e entrega de e-mail estarem prontas.
          </p>
        )}

        {status.configured && status.invitationState === "ready" && !status.authenticated && (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Ainda não existe uma conta administrativa autorizada. O ambiente está pronto para enviar um único convite ao endereço previamente configurado.
          </p>
        )}

        {status.configured && status.invitationState === "pending" && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            O endereço autorizado já possui um convite pendente. O sistema não reenvia automaticamente para evitar duplicidade.
          </p>
        )}

        {status.configured && status.invitationState === "confirmed" && !status.authenticated && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            A conta autorizada já existe. Entre com essa conta para concluir o acesso inicial; se necessário, use a recuperação de senha.
          </p>
        )}

        {status.configured && status.invitationState === "closed" && (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            A inicialização está encerrada porque a organização já possui acesso administrativo inicial ativo.
          </p>
        )}

        {status.configured && status.invitationState === "unavailable" && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Não foi possível confirmar com segurança o estado da configuração inicial. Nenhum convite será oferecido até a configuração ser corrigida.
          </p>
        )}

        {status.authenticated && !status.eligible && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            A conta atual não corresponde ao endereço autorizado para a configuração inicial.
          </p>
        )}

        {canCreateMembership && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            A conta autorizada está autenticada. A etapa abaixo conclui o acesso administrativo inicial e registra a operação para auditoria.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {status.invitationState === "ready" && !status.authenticated && (
            <form action={inviteBootstrapOwnerAction}>
              <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                Enviar convite inicial
              </button>
            </form>
          )}
          {canCreateMembership && (
            <form action={bootstrapOwnerAction}>
              <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                Concluir acesso inicial
              </button>
            </form>
          )}
          {!status.authenticated && status.configured && status.invitationState !== "configuration_required" && status.invitationState !== "unavailable" && (
            <Link href="/login?next=/bootstrap" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">
              Entrar
            </Link>
          )}
          <Link href="/" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">Voltar</Link>
        </div>
      </section>
    </main>
  );
}
