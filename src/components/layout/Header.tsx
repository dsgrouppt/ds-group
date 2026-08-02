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
              <Link key={item.href} href={item.href as never}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-[2.2rem]">
            <Link
              href="/#contacto"
              className="btn btn-dark hidden lg:inline-flex"
              style={{ padding: ".8rem 1.6rem" }}
            >
              Estudo de Viabilidade
            </Link>
            <button
              className="burger flex lg:hidden flex-col gap-[5px]"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
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
          <Link key={item.href} href={item.href as never} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Link href="/#contacto" className="btn btn-dark mt-8" onClick={() => setMenuOpen(false)}>
          Estudo de Viabilidade
        </Link>
        <p className="mt-10 text-xs text-[#8d8d8f]">
          {siteConfig.phoneDisplay} · {siteConfig.email}
        </p>
      </div>
    </>
  );
}
