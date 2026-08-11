import Link from "next/link";
import type { Service } from "@/types";
import { getProjectsByCategory, getRelatedServices } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { ProjectsGrid } from "@/components/sections/ProjectsGrid";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { faqItems } from "@/lib/faq-data";

export function ServiceDetail({ service }: { service: Service }) {
  const related = getRelatedServices(service.slug, 3);
  const projects = getProjectsByCategory(service.category, 2);

  return (
    <>
      <section className="hero inner">
        <div className="hero-media">
          <PlaceholderMedia
            variant="dark"
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

      <section className="py-24 pb-36 bg-white">
        <div className="container max-w-[860px] mx-auto">
          <div className="flex justify-between items-end gap-8 flex-wrap mb-14">
            <h2 className="font-display font-normal text-[clamp(1.7rem,3vw,2.3rem)] leading-tight max-w-[18ch]">
              Perguntas frequentes sobre {service.title.toLowerCase()}.
            </h2>
            <Link href="/faq" className="link-arrow">
              <span className="bar" /> Ver todas as perguntas
            </Link>
          </div>
          <div className="flex flex-col">
            {faqItems
              .filter((f) => f.category === "Processo" || f.category === "Prazos e Orçamento")
              .slice(0, 4)
              .map((item, i) => (
                <Reveal
                  key={item.question}
                  index={i}
                  delayStep={0.06}
                  className="border-b border-black/[.08] py-7 first:pt-0 last:border-b-0"
                >
                  <h3 className="font-display font-normal text-[1.08rem] mb-3">{item.question}</h3>
                  <p className="text-graphite font-light leading-[1.8] text-[.95rem] max-w-[64ch]">
                    {item.answer}
                  </p>
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
