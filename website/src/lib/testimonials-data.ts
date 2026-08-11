import fs from "node:fs";
import path from "node:path";
import type { Testimonial } from "@/types";

/**
 * Loader do sistema de testemunhos — mesmo padrão de `lib/portfolio.ts`.
 *
 * Fonte de conteúdo: `website/content/testemunhos/<id>/testemunho.json`.
 * Pastas cujo nome começa por `_` (ex.: `_MODELO`) são sempre ignoradas.
 *
 * Duas barreiras contra publicar algo sem autorização:
 * 1. `getAuthorizedTestimonials()` só devolve entradas com `authorized: true`.
 * 2. Enquanto não existir nenhuma pasta válida, devolve uma lista vazia —
 *    os componentes que consomem isto (ver `VideoTestimonials.tsx`) sabem
 *    mostrar uma mensagem institucional nesse caso, nunca um testemunho
 *    inventado "para preencher".
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "testemunhos");

function assert(condition: unknown, folder: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[testimonials] content/testemunhos/${folder}/testemunho.json inválido: ${message}`);
  }
}

function validateTestimonial(raw: unknown, folder: string): Testimonial {
  assert(raw && typeof raw === "object", folder, "o ficheiro não contém um objeto JSON válido");
  const o = raw as Record<string, unknown>;

  assert(typeof o.id === "string" && o.id.trim(), folder, `"id" em falta`);
  assert(o.kind === "video" || o.kind === "texto", folder, `"kind" tem de ser "video" ou "texto"`);
  assert(typeof o.authorized === "boolean", folder, `"authorized" tem de ser um booleano explícito (true/false)`);
  if (o.kind === "video") {
    assert(typeof o.embedUrl === "string" && o.embedUrl.trim(), folder, `"embedUrl" é obrigatório quando kind é "video"`);
  }
  if (o.rating !== undefined) {
    assert(typeof o.rating === "number" && o.rating >= 1 && o.rating <= 5, folder, `"rating" tem de ser um número entre 1 e 5`);
  }

  return {
    id: o.id as string,
    kind: o.kind as "video" | "texto",
    clientName: typeof o.clientName === "string" ? o.clientName : undefined,
    location: typeof o.location === "string" ? o.location : undefined,
    photo: typeof o.photo === "string" ? o.photo : undefined,
    quote: typeof o.quote === "string" ? o.quote : undefined,
    embedUrl: typeof o.embedUrl === "string" ? o.embedUrl : undefined,
    rating: typeof o.rating === "number" ? o.rating : undefined,
    relatedCaseStudySlug: typeof o.relatedCaseStudySlug === "string" ? o.relatedCaseStudySlug : undefined,
    authorized: o.authorized === true,
  };
}

let cache: Testimonial[] | null = null;

function getAllTestimonialsInternal(): Testimonial[] {
  if (cache) return cache;
  if (!fs.existsSync(CONTENT_DIR)) {
    cache = [];
    return cache;
  }

  const folders = fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);

  cache = folders.map((folder) => {
    const jsonPath = path.join(CONTENT_DIR, folder, "testemunho.json");
    assert(fs.existsSync(jsonPath), folder, "falta o ficheiro testemunho.json");
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    return validateTestimonial(raw, folder);
  });

  return cache;
}

/** Única lista que deve alimentar páginas públicas — filtra por autorização explícita. */
export function getAuthorizedTestimonials(): Testimonial[] {
  return getAllTestimonialsInternal().filter((t) => t.authorized);
}

/** Testemunhos autorizados ligados a uma obra específica (ver relatedCaseStudySlug). */
export function getTestimonialsForCaseStudy(caseStudySlug: string): Testimonial[] {
  return getAuthorizedTestimonials().filter((t) => t.relatedCaseStudySlug === caseStudySlug);
}
