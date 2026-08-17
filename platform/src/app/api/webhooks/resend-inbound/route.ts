import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { recordInboundEmail } from "@/lib/email-inbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook público do Resend — receção de emails (Prioridade 6, ago/2026,
 * ver src/lib/email-inbound.ts para o desenho completo e as dependências
 * externas em falta).
 *
 * Assinatura verificada com o SDK oficial (`resend.webhooks.verify`,
 * formato Svix: cabeçalhos svix-id/svix-timestamp/svix-signature +
 * RESEND_INBOUND_WEBHOOK_SECRET). Gated por duas variáveis que ainda não
 * existem em produção (RESEND_INBOUND_WEBHOOK_SECRET e a já existente
 * RESEND_API_KEY, aqui reutilizada para ir buscar o corpo completo do
 * email via GET /emails/receiving/{id} — o payload do webhook em si só
 * traz metadados, nunca o corpo) — sem elas, responde sempre 503 e não
 * processa nada, mesmo padrão dos outros endpoints internos desta ronda
 * (ver /api/internal/hubspot-sync).
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;

  if (!webhookSecret || !apiKey) {
    console.warn("[resend-inbound] RESEND_INBOUND_WEBHOOK_SECRET ou RESEND_API_KEY em falta — receção de email não configurada.");
    return NextResponse.json({ error: "Receção de email não configurada." }, { status: 503 });
  }

  const rawBody = await request.text();
  const resend = new Resend(apiKey);

  let event;
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });
  } catch (err) {
    console.error("[resend-inbound] Assinatura inválida — pedido recusado:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  try {
    const { data: full, error } = await resend.emails.receiving.get(event.data.email_id);
    if (error || !full) {
      console.error("[resend-inbound] Falha ao obter conteúdo do email:", error);
      return NextResponse.json({ ok: false, error: "falha_ao_obter_conteudo" }, { status: 500 });
    }

    const result = await recordInboundEmail({
      resendEmailId: event.data.email_id,
      from: full.from,
      to: full.to ?? [],
      subject: full.subject ?? null,
      text: full.text ?? null,
      html: full.html ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, duplicate: result.duplicate, clientMatched: result.clientMatched });
  } catch (err) {
    console.error("[resend-inbound] Erro ao processar email recebido:", err);
    return NextResponse.json({ ok: false, error: "erro_desconhecido" }, { status: 500 });
  }
}
