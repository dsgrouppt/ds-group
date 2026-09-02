"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mainNav, siteConfig } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function Header() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bloqueia o scroll do body quando o menu mobile está aberto.
  useEffect(() => {
        document.body.style.overflow = menuOpen ? "hidden" : "";
        return () => {
                document.body.style.overflow = "";
        };
  }, [menuOpen]);

    // Navegação robusta para âncoras (#seccao) na mesma página.
      // Corrige uma falha em que o scroll nativo/next-link falhava para
      // secções muito abaixo na página (layout/altura ainda a estabilizar).
      // Faz várias tentativas de scrollIntoView para garantir o resultado.
      const handleAnchorClick = (
              e: React.MouseEvent<HTMLAnchorElement>,
              href: string
            ) => {
                    if (href.startsWith("/#") && window.location.pathname === "/") {
                              const id = href.slice(2);
                              e.preventDefault();
                              window.history.pushState(null, "", href);
                              let attempts = 0;
                              const tryScroll = () => {
                                          const el = document.getElementById(id);
                                          if (el) {
                                                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                                          }
                                          attempts += 1;
                                          if (attempts < 6) {
                                                        setTimeout(tryScroll, 150);
                                          }
                              };
                              tryScroll();
                    }
            };

  return (
        <>
              <header className={cn("site-header", scrolled && "scrolled")}>
                      <div className="container flex w-full items-center justify-between">
                                <Link href="/" className="logo" onClick={() => setMenuOpen(false)}>
                                            <b>DS</b>
                                            <span>Projects</span>
                                </Link>
                      
                                <nav className="nav-links hidden lg:flex items-center gap-[2.1rem]" aria-label="Navegação principal">
                                  {mainNav.map((item) => (
                        <Link
                                          key={item.href}
                                          href={item.href as never}
                                          onClick={(e) => handleAnchorClick(e, item.href)}
                                        >
                          {item.label}
                        </Link>
                      ))}
                                </nav>
                      
                                <div className="flex items-center gap-[2.2rem]">
                                            <a
                                              href={`tel:${siteConfig.phone}`}
                                              className="hidden lg:inline text-[.78rem] text-mist tracking-[.03em] hover:text-white transition-colors"
                                            >
                                              {siteConfig.phoneDisplay}
                                            </a>
                                            <a
                                                            href={siteConfig.whatsappVisitUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hidden lg:inline text-[.78rem] text-mist tracking-[.03em] hover:text-white transition-colors"
                                                          >
                                                          Agendar Visita
                                            </a>
                                            <Link
                                                            href="/estudo-de-viabilidade"
                                                            className="btn btn-dark hidden lg:inline-flex"
                                                            style={{ padding: ".8rem 1.6rem" }}
                                                          >
                                                          Estudo de Viabilidade
                                            </Link>
                                            <button
                                                            className="burger flex lg:hidden flex-col gap-[5px]"
                                                            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                                                            aria-expanded={menuOpen}
                                                            aria-controls="mobileMenu"
                                                            onClick={() => setMenuOpen((v) => !v)}
                                                          >
                                                          <span style={menuOpen ? { transform: "translateY(6px) rotate(45deg)" } : undefined} />
                                                          <span style={menuOpen ? { opacity: 0 } : undefined} />
                                                          <span style={menuOpen ? { transform: "translateY(-6px) rotate(-45deg)" } : undefined} />
                                            </button>
                                </div>
                      </div>
              </header>
        
              <div className={cn("mobile-menu", menuOpen && "open")} id="mobileMenu">
                {mainNav.map((item) => (
                    <Link
                                  key={item.href}
                                  href={item.href as never}
                                  onClick={(e) => {
                                                  setMenuOpen(false);
                                                  handleAnchorClick(e, item.href);
                                  }}
                                >
                      {item.label}
                    </Link>
                  ))}
                      <Link
                                  href="/estudo-de-viabilidade"
                                  className="btn btn-dark mt-8"
                                  onClick={() => setMenuOpen(false)}
                                >
                                Estudo de Viabilidade
                      </Link>
                      <a
                                  href={siteConfig.whatsappVisitUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-light mt-4"
                                  onClick={() => setMenuOpen(false)}
                                >
                                Agendar Visita
                      </a>
                      <a
                                  href={siteConfig.whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-light mt-4"
                                  onClick={() => setMenuOpen(false)}
                                >
                                Falar com a DS Projects
                      </a>
                      <p className="mt-10 text-xs text-[#8d8d8f]">
                        {siteConfig.phoneDisplay} · {siteConfig.email}
                      </p>
              </div>
        </>
      );
}
