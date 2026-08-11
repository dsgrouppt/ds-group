"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";

/**
 * Ações do módulo "Site — Portefólio" (CMS interno para o website público).
 *
 * Reutiliza a permissão já existente do módulo `marketing` (ADMIN, DIRECAO,
 * MARKETING) — não foi criada nenhuma role nova. Ver
 * `docs/website-cms-integracao.md` para o desenho completo.
 */

const CATEGORIES = ["residencial", "premium", "cozinhas", "casas-de-banho", "moradias", "comercial"] as const;

const CaseStudySchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug só pode ter letras minúsculas, números e hífens (ex.: remodelacao-cascais-01)"),
  title: z.string().min(3).max(150),
  category: z.enum(CATEGORIES),
  location: z.string().min(2).max(100),
  summary: z.string().min(10).max(500),
  challenge: z.string().max(2000).optional(),
  planning: z.string().max(2000).optional(),
  execution: z.string().max(2000).optional(),
  solution: z.string().max(2000).optional(),
  result: z.string().max(2000).optional(),
  duration: z.string().max(60).optional(),
  servicesRealized: z.string().max(300).optional(), // slugs separados por vírgula
  materials: z.string().max(300).optional(), // itens separados por vírgula
  projectId: z.string().max(50).optional(),
  featured: z.union([z.literal("on"), z.literal(null)]).optional(),
});

function splitList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function requireEdit() {
  const user = await requireModuleAccess("marketing");
  if (!can(user.role, "marketing", "edit")) {
    throw new Error("Sem permissão para editar o portefólio do site.");
  }
  return user;
}

export async function createCaseStudy(formData: FormData) {
  const user = await requireEdit();

  const parsed = CaseStudySchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    category: formData.get("category"),
    location: formData.get("location"),
    summary: formData.get("summary"),
    challenge: formData.get("challenge") || undefined,
    planning: formData.get("planning") || undefined,
    execution: formData.get("execution") || undefined,
    solution: formData.get("solution") || undefined,
    result: formData.get("result") || undefined,
    duration: formData.get("duration") || undefined,
    servicesRealized: formData.get("servicesRealized") || undefined,
    materials: formData.get("materials") || undefined,
    projectId: formData.get("projectId") || undefined,
    featured: formData.get("featured") as "on" | null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  const existing = await prisma.websiteCaseStudy.findUnique({ where: { slug: data.slug } });
  if (existing) {
    throw new Error(`Já existe uma obra com o slug "${data.slug}". Escolhe outro.`);
  }

  await prisma.websiteCaseStudy.create({
    data: {
      slug: data.slug,
      title: data.title,
      category: data.category,
      location: data.location,
      summary: data.summary,
      challenge: data.challenge,
      planning: data.planning,
      execution: data.execution,
      solution: data.solution,
      result: data.result,
      duration: data.duration,
      servicesRealized: splitList(data.servicesRealized),
      materials: splitList(data.materials),
      projectId: data.projectId || null,
      featured: data.featured === "on",
      status: "DRAFT",
      createdById: user.id,
    },
  });

  revalidatePath("/marketing/website");
}

export async function updateCaseStudy(id: string, formData: FormData) {
  await requireEdit();

  const parsed = CaseStudySchema.omit({ slug: true }).safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    location: formData.get("location"),
    summary: formData.get("summary"),
    challenge: formData.get("challenge") || undefined,
    planning: formData.get("planning") || undefined,
    execution: formData.get("execution") || undefined,
    solution: formData.get("solution") || undefined,
    result: formData.get("result") || undefined,
    duration: formData.get("duration") || undefined,
    servicesRealized: formData.get("servicesRealized") || undefined,
    materials: formData.get("materials") || undefined,
    projectId: formData.get("projectId") || undefined,
    featured: formData.get("featured") as "on" | null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  await prisma.websiteCaseStudy.update({
    where: { id },
    data: {
      title: data.title,
      category: data.category,
      location: data.location,
      summary: data.summary,
      challenge: data.challenge,
      planning: data.planning,
      execution: data.execution,
      solution: data.solution,
      result: data.result,
      duration: data.duration,
      servicesRealized: splitList(data.servicesRealized),
      materials: splitList(data.materials),
      projectId: data.projectId || null,
      featured: data.featured === "on",
    },
  });

  revalidatePath("/marketing/website");
  revalidatePath(`/marketing/website/${id}`);
}

/**
 * Alterna DRAFT <-> PUBLISHED. Publicar aqui NÃO publica automaticamente no
 * website — só marca a obra como pronta a incluir na próxima exportação
 * (ver `exportPublishedContent` em `export/actions.ts` e o botão "Exportar
 * conteúdo" na listagem). Ver docs/website-cms-integracao.md secção 3.
 */
export async function setCaseStudyStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  await requireEdit();
  await prisma.websiteCaseStudy.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
  });
  revalidatePath("/marketing/website");
}

