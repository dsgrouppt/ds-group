import fs from "node:fs";
import path from "node:path";
import type { CaseStudy, MediaAsset, ServiceCategory } from "@/types";

/**
 * Loader do sistema de portefólio/estudos de caso.
 *
 * Fonte de conteúdo: `website/content/obras/<slug>/obra.json` (um ficheiro
 * por obra, nunca código). Pastas cujo nome começa por `_` (ex.: `_MODELO`)
 * são sempre ignoradas — nunca chegam a build nem a produção, mesmo que o
 * `obra.json` lá dentro esteja tecnicamente válido. É assim que se garante
 * que a pasta-modelo nunca aparece publicada por engano.
 *
 * Validação: cada `obra.json` é validado à mão (sem dependência nova tipo
 * Zod, para manter o website leve) — um campo obrigatório em falta ou um
 * valor de `category` inválido falha o build com uma mensagem clara,
 * identificando a pasta exata, em vez de deixar passar uma obra incompleta
 * ou de rebentar silenciosamente a renderizar `undefined`.
 *
 * `status: "draft"` existe precisamente para o fluxo pedido: podes preparar
 * uma obra com calma, fazer commit, e ela só fica pública quando mudares
 * para `"published"` — nunca antes disso.
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "obras");
const VALID_CATEGORIES: ServiceCategory[] = [
  "residencial",
  "premium",
  "cozinhas",
  "casas-de-banho",
  "moradias",
  "comercial",
];

function assert(condition: unknown, folder: string, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[portfolio] content/obras/${folder}/obra.json inválido: ${message}`);
  }
}

function validateMediaAsset(raw: unknown, folder: string, field: string, index: number): MediaAsset {
  assert(raw && typeof raw === "object", folder, `${field}[${index}] tem de ser um objeto`);
  const m = raw as Record<string, unknown>;
  assert(typeof m.id === "string" && m.id, folder, `${field}[${index}].id em falta`);
  assert(m.kind === "foto" || m.kind === "video", folder, `${field}[${index}].kind tem de ser "foto" ou "video"`);
  if (m.kind === "foto" && typeof m.src === "string" && m.src) {
    assert(typeof m.alt === "string" && m.alt.trim(), folder, `${field}[${index}].alt é obrigatório quando há "src" (acessibilidade/SEO)`);
  }
  return {
    id: m.id as string,
    kind: m.kind as "foto" | "video",
    src: typeof m.src === "string" ? m.src : undefined,
    embedUrl: typeof m.embedUrl === "string" ? m.embedUrl : undefined,
    orientation: m.orientation === "horizontal" || m.orientation === "vertical" ? m.orientation : undefined,
    phase: m.phase === "antes" || m.phase === "durante" || m.phase === "depois" ? m.phase : undefined,
    tags: Array.isArray(m.tags) ? (m.tags as MediaAsset["tags"]) : undefined,
    alt: typeof m.alt === "string" ? m.alt : undefined,
    caption: typeof m.caption === "string" ? m.caption : undefined,
  };
}

function validateCaseStudy(raw: unknown, folder: string): CaseStudy {
  assert(raw && typeof raw === "object", folder, "o ficheiro não contém um objeto JSON válido");
  const o = raw as Record<string, unknown>;

  assert(typeof o.slug === "string" && o.slug === folder, folder, `"slug" tem de existir e ser exatamente igual ao nome da pasta ("${folder}")`);
  assert(typeof o.title === "string" && o.title.trim(), folder, `"title" em falta`);
  assert(typeof o.category === "string" && VALID_CATEGORIES.includes(o.category as ServiceCategory), folder, `"category" tem de ser um de: ${VALID_CATEGORIES.join(", ")}`);
  assert(typeof o.location === "string" && o.location.trim(), folder, `"location" em falta`);
  assert(typeof o.summary === "string" && o.summary.trim(), folder, `"summary" em falta`);
  assert(o.status === "draft" || o.status === "published", folder, `"status" tem de ser "draft" ou "published"`);
  assert(o.cover && typeof o.cover === "object", folder, `"cover" em falta`);

  const gallery = Array.isArray(o.gallery) ? o.gallery.map((g, i) => validateMediaAsset(g, folder, "gallery", i)) : [];
  const videos = Array.isArray(o.videos) ? o.videos.map((v, i) => validateMediaAsset(v, folder, "videos", i)) : undefined;

  return {
    slug: o.slug as string,
    title: o.title as string,
    category: o.category as ServiceCategory,
    servicesRealized: Array.isArray(o.servicesRealized) ? (o.servicesRealized as string[]) : [],
    location: o.location as string,
    duration: typeof o.duration === "string" ? o.duration : undefined,
    materials: Array.isArray(o.materials) ? (o.materials as string[]) : undefined,
    challenge: typeof o.challenge === "string" ? o.challenge : undefined,
    planning: typeof o.planning === "string" ? o.planning : undefined,
    execution: typeof o.execution === "string" ? o.execution : undefined,
    solution: typeof o.solution === "string" ? o.solution : undefined,
    result: typeof o.result === "string" ? o.result : undefined,
    summary: o.summary as string,
    cover: validateMediaAsset(o.cover, folder, "cover", 0),
    gallery,
    videos,
    publishedAt: typeof o.publishedAt === "string" ? o.publishedAt : undefined,
    featured: o.featured === true,
    status: o.status as "draft" | "published",
  };
}

let cache: CaseStudy[] | null = null;

/** Todas as obras válidas (inclui rascunhos) — nunca chamar diretamente em código de página pública. */
function getAllCaseStudiesInternal(): CaseStudy[] {
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
    const jsonPath = path.join(CONTENT_DIR, folder, "obra.json");
    assert(fs.existsSync(jsonPath), folder, `falta o ficheiro obra.json`);
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    return validateCaseStudy(raw, folder);
  });

  return cache;
}

/** Obras publicadas, ordenadas por mais recente — é a única lista que deve alimentar páginas públicas. */
export function getPublishedCaseStudies(): CaseStudy[] {
  return getAllCaseStudiesInternal()
    .filter((c) => c.status === "published")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return getPublishedCaseStudies().find((c) => c.slug === slug);
}

export function getFeaturedCaseStudies(limit?: number): CaseStudy[] {
  const featured = getPublishedCaseStudies().filter((c) => c.featured);
  const list = featured.length > 0 ? featured : getPublishedCaseStudies();
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export function getCaseStudiesByCategory(category?: string, limit?: number): CaseStudy[] {
  const filtered = !category || category === "all"
    ? getPublishedCaseStudies()
    : getPublishedCaseStudies().filter((c) => c.category === category);
  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}

export function getCaseStudiesByService(serviceSlug: string, limit?: number): CaseStudy[] {
  const filtered = getPublishedCaseStudies().filter((c) => c.servicesRealized.includes(serviceSlug));
  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}

export function getRelatedCaseStudies(slug: string, limit = 3): CaseStudy[] {
  const current = getCaseStudyBySlug(slug);
  if (!current) return getPublishedCaseStudies().slice(0, limit);
  const sameCategory = getPublishedCaseStudies().filter((c) => c.slug !== slug && c.category === current.category);
  const rest = getPublishedCaseStudies().filter((c) => c.slug !== slug && c.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}
