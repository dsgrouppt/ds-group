export type ServiceCategory =
  | "residencial"
  | "premium"
  | "cozinhas"
  | "casas-de-banho"
  | "moradias"
  | "comercial";

export interface Service {
  slug: string;
  num: string;
  category: ServiceCategory;
  title: string;
  subtitle: string;
  description: string[];
  includes: string[];
  /** Categorias de `faq-data.ts` mais relevantes para este serviço (evita repetir sempre as mesmas 4 perguntas em todas as páginas de serviço). */
  relatedFaqCategories?: ("Processo" | "Prazos e Orçamento" | "Investidores" | "Garantia")[];
  /** URL de embed YouTube/Vimeo (não-listado) — opcional, só aparece na página do serviço quando definido. */
  videoEmbedUrl?: string;
}

export interface Project {
  id: string;
  title: string; // usar "[Nome do Projeto]" enquanto não houver dado real
  location: string;
  category: ServiceCategory;
  image?: string; // caminho para fotografia real (public/ ou CDN); omitir para mostrar placeholder
  alt?: string;
}

export interface Stat {
  label: string;
  value: string | null; // null => mostra placeholder "—"; preencher com valor real quando existir
  suffix?: string;
}

export interface TeamMember {
  name: string | null; // null => mostra placeholder "[Nome]"
  role: string;
  image?: string;
}

export interface TimelineStep {
  time: string;
  title: string;
  description: string;
}

export interface VideoItem {
  id: string;
  title: string;
  embedUrl?: string; // URL de embed (YouTube/Vimeo) quando existir
  /** Horizontal (16:9, YouTube) ou vertical (9:16, reels/shorts) — decide o layout do cartão. */
  orientation?: "horizontal" | "vertical";
}

export interface VideoTestimonial {
  id: string;
  clientName: string | null;
  context: string;
  embedUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// SISTEMA DE PORTEFÓLIO / ESTUDOS DE CASO — ago/2026
// ─────────────────────────────────────────────────────────────────────────
// Arquitetura de conteúdo pensada para crescer durante anos sem alterar
// código: cada obra vive em `website/content/obras/<slug>/obra.json`
// (validado por `lib/portfolio.ts`) com os ficheiros correspondentes em
// `website/public/obras/<slug>/...`. Ver `content/obras/_MODELO/README.md`
// para o guia passo-a-passo de como adicionar uma obra nova.

/** Fase da obra a que a fotografia/vídeo corresponde. */
export type MediaPhase = "antes" | "durante" | "depois";

/** Orientação do vídeo — relevante para decidir o layout do cartão (thumb 16:9 vs 9:16). */
export type MediaOrientation = "horizontal" | "vertical";

/**
 * Categorias de classificação usadas na auditoria automática de fotografias/
 * vídeos (ver `scripts/audit-media.mjs`). O mesmo ficheiro pode ter mais do
 * que uma tag (ex.: uma foto de cozinha com pavimento novo tem `cozinha` e
 * `pavimentos`).
 */
export type MediaTag =
  | "cozinha"
  | "casa-de-banho"
  | "pintura"
  | "pladur"
  | "pavimentos"
  | "fachada"
  | "exterior"
  | "interior"
  | "drone"
  | "obra-completa";

export interface MediaAsset {
  id: string;
  kind: "foto" | "video";
  /** Caminho relativo a `public/obras/<slug>/...`. Omitir mostra o placeholder elegante. */
  src?: string;
  /** Para vídeo: URL de embed do YouTube/Vimeo (não-listado). Nunca vídeo self-hosted. */
  embedUrl?: string;
  orientation?: MediaOrientation;
  phase?: MediaPhase;
  tags?: MediaTag[];
  /** Obrigatório sempre que `kind === "foto"` e `src` está definido (acessibilidade + SEO de imagem). */
  alt?: string;
  caption?: string;
}

export type CaseStudyStatus = "draft" | "published";

export interface CaseStudy {
  slug: string;
  /** Título institucional — nunca identifica o cliente (ver Secção "Testemunhos" do handover de conteúdo). */
  title: string;
  category: ServiceCategory;
  /** Slugs de `services` (site-data.ts) — liga a obra às páginas de serviço para SEO/internal linking. */
  servicesRealized: string[];
  /** Localização genérica (concelho/zona) — nunca morada nem identificação do cliente. */
  location: string;
  duration?: string;
  materials?: string[];
  challenge?: string;
  planning?: string;
  execution?: string;
  solution?: string;
  result?: string;
  summary: string;
  cover: MediaAsset;
  gallery: MediaAsset[];
  videos?: MediaAsset[];
  publishedAt?: string;
  featured?: boolean;
  status: CaseStudyStatus;
}

/** Testemunho — nunca renderizado sem `authorized: true` (ver política de Testemunhos). */
export interface Testimonial {
  id: string;
  kind: "video" | "texto";
  clientName?: string;
  location?: string;
  photo?: string;
  quote?: string;
  embedUrl?: string;
  rating?: number; // 1-5
  relatedCaseStudySlug?: string;
  authorized: boolean;
}
