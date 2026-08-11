"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);

  return (
    <section ref={ref} className="hero" id="top">
      <div className="hero-media">
        <motion.div style={{ y, height: "120%" }} className="absolute inset-0">
          <PlaceholderMedia variant="dark" priority />
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
            <Link href="/#servicos" className="link-arrow text-white">
              <span className="bar" /> Ver Serviços
            </Link>
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
