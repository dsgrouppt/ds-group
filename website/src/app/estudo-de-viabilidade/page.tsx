import type { Metadata } from "next";
import { ViabilityWizard } from "@/components/forms/ViabilityWizard";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-data";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = buildMetadata({
  title: "Estudo de Viabilidade",
  description:
    "Peça o seu Estudo de Viabilidade — o primeiro passo antes de qualquer obra com a DS Projects. Sem compromisso, sem pressão, com resposta em um dia útil.",
  path: "/estudo-de-viabilidade",
});

const trustPoints = [
  "Resposta em, tipicamente, um dia útil",
  "Sem compromisso e sem custo nesta fase",
  "Analisado por um gestor de projeto sénior",
];

export default function ViabilityPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Estudo de Viabilidade", url: `${siteConfig.url}/estudo-de-viabilidade` },
  ]);

  return (
    <>
      <JsonLd schemas={[breadcrumb]} />

      <section className="hero inner">
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            PRIMEIRO PASSO
          </div>
          <h1>Estudo de Viabilidade</h1>
          <p className="hero-sub">
            Seis passos curtos para percebermos o seu espaço, o seu prazo e os seus objetivos — antes
            de qualquer visita técnica ou proposta.
          </p>
        </div>
      </section>

      <section className="py-28 bg-paper">
        <div className="container">
          <Reveal className="flex flex-wrap justify-center gap-x-12 gap-y-4 mb-20 text-center">
            {trustPoints.map((point) => (
              <span key={point} className="flex items-center gap-3 text-[.85rem] text-graphite font-light">
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                {point}
              </span>
            ))}
          </Reveal>

          <Reveal index={1} className="wizard-shell">
            <ViabilityWizard />
          </Reveal>
        </div>
      </section>
    </>
  );
}
