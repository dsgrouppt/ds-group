import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { firstContactDueAt } from "@/lib/sla";
import { notifyLeadNovo } from "@/lib/notifications";
import { LEAD_SOURCE, PROJECT_TYPE, BUDGET_RANGE } from "@/lib/enums";
import { consume } from "@/lib/rate-limit";
import { sendCapiEvent } from "@/lib/meta-capi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint interno de captacao automatica de leads (auditoria
 * ponta-a-ponta, ago/2026 - fecha o gap "Lead -> CRM" identificado nessa
 * auditoria: o formulario publico do site so submetia ao HubSpot, sem
 * nenhuma via automatica para o DS OS).
 *
 * Chamado maquina-a-maquina pelo backend do site (website/src/app/api/
 * contact/route.ts), nunca diretamente pelo browser do visitante - o
 * browser so fala com o backend do site, que por sua vez chama este
 * endpoint com um token partilhado (LEAD_INTAKE_TOKEN). Mesmo padrao ja
 * usado em /api/internal/notifications-check (NOTIFICATIONS_INTERNAL_TOKEN)
 * - token distinto por endpoint, para que a rotacao de um nunca obrigue a
 * mexer no outro. middleware.ts ja deixa /api/internal/* passar sem
 * verificacao de sessao de utilizador da equipa.
 *
 * Replica deliberadamente a mesma transacao de createDeal (crm/actions.ts):
 * Deal + Tarefa "Primeiro Contacto" (SLA) + ActivityLog numa unica
 * transacao, notificacao disparada depois, fora da transacao - mesmo
 * motivo ja documentado la (uma chamada de rede nao pode prender/reverter
 * uma escrita ja confirmada).
 *
 * Duas diferencas deliberadas face a createDeal:
 * 1) Nao ha sessao de utilizador da equipa - o "responsavel" e atribuido
 *    automaticamente ao utilizador ADMIN ativo mais antigo (hoje so existe
 *    um). Quando existir mais do que um comercial, esta escolha ingenua
 *    deve ser substituida por logica de distribuicao real - fica
 *    assinalado aqui de proposito para nao passar despercebido.
 * 2) Protecao contra duplicacao: se ja existir um negocio aberto (etapa
 *    fora de FECHADO_GANHO/FECHADO_PERDIDO) para o mesmo email criado nas
 *    ultimas 24h, nao cria um segundo - evita reenvios/duplo-clique a
 *    gerar dois negocios e duas notificacoes para o mesmo pedido.
 */

const ProjectTypeMap: Record<string, string> = {
  residencial: PROJECT_TYPE.RESIDENCIAL,
  moradia: PROJECT_TYPE.MORADIA,
  comercial: PROJECT_TYPE.COMERCIAL,
  investimento: PROJECT_TYPE.INVESTIMENTO,
};

const BudgetRangeMap: Record<string, string> = {
  "20k-30k": BUDGET_RANGE.R20_30K,
  "30k-75k": BUDGET_RANGE.R30_75K,
  "75k-150k": BUDGET_RANGE.R75_150K,
  "150k+": BUDGET_RANGE.R150K_PLUS,
};

const LeadIntakeSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  projectType: z.string().optional(),
  budgetRange: z.string().optional(),
  message: z.string().max(5000).optional(),
  pageUri: z.string().max(500).optional(),
  pageName: z.string().max(200).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  gclid: z.string().max(300).optional(),
  fbclid: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  metaEventId: z.string().max(100).optional(),
  clientIp: z.string().max(100).optional(),
  userAgent: z.string().max(500).optional(),
  fbp: z.string().max(200).optional(),
  fbc: z.string().max(300).optional(),
});

const SEARCH_ENGINE_HOSTS = ["google.", "bing.com", "duckduckgo.com", "yahoo.co", "ecosia.org", "baidu.com"];

function normalize(v: string | undefined): string {
  return (v || "").trim().toLowerCase();
}

function hostnameOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function isSearchEngineReferrer(referrer: string | undefined): boolean {
  const host = hostnameOf(referrer);
  if (!host) return false;
  return SEARCH_ENGINE_HOSTS.some((s) => host.includes(s));
}

function isOwnDomainReferrer(referrer: string | undefined): boolean {
  const host = hostnameOf(referrer);
  return !!host && host.endsWith("dsprojects.pt");
}

function classifySource(input: {
  utmSource?: string;
  utmMedium?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}): string {
  const utmSource = normalize(input.utmSource);
  const utmMedium = normalize(input.utmMedium);

  if (input.gclid || (utmSource === "google" && ["cpc", "ppc", "paidsearch"].includes(utmMedium))) {
    return LEAD_SOURCE.GOOGLE_ADS;
  }

  if (
    input.fbclid ||
    (["facebook", "instagram", "meta", "fb", "ig"].includes(utmSource) && ["cpc", "paid", "paidsocial"].includes(utmMedium))
  ) {
    return LEAD_SOURCE.META_ADS;
  }

  if (utmSource === "gbp" || utmMedium === "gbp") {
    return LEAD_SOURCE.GBP;
  }

  if (utmMedium === "organic" || isSearchEngineReferrer(input.referrer)) {
    return LEAD_SOURCE.SEO_ORGANICO;
  }

  if (input.referrer && !isOwnDomainReferrer(input.referrer)) {
    return LEAD_SOURCE.REFERENCIA;
  }

  if (!utmSource && !utmMedium && !input.gclid && !input.fbclid) {
    return LEAD_SOURCE.SITE;
  }

  return LEAD_SOURCE.OUTRO;
}

