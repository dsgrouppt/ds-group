import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { firstContactDueAt } from "@/lib/sla";
import { notifyLeadNovo } from "@/lib/notifications";
import { LEAD_SOURCE } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook público da Meta para Lead Ads / Instant Forms (execução urgente,
 * ago/2026 — "META LEADS + WHATSAPP + CENTRALIZAÇÃO DS OS"). Fecha o gap
 * identificado na auditoria: um lead nativo da Meta (preenchido dentro do
 * próprio Facebook/Instagram, sem visitar o site) hoje não chega ao DS OS
 * de forma nenhuma — só via exportação manual do Meta Ads Manager, que o
 * Diogo pediu explicitamente para deixar de depender.
 *
 * Fluxo (documentação oficial da Meta para Lead Ads Webhooks):
 *  1. A Meta envia só o `leadgen_id` no evento do webhook — NUNCA os dados
 *     do formulário (nome/email/telefone). Os dados reais têm de ser
 *     pedidos à parte, à Graph API, com um token de página.
 *  2. GET é a verificação de subscrição do webhook (handshake único, feito
 *     pela Meta quando o Diogo configurar o webhook no painel da App) —
 *     ver função `GET` abaixo.
 *  3. POST é o evento real, um por cada lead novo. Todo o corpo vem
 *     assinado com HMAC-SHA256 (cabeçalho `X-Hub-Signature-256`), usando o
 *     App Secret da App da Meta — verificado abaixo antes de processar
 *     seja o que for, exatamente como o resto do DS OS já verifica
 *     tokens partilhados (LEAD_INTAKE_TOKEN, NOTIFICATIONS_INTERNAL_TOKEN),
 *     só que aqui a Meta não permite um Bearer token simples, exige esta
 *     assinatura.
 *
 * Nunca chama sendCapiEvent() (platform/src/lib/meta-capi.ts) — pedido
 * explícito de não mexer em CAPI/Pixel/dedup nesta ronda, e um lead que já
 * nasceu dentro da própria Meta não precisa de ser "confirmado" à Meta via
 * CAPI da mesma forma que um lead do site precisa.
 *
 * DEPENDÊNCIA EXTERNA (não resolúvel por código, ver relatório final):
 *  - META_WEBHOOK_VERIFY_TOKEN: já gerado e configurado nesta sessão — o
 *    Diogo só precisa de colar o mesmo valor no painel da Meta.
 *  - META_APP_SECRET: tem de vir da App da Meta que o Diogo criar/usar em
 *    developers.facebook.com (Definições > Básico > Chave Secreta da App).
 *  - META_PAGE_ACCESS_TOKEN: token de Página com a permissão
 *    `leads_retrieval`, gerado depois de a App ter esta permissão (em modo
 *    de Desenvolvimento chega o Diogo ser admin da App e da Página — não
 *    precisa obrigatoriamente de Revisão da App, ver relatório final).
 * Sem estas três variáveis em Railway, este endpoint aceita o handshake
 * de verificação mas não consegue processar leads reais (POST falha e
 * fica registado em log, nunca finge sucesso).
 */

const GRAPH_API_VERSION = process.env.META_CAPI_API_VERSION || "v21.0";

