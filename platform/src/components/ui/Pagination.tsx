import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
}

/**
 * Paginação simples baseada em ?page=N na própria URL da página (Server
 * Component, sem JS no cliente) — consistente com o resto da app, que não
 * usa nenhuma camada de estado client-side para listagens.
 */
export function Pagination({ page, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevHref = `${basePath}?page=${Math.max(1, page - 1)}`;
  const nextHref = `${basePath}?page=${Math.min(totalPages, page + 1)}`;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-black/[.06] text-sm">
      <Link
        href={prevHref}
        aria-disabled={page <= 1}
        className={`link-arrow ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
      >
        <span className="bar" /> Anterior
      </Link>
      <span className="text-graphite-light">
        Página {page} de {totalPages}
      </span>
      <Link
        href={nextHref}
        aria-disabled={page >= totalPages}
        className={`link-arrow ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
      >
        Seguinte <span className="bar" />
      </Link>
    </div>
  );
}

export function parsePage(searchParams?: { page?: string }): number {
  const raw = Number(searchParams?.page ?? "1");
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.floor(raw);
}

export const PAGE_SIZE = 25;
