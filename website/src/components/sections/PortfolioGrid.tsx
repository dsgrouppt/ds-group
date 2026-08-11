"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CaseStudy, Project } from "@/types";
import { filterCategories } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { cn } from "@/lib/utils";

interface PortfolioGridProps {
  /** Obras reais e publicadas — sempre com prioridade e sempre clicáveis para /portfolio/[slug]. */
  caseStudies: CaseStudy[];
  /**
   * Cartões ilustrativos por categoria/localização (sem obra real associada,
   * não clicáveis) — usados só como complemento enquanto o número de obras
   * reais publicadas ainda for baixo, para a grelha nunca parecer vazia.
   * Ver `lib/site-data.ts` para a política de honestidade destes cartões
   * (nunca um nome de obra fictício, só categoria + localização genérica).
   */
  fallbackProjects: Project[];
  showFilters?: boolean;
  dense?: boolean;
  initialCategory?: string;
  /** Nº mínimo de cartões antes de completar com ilustrativos. */
  minCards?: number;
  /**
   * Ativa "Mostrar mais" em vez de renderizar tudo de uma vez — pensado
   * para a listagem `/portfolio`, que com centenas de obras reais publicadas
   * não deve montar centenas de cartões (e centenas de observers de scroll
   * do Reveal) na primeira carga. Nas grelhas pequenas (teaser da homepage,
   * mini-grelha de cada página de serviço) fica desligado — já são limitadas
   * por `minCards`/`slice` a montante, não precisam disto.
   */
  paginate?: boolean;
  /** Quantos cartões mostrar de cada vez quando `paginate` está ativo. */
  pageSize?: number;
}

const categoryLabel: Record<string, string> = Object.fromEntries(
  filterCategories.map((c) => [c.value, c.label])
);

export function PortfolioGrid({
  caseStudies,
  fallbackProjects,
  showFilters = false,
  dense = false,
  initialCategory = "all",
  minCards = 6,
  paginate = false,
  pageSize = 12,
}: PortfolioGridProps) {
  const [active, setActive] = useState(initialCategory);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const fallbackFill = useMemo(() => {
    const needsFallback = caseStudies.length < minCards;
    return needsFallback ? fallbackProjects.slice(0, minCards - caseStudies.length) : [];
  }, [caseStudies, fallbackProjects, minCards]);

  const allVisibleCaseStudies = useMemo(
    () => (active === "all" ? caseStudies : caseStudies.filter((c) => c.category === active)),
    [caseStudies, active]
  );
  const allVisibleFallback = useMemo(
    () => (active === "all" ? fallbackFill : fallbackFill.filter((p) => p.category === active)),
    [fallbackFill, active]
  );

  const totalVisible = allVisibleCaseStudies.length + allVisibleFallback.length;

  // Sem paginação: comportamento exatamente igual ao de antes (mostra tudo).
  // Com paginação: obras reais têm sempre prioridade nos primeiros N cartões
  // — os ilustrativos só aparecem depois de esgotarem as obras reais dessa
  // categoria, para nunca "roubar" o lugar a uma obra real ao paginar.
  const visibleCaseStudies = paginate ? allVisibleCaseStudies.slice(0, visibleCount) : allVisibleCaseStudies;
  const remainingSlotsForFallback = paginate ? Math.max(0, visibleCount - visibleCaseStudies.length) : Infinity;
  const visibleFallback = paginate
    ? allVisibleFallback.slice(0, remainingSlotsForFallback)
    : allVisibleFallback;

  const hasMore = paginate && visibleCaseStudies.length + visibleFallback.length < totalVisible;

  function handleCategoryChange(value: string) {
    setActive(value);
    setVisibleCount(pageSize); // muda de categoria => recomeça a paginação
  }

  return (
    <div>
      {showFilters && (
        <div className="filters flex flex-wrap gap-3 mb-14">
          {filterCategories.map((cat) => (
            <button
              key={cat.value}
              className={cn("filter-btn", active === cat.value && "active")}
              onClick={() => handleCategoryChange(cat.value)}
              type="button"
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className={cn("projects-grid", dense && "dense")}>
        {visibleCaseStudies.map((c, i) => (
          <Reveal key={c.slug} index={i % 6} delayStep={0.07}>
            <Link href={`/portfolio/${c.slug}`} className="project-card block h-full">
              <PlaceholderMedia variant="light" src={c.cover.src} alt={c.cover.alt} className="absolute inset-0" />
              <div className="project-overlay">
                <div className="project-tag">{categoryLabel[c.category] ?? c.category}</div>
                <h3>{c.title}</h3>
                <span className="text-mist font-light text-[.82rem]">{c.location}</span>
              </div>
              <div className="project-arrow">↗</div>
            </Link>
          </Reveal>
        ))}

        {visibleFallback.map((project, i) => (
          <Reveal key={project.id} index={(visibleCaseStudies.length + i) % 6} delayStep={0.07}>
            <div className="project-card">
              <PlaceholderMedia variant="light" src={project.image} className="absolute inset-0" />
              <div className="project-overlay">
                <div className="project-tag">{categoryLabel[project.category] ?? project.category}</div>
                <h3>{project.title}</h3>
                <span className="text-mist font-light text-[.82rem]">{project.location}</span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {totalVisible === 0 && (
        <p className="text-graphite-light text-sm mt-8">
          Sem projetos nesta categoria por agora — volte em breve.
        </p>
      )}

      {hasMore && (
        <div className="flex justify-center mt-16">
          <button type="button" className="btn btn-light" onClick={() => setVisibleCount((v) => v + pageSize)}>
            Mostrar mais obras
          </button>
        </div>
      )}
    </div>
  );
}
