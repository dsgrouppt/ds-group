import Link from "next/link";
import { services, siteConfig } from "@/lib/site-data";
import { localAreas } from "@/lib/local-seo-data";

export function Footer() {
  return (
    <footer className="bg-black text-mist pt-24 pb-10 border-t border-white/[.08]">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-12 pb-20">
          <div>
            <Link href="/" className="logo">
              <b>DS</b>
              <span>Projects</span>
            </Link>
            <p className="mt-5 max-w-[32ch] text-sm font-light text-[#9a9a9c] leading-relaxed">
              {siteConfig.tagline}
            </p>
          </div>

          <div className="footer-col">
            <h4 className="text-[.7rem] tracking-[.18em] uppercase text-[#8d8d8f] mb-6 font-medium">
              Navegação
            </h4>
            <Link href="/#servicos">Serviços</Link>
            <Link href="/#metodo">Método</Link>
            <Link href="/portfolio">Portefólio</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/estudo-de-viabilidade">Estudo de Viabilidade</Link>
            <Link href="/acesso-clientes">Acesso Clientes</Link>
            <Link href="/#contacto">Contacto</Link>
          </div>

          <div className="footer-col">
            <h4 className="text-[.7rem] tracking-[.18em] uppercase text-[#8d8d8f] mb-6 font-medium">
              Áreas de Atuação
            </h4>
            {localAreas.map((a) => (
              <Link key={a.slug} href={`/remodelacoes/${a.slug}`}>
                {a.name}
              </Link>
            ))}
          </div>

          <div className="footer-col">
            <h4 className="text-[.7rem] tracking-[.18em] uppercase text-[#8d8d8f] mb-6 font-medium">
              Serviços
            </h4>
            {services.map((s) => (
              <Link key={s.slug} href={`/servicos/${s.slug}`}>
                {s.title}
              </Link>
            ))}
          </div>

          <div className="footer-col">
            <h4 className="text-[.7rem] tracking-[.18em] uppercase text-[#8d8d8f] mb-6 font-medium">
              Contacto
            </h4>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            <a href={`tel:${siteConfig.phone}`}>{siteConfig.phoneDisplay}</a>
            <a href={`tel:${siteConfig.phoneAlt}`}>{siteConfig.phoneAltDisplay}</a>
            <a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            <span className="block text-sm font-light text-[#c9c9c8] mb-[.9rem]">
              {siteConfig.locations.join(" · ")}
            </span>
          </div>
        </div>

        <div className="border-t border-white/[.08] pt-9 flex flex-wrap items-center justify-between gap-4 text-[.78rem] text-[#7c7c7e]">
          <span>© {new Date().getFullYear()} DS Projects — Uma empresa DS Group.</span>
          <div className="flex gap-7">
            <Link href="/politica-de-privacidade">Política de Privacidade</Link>
            <Link href="/termos">Termos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
