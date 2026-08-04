import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: "DS OS — Plataforma DS Group",
  description: "Plataforma interna de gestão da DS Group: CRM, Obras, Clientes, Financeiro, Agenda, RH e Marketing.",
  robots: { index: false, follow: false }, // ferramenta interna — nunca indexar
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Saltar para o conteúdo principal
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
