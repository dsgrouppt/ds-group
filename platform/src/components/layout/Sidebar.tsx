"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import type { ModuleKey } from "@/lib/permissions";

export function Sidebar({ allowed }: { allowed: ModuleKey[] }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => allowed.includes(item.key));

  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 bg-black text-mist min-h-screen sticky top-0">
      <div className="px-6 py-7 border-b border-white/[.08]">
        <Link href="/" className="font-display text-[1.35rem] font-medium tracking-tight text-white">
          DS <span className="font-sans font-light tracking-[0.28em] uppercase text-[.85rem] align-middle text-[#9a9a9c]">OS</span>
        </Link>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5" aria-label="Navegação principal">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`px-3.5 py-2.5 rounded-md text-sm transition-colors ${
                active ? "bg-white/[.08] text-white font-medium" : "text-[#b5b5b6] hover:bg-white/[.05] hover:text-white"
              }`}
            >
              {active && <span className="inline-block w-1 h-1 rounded-full bg-gold mr-2 align-middle" aria-hidden="true" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-5 border-t border-white/[.08] text-[.72rem] text-[#7c7c7e]">
        Uma empresa DS Group.
      </div>
    </aside>
  );
}
