import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook público do WhatsApp Business Cloud API (Meta) — receção de
 * mensagens (execução urgente, ago/2026 — "META LEADS + WHATSAPP +
 * CENTRALIZAÇÃO DS OS"). Mesmo esquema de verificação/assinatura do
 * webhook de Lead Ads (ver /api/webhooks/meta-leads) — a Meta usa o mesmo
 * mecanismo (hub.challenge no GET, X-Hub-Signature-256 no POST) para
 * todos os webhooks das suas Apps, incluindo WhatsApp.
 *
 * Reutiliza deliberadamente META_APP_SECRET (não uma variável nova) — é a
 * mesma App da Meta, a mesma chave secreta assina os dois webhooks.
 * Usa uma verify-token PRÓPRIA (WHATSAPP_WEBHOOK_VERIFY_TOKEN, distinta de
 * META_WEBHOOK_VERIFY_TOKEN) só para poder trocar/rodar uma sem mexer na
 * outra — os dois webhooks são configurados como subscrições separadas no
 * painel da Meta, mesmo pertencendo à mesma App.
 *
 * DEPENDÊNCIA EXTERNA: requer uma WhatsApp Business Account (WABA) real
 * ligada à App — sem isso não há nenhum número a enviar mensagens para
 * este endpoint, o handshake de verificação funciona mas nunca chega
 * tráfego real. Ver platform/src/lib/whatsapp.ts para o lado de envio e o
 * relatório final desta ronda para o que falta exatamente.
 *
 * O que este endpoint faz quando chega uma mensagem real:
 *  1. Verifica a assinatura (mesma lógica do webhook de Lead Ads).
 *  2. Encontra ou cria a WhatsAppConversation pelo número de telefone.
 *  3. Tenta associar automaticamente a um Client existente com o mesmo
 *     número — fica por associar (clientId nulo) se não encontrar, para
 *     associação manual depois (não inventa um Client novo a partir de só
 *     um número de telefone, ao contrário do lead-intake que tem sempre
 *     pelo menos nome+email).
 *  4. Regista a mensagem (WhatsAppMessage, direction=INBOUND) e um
 *     ActivityLog, para aparecer no histórico do cliente sem precisar de
 *     um ecrã dedicado ainda por construir.
 */

// ── 1) Verificação de subscrição (handshake único, feito pela Meta) ──
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expected) {
    return new NextResponse("Webhook não configurado (WHATSAPP_WEBHOOK_VERIFY_TOKEN em falta).", { status: 503 });
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

interface WhatsAppInboundMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppContact {
  wa_id: string;
  profile?: { name?: string };
}

interface WhatsAppStatus {
  id: string;
  status: string; // "sent" | "delivered" | "read" | "failed"
}

interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      field: string;
      value?: {
        messages?: WhatsAppInboundMessage[];
        contacts?: WhatsAppContact[];
        statuses?: WhatsAppStatus[];
      };
    }>;
  }>;
}

const STATUS_MAP: Record<string, string> = {
  sent: "ENVIADA",
  delivered: "ENTREGUE",
  read: "LIDA",
  failed: "FALHOU",
};

async function getOrCreateConversation(phoneNumber: string, contactName: string | undefined) {
  const existing = await prisma.whatsAppConversation.findUnique({ where: { phoneNumber } });
  if (existing) return existing;

  // Associação automática a um Client existente com o mesmo número — só
  // isso, nunca cria um Client novo a partir de um número sozinho (sem
  // nome/email confirmados não há informação suficiente para um registo
  // comercial válido; fica visível como conversa por associar).
  const matchingClient = await prisma.client.findFirst({ where: { phone: phoneNumber } });

  return prisma.whatsAppConversation.create({
    data: {
      phoneNumber,
      waContactName: contactName,
      clientId: matchingClient?.id,
    },
  });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const rawBody = await request.text();

  if (!appSecret) {
    console.error("[whatsapp-webhook] META_APP_SECRET em falta — pedido recusado sem verificar assinatura.");
    return NextResponse.json({ error: "Webhook não configurado (META_APP_SECRET em falta)." }, { status: 503 });
  }

  const signatureOk = verifySignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret);
  if (!signatureOk) {
    console.error("[whatsapp-webhook] Assinatura X-Hub-Signature-256 inválida — pedido recusado.");
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  let body: WhatsAppWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const changes = (body.entry || []).flatMap((e) => e.changes || []).filter((c) => c.field === "messages");

  for (const change of changes) {
    const value = change.value;
    if (!value) continue;

    // Mensagens recebidas (inbound)
    for (const msg of value.messages || []) {
      try {
        const contact = value.contacts?.find((c) => c.wa_id === msg.from);
        const phoneNumber = msg.from.startsWith("+") ? msg.from : `+${msg.from}`;
        const conversation = await getOrCreateConversation(phoneNumber, contact?.profile?.name);

        const already = await prisma.whatsAppMessage.findUnique({ where: { waMessageId: msg.id } });
        if (already) continue; // reentrega — idempotente, mesmo padrão do webhook de Lead Ads

        await prisma.whatsAppMessage.create({
          data: {
            conversationId: conversation.id,
            direction: "INBOUND",
            waMessageId: msg.id,
            body: msg.type === "text" ? msg.text?.body : `[mensagem tipo "${msg.type}", sem suporte de texto ainda]`,
            status: "RECEBIDA",
          },
        });

        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date(Number(msg.timestamp) * 1000), waContactName: contact?.profile?.name || conversation.waContactName },
        });

        await prisma.activityLog.create({
          data: {
            action: "WHATSAPP_RECEIVED",
            entity: "WhatsAppConversation",
            entityId: conversation.id,
            meta: conversation.clientId ? `clientId=${conversation.clientId}` : "sem cliente associado",
          },
        });
      } catch (error) {
        console.error("[whatsapp-webhook] Falha ao registar mensagem recebida:", error);
      }
    }

    // Atualizações de estado de mensagens enviadas (outbound) — entregue/lida/falhou
    for (const status of value.statuses || []) {
      try {
        const mapped = STATUS_MAP[status.status];
        if (!mapped) continue;
        await prisma.whatsAppMessage.updateMany({
          where: { waMessageId: status.id },
          data: { status: mapped },
        });
      } catch (error) {
        console.error("[whatsapp-webhook] Falha ao atualizar estado de mensagem:", error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
