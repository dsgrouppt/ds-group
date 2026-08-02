"use client";

import { useMemo, useState } from "react";
import { filterCategories } from "@/lib/site-data";
import type { Project } from "@/types";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { cn } from "@/lib/utils";

interface ProjectsGridProps {
  items: Project[];
  showFilters?: boolean;
  initialCategory?: string;
  dense?: boolean;
}

const categoryLabel: Record<string, string> = Object.fromEntries(
  filterCategories.map((c) => [c.value, c.label])
);

export function ProjectsGrid({ items, showFilters = false, initialCategory = "all", dense = false }: ProjectsGridProps) {
  const [active, setActive] = useState(initialCategory);

  const visible = useMemo(
    () => (active === "all" ? items : items.filter((p) => p.category === active)),
    [items, active]
  );

  return (
    <div>
      {showFilters && (
        <div className="filters flex flex-wrap gap-3 mb-14">
          {filterCategories.map((cat) => (
            <button
              key={cat.value}
              className={cn("filter-btn", active === cat.value && "active")}
              onClick={() => setActive(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className={cn("projects-grid", dense && "dense")}>
        {visible.map((project, i) => (
          <Reveal key={project.id} index={i % 6} delayStep={0.07}>
            <div className="project-card">
              <PlaceholderMedia variant="light" src={project.image} className="absolute inset-0" />
              <div className="project-overlay">
                <div className="project-tag">{categoryLabel[project.category] ?? project.category}</div>
                <h3>{project.title}</h3>
                <span className="text-mist font-light text-[.82rem]">{project.location}</span>
              </div>
              <div className="project-arrow">↗</div>
            </div>
          </Reveal>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-graphite-light text-sm mt-8">
          Sem projetos nesta categoria por agora — volte em breve.
        </p>
      )}
    </div>
  );
}
