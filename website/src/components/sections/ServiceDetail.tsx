import Link from "next/link";
import type { Service } from "@/types";
import { getProjectsByCategory, getRelatedServices } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { FinalCTA } from "@/components/sections/FinalCTA";

export function ServiceDetail({ service }: { service: Service }) {
  const related = getRelatedServices(service.slug, 3);
  const projects = getProjectsByCategory(service.category, 2);

  return (
    <>
      <section className="hero inner">
        <div className="hero-media">
          <PlaceholderMedia
            variant="dark"
            label="Fotografia real DS Projects"
            caption={`${service.title} — imagem de capa`}
            className="absolute inset-0"
            priority
          />
        </div>
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            SERVIÇOS · {service.num}
          </div>
          <h1>{service.title}</h1>
          <p className="hero-sub">{service.subtitle}</p>
        </div>
      </section>

      <section className="py-36 bg-white">
        <div className="container grid grid-cols-1 lg:grid-cols-2 gap-[6vw] items-start">
          <Reveal>
            <div className="eyebrow">O que fazemos</div>
            <h2 className="font-display font-normal text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.25] mb-6">
              {service.title}
            </h2>
            {service.description.map((paragraph) => (
              <p key={paragraph} className="text-graphite font-light leading-[1.85] text-[1.02rem] max-w-[52ch] mb-5">
                {paragraph}
              </p>
            ))}
            <div className="service-includes">
              {service.includes.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
            <a href="#contacto" className="btn btn-dark mt-10 inline-flex">
              Pedir Estudo de Viabilidade
            </a>
          </Reveal>

          <Reveal index={1} className="relative aspect-[4/5]">
            <PlaceholderMedia
              variant="light"
              caption={`${service.title} — projeto concluído`}
              className="absolute inset-0"
            />
          </Reveal>
        </div>
      </section>

      <section className="py-36 pt-0 bg-white">
        <div className="container">
          <div className="flex justify-between items-end gap-8 flex-wrap mb-16">
            <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight max-w-[16ch]">
              Projetos de {service.title}.
            </h2>
            <Link href={`/portfolio?categoria=${service.category}`} className="link-arrow">
              <span className="bar" /> Ver no portefólio completo
            </Link>
          </div>
          <ProjectsGrid items={projects} />
        </div>
      </section>

      <section className="related-services py-24 pb-36 bg-paper">
        <div className="container">
          <h3 className="font-display font-normal text-[1.6rem] mb-10">Outros serviços DS Projects</h3>
          <div className="services-grid">
            {related.map((s, i) => (
              <Reveal key={s.slug} index={i} delayStep={0.07}>
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

      <FinalCTA
        heading={`Vamos falar sobre o seu projeto de ${service.title.toLowerCase()}.`}
        subtext="Sem compromisso. Sem pressão. Só um plano claro para o seu espaço."
      />
    </>
  );
}
