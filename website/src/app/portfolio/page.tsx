import type { Metadata } from "next";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { PortfolioGrid } from "@/components/sections/PortfolioGrid";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { projects, siteConfig } from "@/lib/site-data";
import { getPublishedCaseStudies } from "@/lib/portfolio";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = buildMetadata({
  title: "Portefólio",
  description:
    "Portefólio completo de projetos geridos pela DS Projects: remodelações residenciais, premium, cozinhas, casas de banho, moradias e espaços comerciais.",
  path: "/portfolio",
});

interface PortfolioPageProps {
  searchParams: { categoria?: string };
}

export default function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const caseStudies = getPublishedCaseStudies();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Portefólio", url: `${siteConfig.url}/portfolio` },
  ]);

  return (
    <>
      <JsonLd schemas={[breadcrumb]} />
      <section className="hero inner">
        <div className="hero-media">
          <PlaceholderMedia
            variant="dark"
            className="absolute inset-0"
            priority
          />
        </div>
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            PORTEFÓLIO
          </div>
          <h1>Cada projeto, do primeiro esboço à última chave.</h1>
        </div>
      </section>

      <section className="pt-24 pb-36 bg-white">
        <div className="container">
          <PortfolioGrid
            caseStudies={caseStudies}
            fallbackProjects={projects}
            showFilters
            dense
            minCards={12}
            initialCategory={searchParams.categoria ?? "all"}
            paginate
            pageSize={12}
          />
        </div>
      </section>

      <FinalCTA
        heading="Não encontrou o que procurava?"
        subtext="Cada projeto é desenhado à medida. Fale connosco sobre o seu."
        showContactLinks={false}
      />
    </>
  );
}
