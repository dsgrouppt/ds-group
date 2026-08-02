"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const variants: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0 },
};

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
 */
export function Reveal({ children, className, index = 0, delayStep = 0.09 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={variants}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: index * delayStep }}
    >
      {children}
    </motion.div>
  );
}
