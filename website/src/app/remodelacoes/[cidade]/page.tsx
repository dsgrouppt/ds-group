import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { localAreas, getLocalAreaBySlug } from "@/lib/local-seo-data";
import { services, siteConfig, getProjectsByCategory } from "@/lib/site-data";
import { buildMetadata, breadcrumbJsonLd, serviceJsonLd } from "@/lib/seo";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { FinalCTA } from "@/components/sections/FinalCTA";

interface LocalPageProps {
  params: { cidade: string };
}

export function generateStaticParams() {
  return localAreas.map((area) => ({ cidade: area.slug }));
}

export function generateMetadata({ params }: LocalPageProps): Metadata {
  const area = getLocalAreaBySlug(params.cidade);
  if (!area) return {};

  return buildMetadata({
    title: `Remodelações em ${area.name}`,
    description: area.intro,
    path: `/remodelacoes/${area.slug}`,
  });
}

export default function LocalAreaPage({ params }: LocalPageProps) {
  const area = getLocalAreaBySlug(params.cidade);
  if (!area) notFound();

  const jsonLd = serviceJsonLd({
    name: `Remodelação e Gestão de Projeto em ${area.name}`,
    description: area.intro,
    url: `${siteConfig.url}/remodelacoes/${area.slug}`,
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Áreas de Atuação", url: `${siteConfig.url}/remodelacoes/${area.slug}` },
    { name: area.name, url: `${siteConfig.url}/remodelacoes/${area.slug}` },
  ]);

  const localProjects = getProjectsByCategory(undefined, 30).filter(
    (p) => p.location.toLowerCase() === area.name.toLowerCase()
  );

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="hero inner">
        <div className="hero-media">
          <PlaceholderMedia
            variant="dark"
            label="Fotografia real DS Projects"
            caption={`Projeto em ${area.name}`}
            className="absolute inset-0"
            priority
          />
        </div>
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            {area.region.toUpperCase()}
          </div>
          <h1>Remodelações em {area.name}</h1>
          <p className="hero-sub">{area.intro}</p>
        </div>
      </section>

      <section className="py-36 bg-white">
        <div className="container grid grid-cols-1 lg:grid-cols-2 gap-[6vw] items-start">
          <Reveal>
            <div className="eyebrow">Contexto local</div>
            <h2 className="font-display font-normal text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.25] mb-6">
              O que muda em {area.name}
            </h2>
            {area.context.map((paragraph) => (
              <p key={paragraph} className="text-graphite font-light leading-[1.85] text-[1.02rem] max-w-[52ch] mb-5">
                {paragraph}
              </p>
            ))}
            <p className="text-graphite font-light leading-[1.85] text-[1.02rem] max-w-[52ch] mb-5 italic">
              {area.profileNote}
            </p>
            <a href="/#contacto" className="btn btn-dark mt-6 inline-flex">
              Pedir Estudo de Viabilidade
            </a>
          </Reveal>

          <Reveal index={1} className="relative aspect-[4/5]">
            <PlaceholderMedia
              variant="light"
              caption={`${area.name} — projeto concluído`}
              className="absolute inset-0"
            />
          </Reveal>
        </div>
      </section>

      {localProjects.length > 0 && (
        <section className="py-36 pt-0 bg-white">
          <div className="container">
            <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight max-w-[16ch] mb-16">
              Projetos em {area.name}.
            </h2>
            <ProjectsGrid items={localProjects} />
          </div>
        </section>
      )}

      <section className="py-24 pb-36 bg-paper">
        <div className="container">
          <h3 className="font-display font-normal text-[1.6rem] mb-10">
            Serviços disponíveis em {area.name}
          </h3>
          <div className="services-grid">
            {services.map((s, i) => (
              <Reveal key={s.slug} index={i} delayStep={0.05}>
                <Link href={`/servicos/${s.slug}`} className="service-card block h-full">
                  <div className="service-num font-display text-[var(--gold-text)] text-[.95rem]">{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.subtitle}</p>
                  <span className="link-arrow">
                    <span className="bar" /> Saber mais
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-t border-black/[.06]">
        <div className="container">
          <h3 className="font-display font-normal text-[1.1rem] mb-6 text-graphite/70">
            Outras áreas de atuação
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {localAreas
              .filter((a) => a.slug !== area.slug)
              .map((a) => (
                <Link key={a.slug} href={`/remodelacoes/${a.slug}`} className="link-arrow">
                  <span className="bar" /> {a.name}
                </Link>
              ))}
          </div>
        </div>
      </section>

      <FinalCTA
        heading={`Vamos falar sobre o seu projeto em ${area.name}.`}
        subtext="Sem compromisso. Sem pressão. Só um plano claro para o seu espaço."
      />
    </>
  );
}