// ── 1) Verificação de subscrição (handshake único, feito pela Meta) ──
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!expected) {
    return new NextResponse("Webhook não configurado (META_WEBHOOK_VERIFY_TOKEN em falta).", { status: 503 });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expectedHex = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const providedHex = signatureHeader.slice("sha256=".length);
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const providedBuf = Buffer.from(providedHex, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

interface MetaLeadgenChange {
  field: string;
  value: {
    leadgen_id: string;
    page_id?: string;
    form_id?: string;
    adgroup_id?: string; // "ad set" na terminologia antiga da Graph API
    ad_id?: string;
    created_time?: number;
  };
}

interface MetaWebhookBody {
  object?: string;
  entry?: Array<{ id: string; time?: number; changes?: MetaLeadgenChange[] }>;
}

interface GraphFieldDatum {
  name: string;
  values?: string[];
}

interface GraphLeadDetails {
  id: string;
  created_time?: string;
  field_data?: GraphFieldDatum[];
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
}

function pickField(fields: GraphFieldDatum[] | undefined, ...keys: string[]): string | undefined {
  if (!fields) return undefined;
  for (const key of keys) {
    const found = fields.find((f) => f.name.toLowerCase() === key);
    if (found?.values?.[0]) return found.values[0].trim();
  }
  return undefined;
}

/**
 * Vai buscar os dados reais do lead à Graph API (a Meta nunca os envia no
 * webhook em si, só o `leadgen_id`). Devolve `null` em qualquer falha —
 * nunca lança, para o chamador poder registar e seguir para o lead
 * seguinte do mesmo evento em vez de abortar tudo.
 */
async function fetchLeadDetails(leadgenId: string, pageAccessToken: string): Promise<GraphLeadDetails | null> {
  const fields = "field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,created_time";
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadgenId}?fields=${fields}&access_token=${encodeURIComponent(pageAccessToken)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    if (!res.ok) {
      console.error("[meta-leads-webhook] Graph API recusou o pedido de detalhe do lead:", res.status, json);
      return null;
    }
    return json as GraphLeadDetails;
  } catch (error) {
    console.error("[meta-leads-webhook] Erro de rede a pedir detalhe do lead à Graph API:", error);
    return null;
  }
}

async function processLeadgenChange(change: MetaLeadgenChange, pageAccessToken: string): Promise<void> {
  const leadgenId = change.value?.leadgen_id;
  if (!leadgenId) return;

  // Deduplicação — chave primária: o mesmo leadgen_id nunca gera dois
  // negócios, mesmo que a Meta reentregue o webhook (reentrega garantida
  // "pelo menos uma vez", nunca exatamente uma vez).
  const existing = await prisma.deal.findUnique({ where: { metaLeadgenId: leadgenId } });
  if (existing) {
    console.log(`[meta-leads-webhook] Lead ${leadgenId} já processado (deal ${existing.id}) — a ignorar reentrega.`);
    return;
  }

  const details = await fetchLeadDetails(leadgenId, pageAccessToken);
  if (!details) {
    console.error(`[meta-leads-webhook] Não foi possível obter os dados do lead ${leadgenId} — lead perdido, requer investigação manual no Meta Ads Manager.`);
    return;
  }

  const fields = details.field_data;
  const fullName =
    pickField(fields, "full_name") ||
    [pickField(fields, "first_name"), pickField(fields, "last_name")].filter(Boolean).join(" ").trim() ||
    "Lead Meta Ads (sem nome)";
  const email = pickField(fields, "email");
  const phone = pickField(fields, "phone_number", "phone");

  if (!email && !phone) {
    console.error(`[meta-leads-webhook] Lead ${leadgenId} sem email nem telefone nos campos do formulário — não é possível criar/associar Client. Dados brutos:`, JSON.stringify(fields));
    return;
  }

  const now = new Date();

  try {
    const client =
      (email ? await prisma.client.findFirst({ where: { email: email.toLowerCase() } }) : null) ||
      (phone ? await prisma.client.findFirst({ where: { phone } }) : null) ||
      (await prisma.client.create({
        data: { name: fullName, email: email?.toLowerCase(), phone, type: "FAMILIA" },
      }));

    const owner =
      (await prisma.user.findFirst({ where: { active: true, role: "ADMIN" }, orderBy: { createdAt: "asc" } })) ??
      (await prisma.user.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } }));

    const primeiroContactoDueAt = firstContactDueAt(now);

    const dealId = await prisma.$transaction(async (tx) => {
      const deal = await tx.deal.create({
        data: {
          title: `Lead Meta Ads (nativo) - ${fullName}`,
          clientId: client.id,
          source: LEAD_SOURCE.META_LEAD_ADS,
          ownerId: owner?.id,
          notes: `Recebido automaticamente via formulário nativo da Meta (Lead Ads / Instant Form).\nFormulário: ${details.form_id || change.value.form_id || "—"}`,
          metaLeadgenId: leadgenId,
          metaCampaignId: details.campaign_id,
          metaCampaignName: details.campaign_name,
          metaAdsetId: details.adset_id,
          metaAdsetName: details.adset_name,
          metaAdId: details.ad_id,
          metaAdName: details.ad_name,
          metaFormId: details.form_id || change.value.form_id,
        },
      });

      await tx.task.create({
        data: {
          title: "Primeiro Contacto",
          description: "SLA: 15 min em horário comercial (seg-sex, 09:00-19:00) / 2h fora desse horário. Lead recebido automaticamente de um formulário nativo da Meta (Lead Ads).",
          priority: "URGENTE",
          dueAt: primeiroContactoDueAt,
          assigneeId: owner?.id,
          dealId: deal.id,
          createdById: owner?.id,
        },
      });

      await tx.activityLog.create({
        data: { userId: owner?.id, action: "CREATE", entity: "Deal", entityId: deal.id, meta: "source=meta-lead-ads-webhook" },
      });

      return deal.id;
    });

    await notifyLeadNovo({
      dealId,
      dealTitle: `Lead Meta Ads (nativo) - ${fullName}`,
      assigneeEmail: owner?.email,
      assigneeName: owner?.name,
      dueAt: primeiroContactoDueAt,
    });

    console.log(`[meta-leads-webhook] Lead ${leadgenId} processado com sucesso — deal ${dealId}.`);
  } catch (error) {
    // Constraint @unique em metaLeadgenId pode disparar aqui numa corrida
    // (duas entregas simultâneas do mesmo evento) — tratado como duplicado
    // seguro, não como falha.
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      console.log(`[meta-leads-webhook] Lead ${leadgenId} — corrida de deduplicação apanhada pela constraint da base de dados, a ignorar.`);
      return;
    }
    console.error(`[meta-leads-webhook] Falha ao criar negócio para o lead ${leadgenId}:`, error);
  }
}

// ── 2) Evento real (um por lead novo) ──
export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

  const rawBody = await request.text();

  if (!appSecret) {
    console.error("[meta-leads-webhook] META_APP_SECRET em falta — pedido recusado sem verificar assinatura.");
    return NextResponse.json({ error: "Webhook não configurado (META_APP_SECRET em falta)." }, { status: 503 });
  }

  const signatureOk = verifySignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret);
  if (!signatureOk) {
    console.error("[meta-leads-webhook] Assinatura X-Hub-Signature-256 inválida — pedido recusado.");
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  if (!pageAccessToken) {
    // Assinatura válida (é mesmo a Meta), mas sem token de página não há
    // forma de ir buscar os dados do lead — falha registada, sempre 200
    // para a Meta não entrar num ciclo de reentregas indefinido por um
    // problema que só se resolve com configuração, não com retry.
    console.error("[meta-leads-webhook] META_PAGE_ACCESS_TOKEN em falta — não é possível obter dados do lead. Evento recebido mas não processado:", rawBody);
    return NextResponse.json({ ok: false, error: "META_PAGE_ACCESS_TOKEN em falta." }, { status: 200 });
  }

  let body: MetaWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const changes = (body.entry || []).flatMap((entry) => entry.changes || []).filter((c) => c.field === "leadgen");

  for (const change of changes) {
    await processLeadgenChange(change, pageAccessToken);
  }

  return NextResponse.json({ ok: true, processed: changes.length });
}
