"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Falha inesperada</p>
      <h1 className="text-2xl font-semibold text-neutral-950">Não foi possível carregar esta área.</h1>
      <p className="text-sm text-neutral-600">
        Tente novamente. Se o problema persistir, informe a referência exibida abaixo ao suporte.
      </p>
      {error.digest ? (
        <code className="rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-700">Referência: {error.digest}</code>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
      >
        Tentar novamente
      </button>
    </main>
  );
}
