"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FeedbackMessage, Panel } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { parseImplicitInviteFragment } from "@/lib/auth/implicit-invite";
import { safeInternalPath } from "@/lib/auth/redirect";

export default function InviteAuthPage() {
  const [error, setError] = useState<string>();

  useEffect(() => {
    const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"), "/bootstrap");
    const parsed = parseImplicitInviteFragment(window.location.hash);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    let cancelled = false;

    if (!parsed.ok) {
      queueMicrotask(() => {
        if (!cancelled) {
          setError("O convite é inválido ou expirou. Solicite uma nova emissão controlada.");
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const tokens = parsed.tokens;

    async function establishSession() {
      try {
        const response = await fetch("/auth/invite/session", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokens),
        });

        if (!response.ok) {
          if (!cancelled) {
            setError("Não foi possível validar o convite autorizado. Reabra o convite ou solicite uma nova emissão.");
          }
          return;
        }

        if (!cancelled) {
          window.location.replace(`/auth/atualizar-senha?next=${encodeURIComponent(next)}`);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível concluir o convite agora. Reabra o convite para tentar novamente.");
        }
      }
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8 sm:px-5 sm:py-10">
      <Panel className="w-full sm:p-8" aria-busy={!error || undefined}>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Segurança</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Validando convite</h1>
        {error ? (
          <>
            <FeedbackMessage tone="danger" className="mt-5" role="alert">
              {error}
            </FeedbackMessage>
            <Link href="/" className={buttonClasses({ variant: "secondary", block: true, className: "mt-5" })}>
              Voltar ao início
            </Link>
          </>
        ) : (
          <FeedbackMessage tone="info" className="mt-5" role="status" aria-live="polite">
            A identidade está sendo validada. Nenhuma senha é definida nesta etapa.
          </FeedbackMessage>
        )}
      </Panel>
    </main>
  );
}
