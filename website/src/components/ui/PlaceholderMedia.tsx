import Image from "next/image";
import { cn } from "@/lib/utils";

interface PlaceholderMediaProps {
  /** Caminho ou URL de uma fotografia real. Omitir para mostrar o placeholder identificado. */
  src?: string;
  alt?: string;
  /** "light" para secções claras, "dark" para secções escuras. */
  variant?: "light" | "dark";
  label?: string;
  caption?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Substitui, de forma explícita, o espaço onde deverá entrar fotografia real
 * da DS Projects. Assim que `src` for definido (fotografia real disponível),
 * o componente passa a usar next/image (otimização automática, lazy-load,
 * responsivo) sem qualquer alteração de layout nas secções que o usam.
 */
export function PlaceholderMedia({
  src,
  alt = "",
  variant = "light",
  label = "",
  caption,
  className,
  sizes = "100vw",
  priority = false,
}: PlaceholderMediaProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt || label}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <div className={cn("ph", variant, className)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden="true" focusable="false">
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <circle cx="9" cy="10" r="2" />
        <path d="M21 16l-5.5-4.5-4 4-3-2.2L3 17" />
      </svg>
      {label ? <span className="ph-label">{label}</span> : null}
      {caption ? <span className="ph-caption">{caption}</span> : null}
    </div>
  );
}
