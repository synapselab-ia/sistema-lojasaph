"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#171717" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: "520px", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Falha inesperada
            </p>
            <h1 style={{ fontSize: "28px", margin: "12px 0" }}>O sistema encontrou um erro.</h1>
            <p style={{ lineHeight: 1.6 }}>
              Tente novamente. Se o problema persistir, informe a referência abaixo ao suporte.
            </p>
            {error.digest ? (
              <p>
                <code style={{ fontSize: "12px" }}>Referência: {error.digest}</code>
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => reset()}
              style={{
                marginTop: "16px",
                border: 0,
                borderRadius: "8px",
                padding: "10px 16px",
                background: "#171717",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
