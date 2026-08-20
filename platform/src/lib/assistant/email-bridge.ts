import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { validateOutboundText } from "./guardrails";

/**
 * DS Sales Assistant — ponte de primeiro contacto por EMAIL (aprovada
 * 18.08.2026; publicada dormant 20.08.2026).
 *
 * Fallback do canal WhatsApp enquanto a WABA não existir: quando um lead
 * nativo da Meta chega com email, pode receber uma resposta automática de
 * confirmação/qualificação inicial.
 *
 * ESTADO NESTA PUBLICAÇÃO — DORMANT E NÃO INVOCADA:
 *  1. Nenhum código chama esta função (o hook no webhook de Lead Ads NÃO
 *     foi adicionado — alterar webhooks Meta está expressamente vedado).
 *     Publicar a biblioteca sem o hook mantém-na inerte por construção.
 *  2. Mesmo que fosse chamada, exige ASSISTANT_EMAIL_BRIDGE === "true",
 *     variável que não existe em produção.
 *  3. O texto enviado passa pelos guardrails determinísticos antes de
 *     qualquer envio — sem preços, prazos de execução ou descontos.
 *
 * Regras cumpridas: não menciona preços/prazos/descontos, não promete
 * serviços, não substitui a tarefa "Primeiro Contacto" nem o SLA (camada
 * aditiva), e não cria Clientes ou Negócios — só escreve nos modelos de
 * comunicação existentes (EmailThread/EmailMessage) e no ActivityLog.
 */

export interface FirstContactEmailInput {
  dealId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
}

export interface FirstContactEmailResult {
  ok: boolean;
  reason?: string;
}

/** Primeiro nome apenas, para saudação natural. */
function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] || "";
  return /^lead$/i.test(first) ? "" : first;
}

export function buildFirstContactEmail(name: string): { subject: string; html: string; text: string } {
  const greeting = name ? `Olá ${name},` : "Olá,";
  const subject = "Recebemos o seu pedido — DS Projects";
  const html = `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color:#1a1a1a;">
<p>${greeting}</p>
<p>Obrigado pelo seu contacto através do nosso anúncio. O seu pedido já está registado e um membro da equipa DS Projects vai falar consigo <strong>no prazo máximo de 1 dia útil</strong>.</p>
<p>Para prepararmos esse contacto da melhor forma, ajuda-nos muito se puder responder a este email com:</p>
<p>1. O tipo de projeto que tem em mente (ex.: remodelação completa, cozinha, casa de banho);<br>
2. A localização do imóvel;<br>
3. Quando gostaria de avançar;<br>
4. Se tiver, fotografias ou plantas do espaço.</p>
<p>Enquanto espera, pode conhecer o nosso trabalho em <a href="https://www.dsprojects.pt/portfolio" style="color:#1a1a1a;">dsprojects.pt/portfolio</a>.</p>
<p>Com os melhores cumprimentos,<br><strong>DS Projects</strong><br><span style="color:#888;">Remodelações e gestão integral de projetos</span></p>
<p style="color:#888;font-size:12px;margin-top:32px;">Recebeu este email porque submeteu um pedido de contacto num anúncio da DS Projects. Os seus dados são usados apenas para responder a este pedido — consulte a nossa <a href="https://www.dsprojects.pt/politica-de-privacidade" style="color:#888;">Política de Privacidade</a>.</p>
</div>`;
  const text = `${greeting}

Obrigado pelo seu contacto através do nosso anúncio. O seu pedido já está registado e um membro da equipa DS Projects vai falar consigo no prazo máximo de 1 dia útil.

Para prepararmos esse contacto, ajuda-nos muito se responder a este email com:
1. O tipo de projeto que tem em mente (ex.: remodelação completa, cozinha, casa de banho);
2. A localização do imóvel;
3. Quando gostaria de avançar;
4. Se tiver, fotografias ou plantas do espaço.

Pode conhecer o nosso trabalho em https://www.dsprojects.pt/portfolio

Com os melhores cumprimentos,
DS Projects`;
  return { subject, html, text };
}

export async function sendFirstContactEmail(input: FirstContactEmailInput): Promise<FirstContactEmailResult> {
  if (process.env.ASSISTANT_EMAIL_BRIDGE !== "true") {
    return { ok: false, reason: "desativado" };
  }

  try {
    const email = input.clientEmail.trim().toLowerCase();
    if (!email) return { ok: false, reason: "sem_email" };

    // Idempotência: nunca duas boas-vindas ao mesmo negócio.
    const alreadySent = await prisma.activityLog.findFirst({
      where: { action: "ASSISTANT_EMAIL_SENT", entity: "Deal", entityId: input.dealId },
    });
    if (alreadySent) return { ok: true, reason: "ja_enviado" };

    const { subject, html, text } = buildFirstContactEmail(firstName(input.clientName));

    // Guardrails determinísticos antes de qualquer envio (mesma régua do motor).
    const verdict = validateOutboundText(text);
    if (!verdict.ok) {
      await prisma.activityLog.create({
        data: { action: "ASSISTANT_MESSAGE_BLOCKED", entity: "Deal", entityId: input.dealId, meta: `email-bridge;violacoes=${verdict.violations.join(",")}` },
      });
      return { ok: false, reason: `guardrails:${verdict.violations.join(",")}` };
    }

    const result = await sendEmail(email, subject, html, text);
    if (!result.sent) {
      console.error(`[assistant-email-bridge] Envio falhou para deal ${input.dealId}: ${result.reason}`);
      return { ok: false, reason: result.reason };
    }

    const thread = await prisma.emailThread.upsert({
      where: { participantEmail: email },
      update: { clientId: input.clientId, lastMessageAt: new Date() },
      create: { participantEmail: email, clientId: input.clientId, lastMessageAt: new Date() },
    });

    await prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        direction: "OUTBOUND",
        resendEmailId: result.id,
        subject,
        bodyText: text,
        bodyHtml: html,
        fromAddress: (process.env.EMAIL_FROM || "DS OS <notificacoes@dsprojects.pt>").toLowerCase(),
        toAddress: email,
      },
    });

    await prisma.activityLog.create({
      data: { action: "ASSISTANT_EMAIL_SENT", entity: "Deal", entityId: input.dealId, meta: `primeiro-contacto-email;threadId=${thread.id}` },
    });

    return { ok: true };
  } catch (error) {
    console.error("[assistant-email-bridge] Falha inesperada:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "erro_desconhecido" };
  }
}
