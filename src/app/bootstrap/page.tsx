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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Configurar primeiro owner</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Esta rotina existe apenas para a primeira identidade administrativa. O destinatário do convite é definido exclusivamente no ambiente server-side; esta tela nunca aceita um e-mail arbitrário.
        </p>

        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        {message && <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p>}

        {!status.configured && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            Bootstrap desabilitado. Configure as variáveis server-only somente no ambiente em que a inicialização será executada.
          </p>
        )}

        {status.configured && status.invitationState === "configuration_required" && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            O convite está bloqueado até a URL pública, a allowlist do redirect de convite e a capacidade de entrega de e-mail terem sido conferidas conforme o runbook.
          </p>
        )}

        {status.configured && status.invitationState === "ready" && !status.authenticated && (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            Nenhum owner ou usuário Auth autorizado foi encontrado. O ambiente está pronto para enviar um único convite ao endereço previamente configurado no servidor.
          </p>
        )}

        {status.configured && status.invitationState === "pending" && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            A identidade autorizada já possui um convite pendente. O sistema não reenvia automaticamente para evitar spam ou duplicidade.
          </p>
        )}

        {status.configured && status.invitationState === "confirmed" && !status.authenticated && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            A conta autorizada já existe no Auth. Entre com essa conta para concluir o vínculo owner; se necessário, use a recuperação de senha.
          </p>
        )}

        {status.configured && status.invitationState === "closed" && (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            O bootstrap inicial está encerrado porque a organização já possui owner ativo.
          </p>
        )}

        {status.configured && status.invitationState === "unavailable" && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Não foi possível comprovar com segurança o estado do bootstrap. Nenhum convite será oferecido até a configuração ou o backend ser corrigido.
          </p>
        )}

        {status.authenticated && !status.eligible && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            A conta autenticada não corresponde ao e-mail autorizado para bootstrap.
          </p>
        )}

        {canCreateMembership && (
          <p className="mt-5 rounded-xl bg-neutral-100 px-4 py-3 text-sm">
            A identidade autorizada está autenticada. A etapa abaixo cria somente o membership owner e seu registro de auditoria; a identidade Auth já foi estabelecida separadamente.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {status.invitationState === "ready" && !status.authenticated && (
            <form action={inviteBootstrapOwnerAction}>
              <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                Enviar convite ao owner autorizado
              </button>
            </form>
          )}
          {canCreateMembership && (
            <form action={bootstrapOwnerAction}>
              <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                Criar vínculo owner inicial
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
