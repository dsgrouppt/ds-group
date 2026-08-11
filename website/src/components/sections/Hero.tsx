"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { heroMedia, services, siteConfig } from "@/lib/site-data";

/**
 * Hero premium — pensada para os primeiros 5 segundos de um visitante que
 * nunca ouviu falar da DS Projects. Suporta 3 estados de fundo, ativados
 * automaticamente conforme `heroMedia` (lib/site-data.ts), sem alterar
 * este ficheiro:
 *
 * 1. `heroMedia.videoUrl` definido → vídeo de fundo (curto, mudo, em loop,
 *    self-hosted — não é o mesmo caso dos vídeos de processo/testemunhos,
 *    que ficam sempre no YouTube/Vimeo por razões de performance; um vídeo
 *    de fundo de Hero é sempre um clip curto e silencioso, e um embed do
 *    YouTube não serve para isso — mostra chrome do leitor). Respeita
 *    `prefers-reduced-motion`: se o visitante tiver essa preferência
 *    ativa, mostra sempre a fotografia/placeholder em vez do vídeo.
 * 2. Só `heroMedia.image` definido → fotografia premium de fundo.
 * 3. Nenhum dos dois definido (estado atual) → tratamento gráfico elegante
 *    já existente (`PlaceholderMedia`), nunca uma imagem inventada.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const [allowVideo, setAllowVideo] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAllowVideo(!reduceMotion);
  }, []);

  return (
    <section ref={ref} className="hero" id="top">
      <div className="hero-media">
        <motion.div style={{ y, height: "120%" }} className="absolute inset-0">
          {heroMedia.videoUrl && allowVideo ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={heroMedia.videoUrl}
              poster={heroMedia.image}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : (
            <PlaceholderMedia variant="dark" src={heroMedia.image} alt={heroMedia.imageAlt} priority />
          )}
        </motion.div>
      </div>

      <div className="container hero-content">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            DS PROJECTS — UMA EMPRESA DS GROUP
          </div>
          <h1>
            A gestão do seu projeto.
            <br />
            <em>Do primeiro esboço à última chave.</em>
          </h1>
          <p className="hero-sub">
            Remodelações completas geridas do início ao fim — para quem valoriza o resultado tanto
            quanto o processo.
          </p>

          <div className="flex items-center gap-9 mt-12 flex-wrap">
            <Link href="/estudo-de-viabilidade" className="btn btn-dark">
              Pedir Estudo de Viabilidade
            </Link>
            <a href={`tel:${siteConfig.phone}`} className="link-arrow text-white">
              <span className="bar" /> {siteConfig.phoneDisplay}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-10 text-[.78rem] text-mist/80 tracking-wide">
            <span>Prazo e orçamento contratuais, por escrito</span>
            <span className="hidden sm:inline text-mist/40">·</span>
            <span>{services.length} especialidades, {siteConfig.locations.length} concelhos</span>
          </div>
        </motion.div>
      </div>

      <div className="scroll-cue absolute bottom-10 left-[6vw] z-[2] flex items-center gap-3.5 text-mist">
        <div className="line" />
        <span>Scroll</span>
      </div>
    </section>
  );
}
