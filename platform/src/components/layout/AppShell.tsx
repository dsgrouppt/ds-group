"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/lib/nav";
import type { ModuleKey } from "@/lib/permissions";
import { ROLE_LABEL, type RoleValue } from "@/lib/enums";
import { Sidebar } from "@/components/layout/Sidebar";

interface AppShellProps {
  allowed: ModuleKey[];
  user: { name?: string | null; email?: string | null; role: RoleValue };
  children: React.ReactNode;
}

export function AppShell({ allowed, user, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => allowed.includes(item.key));
  const currentLabel = items.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)))?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen">
      <Sidebar allowed={allowed} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between gap-4 px-5 lg:px-9 py-4 border-b border-mist-2 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden flex flex-col gap-[4px] p-1.5"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="w-5 h-[1.5px] bg-ink" />
              <span className="w-5 h-[1.5px] bg-ink" />
              <span className="w-5 h-[1.5px] bg-ink" />
            </button>
            <span className="font-display text-[1.05rem] lg:hidden">DS OS</span>
            <span className="hidden lg:block text-sm text-graphite-light">{currentLabel}</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/perfil" className="text-right hidden sm:block hover:opacity-70 transition-opacity">
              <div className="text-sm font-medium leading-tight">{user.name ?? user.email}</div>
              <div className="text-xs text-graphite-light leading-tight">{ROLE_LABEL[user.role]}</div>
            </Link>
            <Link
              href="/perfil"
              className="text-xs font-medium text-graphite-light hover:text-ink border border-mist-2 rounded-md px-3 py-1.5 transition-colors hidden sm:inline-block"
            >
              Perfil
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs font-medium text-graphite-light hover:text-ink border border-mist-2 rounded-md px-3 py-1.5 transition-colors"
            >
              Sair
            </button>
          </div>
        </header>

        {mobileOpen && (
          <nav className="lg:hidden bg-black text-mist px-5 py-4 flex flex-col gap-1" aria-label="Navegação móvel">
            {items.map((item) => (
              <Link key={item.key} href={item.href} onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-md text-sm text-[#d5d5d6] hover:bg-white/[.08]">
                {item.label}
              </Link>
            ))}
            <Link
              href="/perfil"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-2.5 rounded-md text-sm text-[#d5d5d6] hover:bg-white/[.08] mt-2 border-t border-white/10 pt-4"
            >
              O Meu Perfil
            </Link>
          </nav>
        )}

        <main id="main-content" className="flex-1 px-5 lg:px-9 py-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
