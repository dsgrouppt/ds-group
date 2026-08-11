"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Índice usado para desfasar entradas em grelha (efeito stagger). */
  index?: number;
  delayStep?: number;
}

/**
 * Substitui o IntersectionObserver + classes .reveal/.stagger da versão
 * estática por Framer Motion, mantendo exatamente a mesma curva de
 * animação (translateY 36px + fade, ease equivalente a cubic-bezier(.16,1,.3,1)).
 *
 * Respeita `prefers-reduced-motion` (useReducedMotion do Framer Motion,
 * já ligado à media query do sistema operativo): quem tiver essa preferência
 * ativa vê o conteúdo diretamente, sem qualquer deslocação/fade — mesmo
 * cuidado já aplicado ao vídeo de fundo da Hero (ver Hero.tsx). Sem isto,
 * praticamente todas as secções do site (usa-se `Reveal` em toda a parte)
 * ignoravam por completo uma preferência de acessibilidade do sistema.
 */
export function Reveal({ children, className, index = 0, delayStep = 0.09 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  const variants: Variants = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 36 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={variants}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: index * delayStep }
      }
    >
      {children}
    </motion.div>
  );
}