export async function deleteCaseStudy(id: string) {
  await requireEdit();
  await prisma.websiteCaseStudy.delete({ where: { id } });
  revalidatePath("/marketing/website");
}

const TestimonialSchema = z.object({
  kind: z.enum(["texto", "video"]),
  clientName: z.string().max(150).optional(),
  location: z.string().max(100).optional(),
  quote: z.string().max(1000).optional(),
  embedUrl: z.string().max(300).optional(),
  photo: z.string().max(300).optional(),
  rating: z.string().max(2).optional(),
  caseStudyId: z.string().max(50).optional(),
});

export async function createTestimonial(formData: FormData) {
  const user = await requireEdit();

  const parsed = TestimonialSchema.safeParse({
    kind: formData.get("kind"),
    clientName: formData.get("clientName") || undefined,
    location: formData.get("location") || undefined,
    quote: formData.get("quote") || undefined,
    embedUrl: formData.get("embedUrl") || undefined,
    photo: formData.get("photo") || undefined,
    rating: formData.get("rating") || undefined,
    caseStudyId: formData.get("caseStudyId") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  if (data.kind === "video" && !data.embedUrl) {
    throw new Error('"Link do vídeo" é obrigatório para testemunhos em vídeo.');
  }

  const rating = data.rating ? Number(data.rating) : undefined;
  if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new Error("A classificação tem de ser um número inteiro entre 1 e 5.");
  }

  await prisma.websiteTestimonial.create({
    data: {
      kind: data.kind,
      clientName: data.clientName,
      location: data.location,
      quote: data.quote,
      embedUrl: data.embedUrl,
      photo: data.photo,
      rating,
      caseStudyId: data.caseStudyId || null,
      authorized: false, // nunca autorizado por omissão — ver setTestimonialAuthorized
      createdById: user.id,
    },
  });

  revalidatePath("/marketing/website/testemunhos");
}

/**
 * Única forma de marcar um testemunho como autorizado. Deliberadamente uma
 * ação separada e explícita (em vez de um campo no formulário de criação),
 * para que autorizar seja sempre um segundo passo consciente, nunca um
 * checkbox esquecido ligado sem querer ao criar o registo.
 */
export async function setTestimonialAuthorized(id: string, authorized: boolean) {
  await requireEdit();
  await prisma.websiteTestimonial.update({ where: { id }, data: { authorized } });
  revalidatePath("/marketing/website/testemunhos");
}

export async function deleteTestimonial(id: string) {
  await requireEdit();
  await prisma.websiteTestimonial.delete({ where: { id } });
  revalidatePath("/marketing/website/testemunhos");
}

const MediaSchema = z.object({
  kind: z.enum(["foto", "video"]),
  role: z.enum(["cover", "gallery", "video"]),
  phase: z.enum(["antes", "durante", "depois", ""]).optional(),
  orientation: z.enum(["horizontal", "vertical", ""]).optional(),
  src: z.string().max(300).optional(),
  embedUrl: z.string().max(300).optional(),
  alt: z.string().max(200).optional(),
  caption: z.string().max(200).optional(),
});

export async function addMediaAsset(caseStudyId: string, formData: FormData) {
  await requireEdit();

  const parsed = MediaSchema.safeParse({
    kind: formData.get("kind"),
    role: formData.get("role"),
    phase: formData.get("phase") || "",
    orientation: formData.get("orientation") || "",
    src: formData.get("src") || undefined,
    embedUrl: formData.get("embedUrl") || undefined,
    alt: formData.get("alt") || undefined,
    caption: formData.get("caption") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  if (data.kind === "foto" && !data.src) {
    throw new Error('"Caminho do ficheiro" é obrigatório para fotografias.');
  }
  if (data.kind === "foto" && data.src && !data.alt) {
    throw new Error('"Texto alternativo (alt)" é obrigatório sempre que há uma fotografia — acessibilidade e SEO.');
  }
  if (data.kind === "video" && !data.embedUrl) {
    throw new Error('"Link de embed" é obrigatório para vídeos.');
  }

  const count = await prisma.websiteMediaAsset.count({ where: { caseStudyId } });

  await prisma.websiteMediaAsset.create({
    data: {
      caseStudyId,
      kind: data.kind,
      role: data.role,
      phase: data.phase || null,
      orientation: data.orientation || null,
      src: data.src,
      embedUrl: data.embedUrl,
      alt: data.alt,
      caption: data.caption,
      sortOrder: count,
    },
  });

  revalidatePath(`/marketing/website/${caseStudyId}`);
}

export async function deleteMediaAsset(caseStudyId: string, mediaId: string) {
  await requireEdit();
  await prisma.websiteMediaAsset.delete({ where: { id: mediaId } });
  revalidatePath(`/marketing/website/${caseStudyId}`);
}
