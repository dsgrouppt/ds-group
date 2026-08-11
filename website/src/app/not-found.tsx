import type { Metadata } from "next";
import Link from "next/link";
import { services, siteConfig } from "@/lib/site-data";
import { buildMetadata } from "@/lib/seo";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";

/**
 * Página 404 dedicada — sem isto, o Next.js mostra o ecrã de erro genérico
 * por omissão, que quebra imediatamente a experiência premium do resto do
 * site em qualquer link partido ou URL mal escrito. `noIndex: true` porque
 * uma página de erro nunca deve ser indexada.
 */
export const metadata: Metadata = buildMetadata({
  title: "Página não encontrada",
  description: "Esta página não existe ou foi movida.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <>
      <section className="hero inner">
        <div className="hero-media">
          <PlaceholderMedia variant="dark" className="absolute inset-0" priority />
        </div>
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            ERRO 404
          </div>
          <h1>Esta página não existe — ou já não está aqui.</h1>
          <p className="hero-sub">
            O link pode estar desatualizado, ou o endereço foi escrito de forma diferente. O que
            procura está provavelmente numa destas páginas.
          </p>
        </div>
      </section>

      <section className="py-36 bg-white">
        <div className="container">
          <div className="flex flex-wrap gap-6 items-center mb-20">
            <Link href="/" className="btn btn-dark">
              Voltar ao Início
            </Link>
            <Link href="/portfolio" className="btn btn-light">
              Ver Portefólio
            </Link>
            <a href={`tel:${siteConfig.phone}`} className="link-arrow text-black">
              <span className="bar" /> Prefere falar connosco? {siteConfig.phoneDisplay}
            </a>
          </div>

          <div className="eyebrow mb-8">Serviços</div>
          <div className="services-grid">
            {services.map((s) => (
              <Link key={s.slug} href={`/servicos/${s.slug}`} className="service-card block h-full">
                <div className="service-num font-display text-[var(--gold-text)] text-[.95rem]">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.subtitle}</p>
                <span className="link-arrow">
                  <span className="bar" /> Saber mais
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
