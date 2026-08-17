import { prisma } from "@/lib/prisma";

/**
 * Associação de email ao cliente (Prioridade 6, ago/2026: "EXECUÇÃO
 * IMEDIATA — associação de emails relevantes ao cliente no DS OS").
 *
 * Estado antes desta ronda: zero infraestrutura de email associado a
 * Client/Deal no schema (ver comentário histórico em src/lib/timeline.ts).
 * Os envios existentes (src/lib/email.ts, `sendEmail()`) são só
 * notificações internas à equipa (assignee/owner) — nunca há hoje um
 * email de saída dirigido a um Cliente, por isso este ficheiro trata
 * apenas do lado de ENTRADA: emails recebidos de/para clientes.
 *
 * Fornecedor: Resend (já configurado e com domínio dsprojects.pt
 * verificado — ver RESEND_API_KEY/EMAIL_FROM, Fase 4). O Resend suporta
 * receção de email (Receiving) num domínio/subdomínio próprio, entregando
 * um webhook "email.received" com metadados e disponibilizando o corpo
 * completo via GET /emails/receiving/{id}. Este é um mecanismo distinto
 * do envio (Fase 4) — requer a sua própria configuração no painel Resend
 * (domínio/subdomínio de receção + registo MX) e o seu próprio segredo de
 * webhook (RESEND_INBOUND_WEBHOOK_SECRET), nenhum dos quais existe ainda.
 *
 * IMPORTANTE (decisão de negócio pendente, não técnica): dsprojects.pt já
 * é usado para o login real do Diogo (diogo@dsprojects.pt) e para o envio
 * transacional (notificacoes@dsprojects.pt), o que sugere que o domínio já
 * tem MX próprio para correio real (ex.: Google Workspace). Adicionar um
 * MX do Resend ao domínio raiz partiria esse correio existente — a Resend
 * recomenda por isso um subdomínio dedicado (ex.: inbox.dsprojects.pt) só
 * para receção. Esta escolha de subdomínio + as credenciais ficam para o
 * Diogo decidir; este ficheiro só prepara o lado do código, que fica
 * inerte (nunca é chamado) até isso existir.
 *
 * Mesmo padrão defensivo de src/lib/whatsapp.ts e src/lib/hubspot.ts:
 * nunca lança exceção — falhas ficam registadas em log, nunca derrubam o
 * pedido do webhook.
 */

export interface InboundEmailPayload {
  resendEmailId: string;
  from: string;
  to: string[];
  subject: string | null;
  text: string | null;
  html: string | null;
}

/** Extrai só o endereço de "Nome <email@dominio.pt>" ou de um endereço simples. */
function normalizeEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

export interface RecordInboundEmailResult {
  ok: boolean;
  duplicate?: boolean;
  clientMatched?: boolean;
  error?: string;
}

/**
 * Regista um email recebido: encontra ou cria a EmailThread pelo endereço
 * do remetente, tenta associar automaticamente a um Client existente com
 * o mesmo email (nunca cria um Client novo só a partir de um email — mesma
 * regra já aplicada ao WhatsApp, que só associa, não inventa registos
 * comerciais novos a partir de um único canal de contacto).
 */
export async function recordInboundEmail(payload: InboundEmailPayload): Promise<RecordInboundEmailResult> {
  try {
    const fromAddress = normalizeEmail(payload.from);
    if (!fromAddress) {
      return { ok: false, error: "remetente_em_falta" };
    }
    const toAddress = payload.to[0] ? normalizeEmail(payload.to[0]) : "";

    const already = await prisma.emailMessage.findUnique({
      where: { resendEmailId: payload.resendEmailId },
    });
    if (already) {
      return { ok: true, duplicate: true };
    }

    const matchingClient = await prisma.client.findFirst({ where: { email: fromAddress } });

    const thread = await prisma.emailThread.upsert({
      where: { participantEmail: fromAddress },
      update: { clientId: matchingClient?.id, lastMessageAt: new Date() },
      create: { participantEmail: fromAddress, clientId: matchingClient?.id, lastMessageAt: new Date() },
    });

    await prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        direction: "INBOUND",
        resendEmailId: payload.resendEmailId,
        subject: payload.subject,
        bodyText: payload.text,
        bodyHtml: payload.html,
        fromAddress,
        toAddress,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "EMAIL_RECEIVED",
        entity: "EmailThread",
        entityId: thread.id,
        meta: matchingClient ? `clientId=${matchingClient.id}` : "sem cliente associado",
      },
    });

    return { ok: true, clientMatched: !!matchingClient };
  } catch (error) {
    console.error("[email-inbound] Falha ao registar email recebido:", error);
    return { ok: false, error: error instanceof Error ? error.message : "erro_desconhecido" };
  }
}
