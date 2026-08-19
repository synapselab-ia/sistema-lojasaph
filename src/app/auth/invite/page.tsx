"use client";

import { useEffect, useState } from "react";
import { parseImplicitInviteFragment } from "@/lib/auth/implicit-invite";

export default function InviteAuthPage() {
  const [error, setError] = useState<string>();

  useEffect(() => {
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
          window.location.replace("/auth/atualizar-senha?next=%2Fbootstrap");
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
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500">Segurança</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Validando convite</h1>
        {error ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            A identidade está sendo validada. Nenhuma senha é definida nesta etapa.
          </p>
        )}
      </section>
    </main>
  );
}
