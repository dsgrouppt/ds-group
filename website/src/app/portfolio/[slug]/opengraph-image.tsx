import { ImageResponse } from "next/og";
import { getCaseStudyBySlug, getPublishedCaseStudies } from "@/lib/portfolio";
import { OgImageLayout, OG_SIZE } from "@/lib/og-image";

// Runtime "nodejs" (não "edge") propositadamente: `lib/portfolio.ts` lê
// `content/obras/*.json` do disco via `node:fs`, API só disponível no
// runtime Node — o resto do site usa edge para OG por ser mais rápido,
// mas aqui a leitura de ficheiros exige o runtime completo.
export const alt = "DS Projects — Portefólio";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return getPublishedCaseStudies().map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: { slug: string } }) {
  const caseStudy = getCaseStudyBySlug(params.slug);
  return new ImageResponse(
    <OgImageLayout eyebrow="Portefólio" title={caseStudy?.title ?? alt} />,
    { ...size }
  );
}
