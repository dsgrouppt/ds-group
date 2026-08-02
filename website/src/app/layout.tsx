import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
  icons: {
    icon: "/favicon.svg",
  },
  verification: {
    // Preencher com o código fornecido pelo Google Search Console
    // (Definições > Propriedade > Verificação > tag HTML) e definir
    // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION em produção. Ver docs/google-setup.md.
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
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
        <GoogleTagManagerScript />
        <GoogleAnalyticsScript />
        <MetaPixelScript />
      </body>
    </html>
  );
}
