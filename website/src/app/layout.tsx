import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileContactBar } from "@/components/layout/MobileContactBar";
import { CustomCursor } from "@/components/layout/CustomCursor";
import {
  GoogleTagManagerScript,
  GoogleTagManagerNoscript,
  GoogleAnalyticsScript,
  MetaPixelScript,
  AnalyticsPageView,
} from "@/components/analytics/Analytics";
import { buildMetadata, organizationJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-data";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "DS Projects — Gestão de Projeto. Sem Surpresas.",
    template: "%s — DS Projects",
  },
  ...buildMetadata({
    title: "DS Projects — Gestão de Projeto. Sem Surpresas.",
    description:
      "DS Projects gere remodelações completas do primeiro esboço à última chave — orçamento fechado, prazo contratual e reporte semanal. Uma empresa DS Group.",
  }),
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  verification: {
    // Preencher com o código fornecido pelo Google Search Console
    // (Definições > Propriedade > Verificação > tag HTML) e definir
    // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION em produção. Ver docs/google-setup.md.
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        {/* Preconnect aos domínios de vídeo — os embeds do YouTube/Vimeo (testemunhos,
            estudos de caso) só entram quando houver conteúdo real, mas isto adianta a
            ligação TLS assim que a página carrega, sem custo relevante quando não há
            vídeo nenhum na página. */}
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://player.vimeo.com" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <GoogleTagManagerScript /><GoogleAnalyticsScript /><MetaPixelScript />
      </head>
      <body>
        <GoogleTagManagerNoscript />
        <a href="#main-content" className="skip-link">
          Saltar para o conteúdo principal
        </a>
        <CustomCursor />
        <Header />
        <Suspense fallback={null}>
          <AnalyticsPageView />
        </Suspense>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <MobileContactBar />
      </body>
    </html>
  );
}
