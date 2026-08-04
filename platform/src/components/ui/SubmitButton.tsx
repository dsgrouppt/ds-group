"use client";

import { useFormStatus } from "react-dom";
import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-black text-white hover:bg-ink",
  secondary: "bg-white text-ink border border-mist-2 hover:border-graphite-light",
  ghost: "bg-transparent text-graphite hover:bg-mist",
  danger: "bg-danger text-white hover:opacity-90",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

/**
 * Botão de submissão com estado de "a processar" automático (via
 * useFormStatus do React 18) — evita duplo-clique/submissões repetidas
 * em Server Actions, que não têm nenhum feedback de pendência nativo do
 * browser. Tem de estar dentro de um <form action={...}>, nunca fora.
 */
export function SubmitButton({
  children,
  pendingLabel = "A guardar...",
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
