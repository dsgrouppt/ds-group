"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { MediaAsset, MediaTag } from "@/types";
import { Lightbox } from "@/components/ui/Lightbox";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { cn } from "@/lib/utils";

interface GalleryProps {
  items: MediaAsset[];
  /** Mostra os filtros por categoria (tags) acima da grelha — desligar em galerias pequenas/dedicadas. */
  showFilters?: boolean;
  dense?: boolean;
}

const TAG_LABELS: Record<MediaTag, string> = {
  cozinha: "Cozinhas",
  "casa-de-banho": "Casas de Banho",
  pintura: "Pintura",
  pladur: "Pladur",
  pavimentos: "Pavimentos",
  fachada: "Fachadas",
  exterior: "Exteriores",
  interior: "Interiores",
  drone: "Drone",
  "obra-completa": "Obra Completa",
};

/**
 * Galeria premium reutilizável: lazy loading (next/image, `loading="lazy"`
 * por omissão em tudo o que não é `priority`), filtros por categoria/tag,
 * e lightbox em ecrã completo com zoom e navegação por teclado (ver
 * `Lightbox.tsx`). Funciona com zero itens (mostra `PlaceholderMedia`) e
 * com qualquer número de itens reais assim que existirem — nenhuma
 * alteração de código necessária quando as fotografias forem adicionadas
 * via `content/obras/<slug>/obra.json`.
 */
export function Gallery({ items, showFilters = false, dense = false }: GalleryProps) {
  const [activeTag, setActiveTag] = useState<MediaTag | "all">("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const availableTags = useMemo(() => {
    const set = new Set<MediaTag>();
    items.forEach((i) => i.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [items]);

  const visible = useMemo(
    () => (activeTag === "all" ? items : items.filter((i) => i.tags?.includes(activeTag))),
    [items, activeTag]
  );

  if (items.length === 0) {
    return (
      <div className="relative aspect-[16/9]">
        <PlaceholderMedia variant="light" className="absolute inset-0" />
      </div>
    );
  }

  return (
    <div>
      {showFilters && availableTags.length > 1 && (
        <div className="filters flex flex-wrap gap-3 mb-10">
          <button
            className={cn("filter-btn", activeTag === "all" && "active")}
            onClick={() => setActiveTag("all")}
            type="button"
          >
            Todas
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              className={cn("filter-btn", activeTag === tag && "active")}
              onClick={() => setActiveTag(tag)}
              type="button"
            >
              {TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      )}

      <div className={cn("projects-grid", dense && "dense")}>
        {visible.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="project-card text-left cursor-zoom-in"
            aria-label={item.alt || "Ver imagem em ecrã completo"}
          >
            {item.kind === "video" ? (
              <div className="absolute inset-0 bg-ink">
                <div className="play-btn">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-white ml-[3px]" aria-hidden="true" focusable="false">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            ) : item.src ? (
              <Image
                src={item.src}
                alt={item.alt || ""}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            ) : (
              <PlaceholderMedia variant="light" className="absolute inset-0" />
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          items={visible}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </div>
  );
}
