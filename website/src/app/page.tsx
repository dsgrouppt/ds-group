import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { DataStrip } from "@/components/sections/DataStrip";
import { Services } from "@/components/sections/Services";
import { Manifesto } from "@/components/sections/Manifesto";
import { Method } from "@/components/sections/Method";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { VideoTestimonials } from "@/components/sections/VideoTestimonials";
import { Timeline } from "@/components/sections/Timeline";
import { Team } from "@/components/sections/Team";
import { Guarantees } from "@/components/sections/Guarantees";
import { FaqPreview } from "@/components/sections/FaqPreview";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Reveal } from "@/components/ui/Reveal";
import { LinkArrow } from "@/components/ui/LinkArrow";
import { getProjectsByCategory } from "@/lib/site-data";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "DS Projects — Gestão de Projeto. Sem Surpresas.",
  description:
    "Remodelações completas geridas do primeiro esboço à última chave. Residencial, premium, cozinhas, casas de banho, moradias e espaços comerciais.",
  path: "/",
});

export default function HomePage() {
  const teaserProjects = getProjectsByCategory(undefined, 4);

  return (
    <>
      <Hero />
      <DataStrip />
      <Services />
      <Manifesto />
      <Method />

      <section className="py-36 bg-white">
        <div className="container">
          <div className="flex justify-between items-end gap-8 flex-wrap mb-16">
            <Reveal>
              <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight tracking-tight max-w-[16ch]">
                O tipo de projeto que gerimos.
              </h2>
            </Reveal>
            <LinkArrow href="/portfolio">Ver portefólio completo</LinkArrow>
          </div>
          <ProjectsGrid items={teaserProjects} />
        </div>
      </section>

      <VideoTestimonials />
      <Timeline />
      <Team />
      <FaqPreview />
      <Guarantees />
      <FinalCTA />
    </>
  );
}
