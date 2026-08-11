import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPublishedCaseStudies,
  getCaseStudyBySlug,
  getRelatedCaseStudies,
} from "@/lib/portfolio";
import { getServiceBySlug, siteConfig, filterCategories } from "@/lib/site-data";
import { buildMetadata, breadcrumbJsonLd, caseStudyJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { Gallery } from "@/components/sections/Gallery";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { FinalCTA } from "@/components/sections/FinalCTA";

interface CaseStudyPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return getPublishedCaseStudies().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: CaseStudyPageProps): Metadata {
  const caseStudy = getCaseStudyBySlug(params.slug);
  if (!caseStudy) return {};

  return buildMetadata({
    title: caseStudy.title,
    description: caseStudy.summary,
    path: `/portfolio/${caseStudy.slug}`,
  });
}

const categoryLabel: Record<string, string> = Object.fromEntries(
  filterCategories.map((c) => [c.value, c.label])
);

const narrativeSections: { key: "challenge" | "planning" | "execution" | "solution" | "result"; label: string }[] = [
  { key: "challenge", label: "Desafio" },
  { key: "planning", label: "Planeamento" },
  { key: "execution", label: "Execução" },
  { key: "solution", label: "Solução" },
  { key: "result", label: "Resultado" },
];

export default function CaseStudyPage({ params }: CaseStudyPageProps) {
  const caseStudy = getCaseStudyBySlug(params.slug);
  if (!caseStudy) notFound();

  const related = getRelatedCaseStudies(caseStudy.slug, 3);
  const before = caseStudy.gallery.find((m) => m.phase === "antes");
  const after = caseStudy.gallery.find((m) => m.phase === "depois") ?? caseStudy.cover;
  const galleryAndVideos = [...caseStudy.gallery, ...(caseStudy.videos ?? [])];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Portefólio", url: `${siteConfig.url}/portfolio` },
    { name: caseStudy.title, url: `${siteConfig.url}/portfolio/${caseStudy.slug}` },
  ]);

  const jsonLd = caseStudyJsonLd({
    title: caseStudy.title,
    description: caseStudy.summary,
    url: `${siteConfig.url}/portfolio/${caseStudy.slug}`,
    imageUrls: [caseStudy.cover, ...caseStudy.gallery]
      .map((m) => (m.src ? `${siteConfig.url}${m.src.startsWith("/") ? "" : "/"}${m.src}` : null))
      .filter((v): v is string => Boolean(v)),
    datePublished: caseStudy.publishedAt,
  });

  return (
    <>
      <JsonLd schemas={[breadcrumb, jsonLd]} />

      <section className="hero inner">
        <div className="hero-media">
          <PlaceholderMedia variant="dark" src={caseStudy.cover.src} alt={caseStudy.cover.alt} className="absolute inset-0" priority />
        </div>
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            {categoryLabel[caseStudy.category] ?? caseStudy.category} · {caseStudy.location}
          </div>
          <h1>{caseStudy.title}</h1>
          <p className="hero-sub">{caseStudy.summary}</p>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container grid grid-cols-1 lg:grid-cols-[1.3fr_.7fr] gap-[6vw]">
          <div>
            {narrativeSections.map(
              (section) =>
                caseStudy[section.key] && (
                  <Reveal key={section.key} className="mb-14">
                    <div className="eyebrow">{section.label}</div>
                    <p className="text-graphite font-light leading-[1.85] text-[1.02rem] max-w-[62ch]">
                      {caseStudy[section.key]}
                    </p>
                  </Reveal>
                )
            )}
          </div>

          <Reveal index={1} className="border-t border-black/10 pt-8 h-fit">
            <h3 className="font-display font-normal text-[1.1rem] mb-6">Ficha da Obra</h3>
            <dl className="flex flex-col gap-5 text-[.88rem]">
              <div>
                <dt className="text-[.7rem] uppercase tracking-[.1em] text-graphite-light mb-1">Localização</dt>
                <dd className="text-graphite">{caseStudy.location}</dd>
              </div>
              {caseStudy.duration && (
                <div>
                  <dt className="text-[.7rem] uppercase tracking-[.1em] text-graphite-light mb-1">Duração</dt>
                  <dd className="text-graphite">{caseStudy.duration}</dd>
                </div>
              )}
              {caseStudy.servicesRealized.length > 0 && (
                <div>
                  <dt className="text-[.7rem] uppercase tracking-[.1em] text-graphite-light mb-1">Serviços Realizados</dt>
                  <dd className="flex flex-col gap-1">
                    {caseStudy.servicesRealized.map((slug) => {
                      const service = getServiceBySlug(slug);
                      return service ? (
                        <Link key={slug} href={`/servicos/${slug}`} className="text-graphite underline underline-offset-2">
                          {service.title}
                        </Link>
                      ) : null;
                    })}
                  </dd>
                </div>
              )}
              {caseStudy.materials && caseStudy.materials.length > 0 && (
                <div>
                  <dt className="text-[.7rem] uppercase tracking-[.1em] text-graphite-light mb-1">Materiais</dt>
                  <dd className="text-graphite">{caseStudy.materials.join(", ")}</dd>
                </div>
              )}
            </dl>
          </Reveal>
        </div>
      </section>

      {before && after && (
        <BeforeAfter
          beforeImage={before.src}
          afterImage={after.src}
          projectName={caseStudy.title}
          location={caseStudy.location}
          duration={caseStudy.duration}
        />
      )}

      <section className="py-24 pb-36 bg-paper">
        <div className="container">
          <Reveal className="mb-14">
            <div className="eyebrow">Galeria</div>
            <h2 className="font-display font-normal text-[clamp(1.7rem,3vw,2.4rem)] leading-tight">
              A obra, em detalhe.
            </h2>
          </Reveal>
          <Gallery items={galleryAndVideos} showFilters dense />
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-24 pb-36 bg-white">
          <div className="container">
            <h3 className="font-display font-normal text-[1.6rem] mb-10">Outras obras DS Projects</h3>
            <div className="projects-grid">
              {related.map((r) => (
                <Link key={r.slug} href={`/portfolio/${r.slug}`} className="project-card block">
                  <PlaceholderMedia variant="light" src={r.cover.src} alt={r.cover.alt} className="absolute inset-0" />
                  <div className="project-overlay">
                    <div className="project-tag">{categoryLabel[r.category] ?? r.category}</div>
                    <h3>{r.title}</h3>
                    <span className="text-mist font-light text-[.82rem]">{r.location}</span>
                  </div>
                  <div className="project-arrow">↗</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FinalCTA
        heading="Gostou do que viu? Vamos falar sobre o seu projeto."
        subtext="Sem compromisso. Sem pressão. Só um plano claro para o seu espaço."
      />
    </>
  );
}