export async function POST(request: NextRequest) {
  const expected = process.env.LEAD_INTAKE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Captacao automatica de leads nao configurada (LEAD_INTAKE_TOKEN em falta)." },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido invalido." }, { status: 400 });
  }

  const parsed = LeadIntakeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  if (!consume(`lead-intake:${email}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  try {
    const now = new Date();

    let client = await prisma.client.findFirst({ where: { email } });
    if (!client) {
      client = await prisma.client.create({
        data: { name: data.name, email, phone: data.phone || undefined, type: "FAMILIA" },
      });
    }

    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const existingOpenDeal = await prisma.deal.findFirst({
      where: {
        clientId: client.id,
        createdAt: { gte: since },
        stage: { notIn: ["FECHADO_GANHO", "FECHADO_PERDIDO"] },
      },
    });
    if (existingOpenDeal) {
      return NextResponse.json({ ok: true, deduped: true, dealId: existingOpenDeal.id });
    }

    const owner = await prisma.user.findFirst({
      where: { active: true, role: "ADMIN" },
      orderBy: { createdAt: "asc" },
    }) ?? await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });

    const projectType = (data.projectType && ProjectTypeMap[data.projectType]) || PROJECT_TYPE.RESIDENCIAL;
    const budgetRange = data.budgetRange ? BudgetRangeMap[data.budgetRange] : undefined;
    const primeiroContactoDueAt = firstContactDueAt(now);

    const notesParts = [data.message?.trim(), data.pageUri ? `Origem: ${data.pageUri}` : undefined].filter(Boolean);

    const source = classifySource({
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      gclid: data.gclid,
      fbclid: data.fbclid,
      referrer: data.referrer,
    });

    const dealId = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          title: `Lead site - ${data.name}`,
          clientId: client!.id,
          source,
          projectType,
          budgetRange,
          notes: notesParts.length ? notesParts.join("\n\n") : undefined,
          ownerId: owner?.id,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          utmTerm: data.utmTerm,
          utmContent: data.utmContent,
          gclid: data.gclid,
          fbclid: data.fbclid,
          metaLeadEventId: data.metaEventId,
          metaFbp: data.fbp,
          metaFbc: data.fbc,
        },
      });

      await tx.task.create({
        data: {
          title: "Primeiro Contacto",
          description: "SLA: 15 min em horario comercial (seg-sex, 09:00-19:00) / 2h fora desse horario. Lead recebido automaticamente do site.",
          priority: "URGENTE",
          dueAt: primeiroContactoDueAt,
          assigneeId: owner?.id,
          dealId: deal.id,
          createdById: owner?.id,
        },
      });

      await tx.activityLog.create({
        data: { userId: owner?.id, action: "CREATE", entity: "Deal", entityId: deal.id, meta: "source=website-auto-intake" },
      });

      return deal.id;
    });

    await notifyLeadNovo({
      dealId,
      dealTitle: `Lead site - ${data.name}`,
      assigneeEmail: owner?.email,
      assigneeName: owner?.name,
      dueAt: primeiroContactoDueAt,
    });

    // Evento Meta CAPI "Lead" (ago/2026) — deliberadamente FORA da
    // transação e depois da notificação, mesmo motivo já documentado
    // acima: uma chamada de rede externa nunca pode prender/reverter uma
    // escrita já confirmada. Nunca corre no caminho "existingOpenDeal"
    // acima (return antecipado) — evita enviar dois eventos "Lead" à Meta
    // para o mesmo pedido duplicado/reenviado.
    const capiResult = await sendCapiEvent({
      eventName: "Lead",
      eventId: data.metaEventId,
      eventSourceUrl: data.pageUri,
      actionSource: "website",
      userData: {
        email,
        phone: data.phone,
        clientIp: data.clientIp,
        userAgent: data.userAgent,
        fbp: data.fbp,
        fbc: data.fbc,
        fbclid: data.fbclid,
      },
      customData: data.pageName ? { content_name: data.pageName } : undefined,
    });
    if (!capiResult.ok) {
      console.error("[lead-intake] Evento CAPI \"Lead\" não enviado:", capiResult.error);
    }

    return NextResponse.json({
      ok: true,
      dealId,
      clientId: client.id,
      capi: { sent: capiResult.ok, eventsReceived: capiResult.eventsReceived },
    });
  } catch (err) {
    console.error("[lead-intake] Falha ao criar lead automatico:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "erro_desconhecido" }, { status: 500 });
  }
}
