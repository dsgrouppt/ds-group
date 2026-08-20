import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DS Projects — Gestão de Projeto. Uma empresa DS Group.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
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

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
          <span style={{ fontSize: 56, lineHeight: 1.15 }}>
            A gestão do seu projeto.
          </span>
          <span style={{ fontSize: 56, lineHeight: 1.15, fontStyle: "italic", color: "#eeeeec", fontWeight: 300 }}>
            Do primeiro esboço à última chave.
          </span>
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
    ),
    { ...size }
  );
}
