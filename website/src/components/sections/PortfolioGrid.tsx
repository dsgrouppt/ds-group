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
}: PortfolioGridProps) {
  const [active, setActive] = useState(initialCategory);

  const fallbackFill = useMemo(() => {
    const needsFallback = caseStudies.length < minCards;
    return needsFallback ? fallbackProjects.slice(0, minCards - caseStudies.length) : [];
  }, [caseStudies, fallbackProjects, minCards]);

  const visibleCaseStudies = useMemo(
    () => (active === "all" ? caseStudies : caseStudies.filter((c) => c.category === active)),
    [caseStudies, active]
  );
  const visibleFallback = useMemo(
    () => (active === "all" ? fallbackFill : fallbackFill.filter((p) => p.category === active)),
    [fallbackFill, active]
  );

  const totalVisible = visibleCaseStudies.length + visibleFallback.length;

  return (
    <div>
      {showFilters && (
        <div className="filters flex flex-wrap gap-3 mb-14">
          {filterCategories.map((cat) => (
            <button
              key={cat.value}
              className={cn("filter-btn", active === cat.value && "active")}
              onClick={() => setActive(cat.value)}
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
    </div>
  );
}
