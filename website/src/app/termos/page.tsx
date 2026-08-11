import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Termos e Condições",
  description: "Termos e condições de utilização do website da DS Projects.",
  path: "/termos",
  noIndex: true,
});

export default function TermsPage() {
  return (
    <>
      <section className="hero inner">
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            LEGAL
          </div>
          <h1>Termos e Condições</h1>
        </div>
      </section>

      <section className="py-32 bg-white">
        <div className="container max-w-[760px]">
          <p className="text-graphite font-light leading-relaxed">
            Este texto é um espaço reservado. Os termos definitivos de utilização deste website
            devem ser redigidos e validados por um advogado antes de publicação, tal como indicado
            para os restantes documentos contratuais da DS Group.
          </p>
        </div>
      </section>
    </>
  );
}
