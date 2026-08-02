"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor personalizado (apenas em dispositivos com ponteiro fino — desktop).
 * Usa delegação de eventos no document, por isso continua a funcionar sobre
 * conteúdo montado/desmontado dinamicamente entre rotas do App Router.
 */
export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    let mx = 0, my = 0, cx = 0, cy = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      el.classList.add("active");
    };

    const loop = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      raf = requestAnimationFrame(loop);
    };

    const isHoverTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest("a, button, .project-card, .video-card, .testimonial-card, .filter-btn");

    const onOver = (e: MouseEvent) => {
      if (isHoverTarget(e.target)) el.classList.add("grow");
    };
    const onOut = (e: MouseEvent) => {
      if (isHoverTarget(e.target)) el.classList.remove("grow");
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    raf = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor" aria-hidden="true" />;
}
