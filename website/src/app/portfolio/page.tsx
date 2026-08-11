import type { Metadata } from "next";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { projects } from "@/lib/site-data";
import { buildMetadata } from "@/lib/seo";

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
  return (
    <>
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
          <ProjectsGrid items={projects} showFilters dense initialCategory={searchParams.categoria ?? "all"} />
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
