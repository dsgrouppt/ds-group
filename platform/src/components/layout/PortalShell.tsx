"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface PortalNavItem {
  href: string;
  label: string;
}

const PORTAL_NAV: PortalNavItem[] = [
  { href: "/portal", label: "Resumo" },
  { href: "/portal/projeto", label: "O Meu Projeto" },
  { href: "/portal/documentos", label: "Documentos" },
  { href: "/portal/fotos", label: "Fotos da Obra" },
  { href: "/portal/mensagens", label: "Mensagens" },
  { href: "/portal/cronograma", label: "Cronograma" },
  { href: "/portal/pagamentos", label: "Pagamentos" },
  { href: "/portal/relatorios", label: "Relatórios" },
];

export function PortalShell({
  client,
  unreadMessages,
  children,
}: {
  client: { name: string | null; email: string | null };
  unreadMessages: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-black text-mist">
        <div className="px-7 py-8">
          <Link href="/portal" className="font-display text-[1.3rem] font-medium tracking-tight text-white">
            DS <span className="font-sans font-light tracking-[0.3em] uppercase text-[0.75rem] align-middle text-mist-2">PROJECTS</span>
          </Link>
          <p className="text-[0.7rem] text-[#8a8a8c] mt-1.5 uppercase tracking-wide">Portal do Cliente</p>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-0.5" aria-label="Navegação do portal">
          {PORTAL_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3.5 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between ${
                isActive(item.href) ? "bg-white/[.10] text-white" : "text-[#c9c9ca] hover:bg-white/[.06] hover:text-white"
              }`}
            >
              {item.label}
              {item.href === "/portal/mensagens" && unreadMessages > 0 && (
                <span className="bg-gold text-black text-[0.65rem] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="px-7 py-6 border-t border-white/10">
          <div className="text-sm text-white leading-tight">{client.name ?? client.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/portal/login" })}
            className="text-xs text-[#8a8a8c] hover:text-white mt-2 transition-colors"
          >
            Terminar sessão
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex lg:hidden items-center justify-between gap-4 px-5 py-4 border-b border-mist-2 bg-white sticky top-0 z-20">
          <button
            className="flex flex-col gap-[4px] p-1.5"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="w-5 h-[1.5px] bg-ink" />
            <span className="w-5 h-[1.5px] bg-ink" />
            <span className="w-5 h-[1.5px] bg-ink" />
          </button>
          <span className="font-display text-[1.05rem]">DS Projects — Portal</span>
          <span className="w-8" />
        </header>

        {mobileOpen && (
          <nav className="lg:hidden bg-black text-mist px-5 py-4 flex flex-col gap-1" aria-label="Navegação móvel do portal">
            {PORTAL_NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-md text-sm text-[#d5d5d6] hover:bg-white/[.08]">
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/portal/login" })}
              className="text-left px-3 py-2.5 rounded-md text-sm text-[#d5d5d6] hover:bg-white/[.08] mt-2 border-t border-white/10 pt-4"
            >
              Terminar sessão
            </button>
          </nav>
        )}

        <main id="main-content" className="flex-1 px-5 lg:px-10 py-8 lg:py-10 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
