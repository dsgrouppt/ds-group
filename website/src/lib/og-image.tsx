/**
 * Elemento partilhado para todas as imagens Open Graph dinâmicas do site
 * (serviços, estudos de caso, artigos de blog) — mesma linguagem visual da
 * imagem OG genérica em `app/opengraph-image.tsx`, mas com o eyebrow/título
 * da página em causa, para que cada partilha em redes sociais mostre o
 * título certo em vez de sempre o mesmo cartão genérico.
 */
export function OgImageLayout({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0a0a",
        padding: "80px",
        color: "#ffffff",
        fontFamily: "serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 34, fontWeight: 700 }}>DS</span>
        <span
          style={{
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#eeeeec",
            fontFamily: "sans-serif",
            fontWeight: 300,
          }}
        >
          Projects
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
        <span
          style={{
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#d4af37",
            fontFamily: "sans-serif",
            fontWeight: 400,
            marginBottom: 22,
          }}
        >
          {eyebrow}
        </span>
        <span style={{ fontSize: 50, lineHeight: 1.2 }}>{title}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontFamily: "sans-serif",
          fontSize: 20,
            color: "#d4af37",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        <div style={{ width: 40, height: 1, background: "#d4af37" }} />
        Uma empresa DS Group
      </div>
    </div>
  );
}

export const OG_SIZE = { width: 1200, height: 630 };
