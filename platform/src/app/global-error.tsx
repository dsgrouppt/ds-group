"use client";

/**
 * Só é ativado se o erro ocorrer no próprio root layout (fora do alcance
 * de src/app/error.tsx). Como substitui o layout raiz, tem de incluir
 * <html>/<body> — é o único ficheiro da app com esta obrigação.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-PT">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: 16 }}>A aplicação encontrou um erro.</h1>
            <p style={{ color: "#555", marginBottom: 24, lineHeight: 1.6 }}>
              Ocorreu um erro grave ao carregar a plataforma. Tente recarregar a página.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "#000",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "10px 20px",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
