import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Exporta o conteúdo publicado do módulo "Site — Portefólio" num formato
 * que o script `website/scripts/import-cms-export.mjs` consegue ler
 * diretamente e escrever como `content/obras/<slug>/obra.json` e
 * `content/testemunhos/<id>/testemunho.json` — os mesmos ficheiros que
 * `website/src/lib/portfolio.ts` e `lib/testimonials-data.ts` já sabem ler.
 *
 * Decisão deliberada de v1 (ver docs/website-cms-integracao.md): esta rota
 * exige sessão de equipa autenticada (não é uma API pública) e devolve um
 * ficheiro para download manual — não há nenhuma automação DS OS → GitHub.
 * Publicar no site continua a ser sempre: preencher aqui → Publicar →
 * Exportar → correr o script no website → rever o diff → commit → push.
 * Isto evita ter de dar ao DS OS um token do GitHub e mantém o fluxo de
 * publicação sob controlo humano em cada passo.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!can(session.user.role, "marketing", "view")) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const caseStudies = await prisma.websiteCaseStudy.findMany({
    where: { status: "PUBLISHED" },
    include: { media: { orderBy: { sortOrder: "asc" } } },
    orderBy: { publishedAt: "desc" },
  });

  const testimonials = await prisma.websiteTestimonial.findMany({
    where: { authorized: true },
    include: { caseStudy: { select: { slug: true } } },
  });

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    caseStudies: caseStudies.map((c) => ({
      slug: c.slug,
      title: c.title,
      category: c.category,
      location: c.location,
      summary: c.summary,
      challenge: c.challenge ?? undefined,
      planning: c.planning ?? undefined,
      execution: c.execution ?? undefined,
      solution: c.solution ?? undefined,
      result: c.result ?? undefined,
      servicesRealized: c.servicesRealized,
      duration: c.duration ?? undefined,
      materials: c.materials.length > 0 ? c.materials : undefined,
      featured: c.featured,
      status: "published" as const,
      publishedAt: c.publishedAt?.toISOString(),
      cover: c.media.find((m) => m.role === "cover")
        ? mapMedia(c.media.find((m) => m.role === "cover")!)
        : { id: "cover-em-falta", kind: "foto" as const },
      gallery: c.media.filter((m) => m.role === "gallery").map(mapMedia),
      videos: c.media.filter((m) => m.role === "video").map(mapMedia),
    })),
    testimonials: testimonials.map((t) => ({
      id: t.id,
      kind: t.kind,
      clientName: t.clientName ?? undefined,
      location: t.location ?? undefined,
      quote: t.quote ?? undefined,
      embedUrl: t.embedUrl ?? undefined,
      photo: t.photo ?? undefined,
      rating: t.rating ?? undefined,
      relatedCaseStudySlug: t.caseStudy?.slug,
      authorized: true,
    })),
  };

  return NextResponse.json(exportPayload, {
    headers: {
      "Content-Disposition": `attachment; filename="ds-website-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

function mapMedia(m: { id: string; kind: string; src: string | null; embedUrl: string | null; orientation: string | null; phase: string | null; alt: string | null; caption: string | null }) {
  return {
    id: m.id,
    kind: m.kind,
    src: m.src ?? undefined,
    embedUrl: m.embedUrl ?? undefined,
    orientation: m.orientation ?? undefined,
    phase: m.phase ?? undefined,
    alt: m.alt ?? undefined,
    caption: m.caption ?? undefined,
  };
}
