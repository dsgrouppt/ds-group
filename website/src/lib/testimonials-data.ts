import type { Testimonial } from "@/types";

/**
 * Testemunhos reais e autorizados. Fica vazio até existir pelo menos um
 * testemunho com consentimento explícito do cliente para divulgação —
 * ver a política completa em `components/sections/VideoTestimonials.tsx`.
 * Um testemunho só é renderizado no site se `authorized: true`; qualquer
 * entrada aqui com `authorized: false` (ou em falta) é ignorada em
 * `getAuthorizedTestimonials()`, como segunda barreira de segurança contra
 * publicar algo sem autorização por engano.
 *
 * Exemplo de estrutura, pronta a usar assim que houver o primeiro testemunho
 * real (não é lido pelo site — está aqui só como referência de formato):
 *
 * {
 *   id: "t1",
 *   kind: "texto",
 *   clientName: "Nome real do cliente, com autorização",
 *   location: "Concelho/zona genérica",
 *   quote: "Citação real do cliente.",
 *   rating: 5,
 *   relatedCaseStudySlug: "slug-da-obra-correspondente",
 *   authorized: true,
 * }
 */
export const testimonials: Testimonial[] = [];

export function getAuthorizedTestimonials(): Testimonial[] {
  return testimonials.filter((t) => t.authorized);
}
