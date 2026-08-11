"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaAsset } from "@/types";

interface LightboxProps {
  items: MediaAsset[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Lightbox acessível e sem dependências externas (mantém o bundle leve,
 * alinhado com o objetivo de performance) — navegação por teclado (Esc,
 * setas), fecho ao clicar fora, zoom por clique, e um botão de fullscreen
 * nativo (Fullscreen API) além do overlay já cobrir o ecrã inteiro.
 * Suporta fotografia (`kind: "foto"`) e vídeo incorporado (`kind: "video"`,
 * YouTube/Vimeo — nunca vídeo self-hosted, ver Secção Vídeos).
 */
export function Lightbox({ items, index, onClose, onNavigate }: LightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const item = items[index];

  const goTo = useCallback(
    (next: number) => {
      setZoomed(false);
      onNavigate((next + items.length) % items.length);
    },
    [items.length, onNavigate]
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [goTo, index, onClose]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galeria em ecrã completo"
      className="fixed inset-0 z-[2000] bg-black/96 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      ref={containerRef}
    >
      <div className="flex items-center justify-between px-6 py-5 text-mist text-[.8rem] tracking-wide">
        <span>
          {index + 1} / {items.length}
        </span>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => containerRef.current?.requestFullscreen?.()}
            className="hover:text-white transition-colors"
            aria-label="Ecrã completo"
          >
            Ecrã Completo
          </button>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="hover:text-white transition-colors text-[1.1rem]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-4 pb-4 overflow-hidden">
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 text-mist hover:text-white text-3xl px-2 z-10"
            aria-label="Anterior"
          >
            ‹
          </button>
        )}

        {item.kind === "video" && item.embedUrl ? (
          <div className="w-full max-w-[1100px] aspect-video">
            <iframe
              src={item.embedUrl}
              title={item.alt || "Vídeo"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : item.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- lightbox mostra 1 imagem de cada vez, sob interação; next/image (fill) não se adapta bem a proporções variáveis num modal.
          <img
            src={item.src}
            alt={item.alt || ""}
            onClick={() => setZoomed((z) => !z)}
            className={
              zoomed
                ? "max-w-none max-h-none cursor-zoom-out object-contain overflow-auto"
                : "max-w-full max-h-full cursor-zoom-in object-contain"
            }
          />
        ) : (
          <div className="text-mist text-sm">Imagem em preparação.</div>
        )}

        {items.length > 1 && (
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 text-mist hover:text-white text-3xl px-2 z-10"
            aria-label="Seguinte"
          >
            ›
          </button>
        )}
      </div>

      {item.caption && (
        <div className="text-center text-[.78rem] text-[#9a9a9c] pb-6 px-6">{item.caption}</div>
      )}
    </div>
  );
}
