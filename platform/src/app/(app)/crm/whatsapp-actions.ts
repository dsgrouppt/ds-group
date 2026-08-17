"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

/**
 * Server action de envio de WhatsApp a partir do DS OS (execução urgente,
 * ago/2026 — "META LEADS + WHATSAPP + CENTRALIZAÇÃO DS OS", Prioridade 2:
 * "possibilidade de iniciar mensagens autorizadas").
 *
 * Não existe ainda um ecrã dedicado de conversa (ficou fora do alcance
 * razoável desta ronda — ver relatório final) — esta action está pronta
 * para ser chamada a partir de um formulário simples na ficha do
 * Cliente/Negócio assim que essa UI for construída, e pode já ser testada
 * diretamente. Cada envio fica registado em WhatsAppMessage +
 * ActivityLog, mesmo que a mensagem em si falhe (falha também fica
 * registada, nunca é silenciosa).
 *
 * BLOQUEADO em produção até existirem WHATSAPP_ACCESS_TOKEN e
 * WHATSAPP_PHONE_NUMBER_ID (ver platform/src/lib/whatsapp.ts) — sem essas
 * variáveis, `sendWhatsAppMessage` devolve sempre `{ ok: false }` e esta
 * action lança erro claro, nunca finge sucesso.
 */

const SendSchema = z.object({
  clientId: z.string().min(1).max(50),
  phoneNumber: z.string().min(6).max(30),
  body: z.string().min(1).max(4096),
  dealId: z.string().max(50).optional(),
});

export async function sendWhatsAppToClient(input: { clientId: string; phoneNumber: string; body: string; dealId?: string }) {
  const user = await requireModuleAccess("crm");
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para enviar mensagens.");
  }

  const parsed = SendSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  const phoneNumber = data.phoneNumber.startsWith("+") ? data.phoneNumber : `+${data.phoneNumber}`;

  const conversation = await prisma.whatsAppConversation.upsert({
    where: { phoneNumber },
    update: { clientId: data.clientId, dealId: data.dealId },
    create: { phoneNumber, clientId: data.clientId, dealId: data.dealId },
  });

  const result = await sendWhatsAppMessage({ to: phoneNumber, body: data.body });

  await prisma.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      waMessageId: result.waMessageId,
      body: data.body,
      status: result.ok ? "ENVIADA" : "FALHOU",
      sentById: user.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: result.ok ? "WHATSAPP_SENT" : "WHATSAPP_SEND_FAILED",
      entity: "WhatsAppConversation",
      entityId: conversation.id,
      meta: result.ok ? undefined : result.error,
    },
  });

  revalidatePath("/crm");

  if (!result.ok) {
    throw new Error(`Falha ao enviar WhatsApp: ${result.error || "erro desconhecido"}`);
  }

  return { ok: true, waMessageId: result.waMessageId };
}
