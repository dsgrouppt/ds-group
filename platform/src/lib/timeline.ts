import { prisma } from "@/lib/prisma";
import { TASK_STATUS_LABEL } from "@/lib/enums";

/**
 * Timeline única do cliente/negócio — execução urgente, ago/2026
 * ("META LEADS + WHATSAPP + CENTRALIZAÇÃO DS OS", Prioridade 3).
 *
 * Junta, por ordem cronológica, tudo o que já existe disperso por tabelas
 * diferentes: ActivityLog (criação, mudanças de fase, qualificação),
 * WhatsAppMessage (recebidas/enviadas) e Task (criação + estado). Não
 * inventa uma tabela nova — lê o que já está a ser escrito hoje pelo resto
 * do DS OS (crm/actions.ts, webhooks, whatsapp-actions.ts) e apresenta
 * como um único feed, por Deal e/ou por Client.
 *
 * O que NÃO está aqui ainda (ver relatório da execução desta ronda):
 *  - Propostas: não existe um model Proposal dedicado no schema — o envio
 *    de proposta é hoje só uma mudança de stage ("PROPOSTA_ENVIADA",
 *    capturada via ActivityLog action=STAGE_CHANGE) + anexos (Attachment).
 *    Anexos não estão incluídos nesta primeira versão da timeline.
 *  - Email: não existe ainda nenhum registo de email associado a
 *    Client/Deal no schema (ver Prioridade 6 do mesmo pedido) — quando essa
 *    associação existir, entra aqui como mais uma fonte.
 *  - Chamadas telefónicas: não há nenhum registo estruturado disto em lado
 *    nenhum do DS OS (nem antes desta ronda) — fora do alcance.
 */

export interface TimelineEvent {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE" | "STAGE_CHANGE" | "QUALIFICATION" | "WHATSAPP_IN" | "WHATSAPP_OUT" | "TASK";
  label: string;
  detail?: string;
  createdAt: Date;
  actor?: string;
}

const ACTIVITY_LABEL: Record<string, string> = {
  CREATE: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Removido",
  STAGE_CHANGE: "Mudança de fase do pipeline",
  QUALIFICATION: "Qualificação preenchida",
};

/**
 * Timeline de um negócio (Deal) — inclui também os eventos do Client
 * associado (ex.: criação da ficha de cliente), porque um negócio nunca
 * existe sem um cliente e o utilizador quer ver os dois juntos.
 */
export async function getDealTimeline(dealId: string, clientId: string): Promise<TimelineEvent[]> {
  const [activity, waConversations, tasks] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        OR: [
          { entity: "Deal", entityId: dealId },
          { entity: "Client", entityId: clientId },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.whatsAppConversation.findMany({
      where: { OR: [{ dealId }, { clientId }] },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 300,
          include: { sentBy: { select: { name: true } } },
        },
      },
    }),
    prisma.task.findMany({
      where: { dealId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const events: TimelineEvent[] = [];

  for (const log of activity) {
    events.push({
      id: `log-${log.id}`,
      type: (["CREATE", "UPDATE", "DELETE", "STAGE_CHANGE", "QUALIFICATION"].includes(log.action) ? log.action : "UPDATE") as TimelineEvent["type"],
      label: `${ACTIVITY_LABEL[log.action] ?? log.action} (${log.entity})`,
      detail: log.meta ?? undefined,
      createdAt: log.createdAt,
      actor: log.user?.name,
    });
  }

  for (const conv of waConversations) {
    for (const msg of conv.messages) {
      const isInbound = msg.direction === "INBOUND";
      events.push({
        id: `wa-${msg.id}`,
        type: isInbound ? "WHATSAPP_IN" : "WHATSAPP_OUT",
        label: isInbound
          ? `WhatsApp recebido de ${conv.waContactName || conv.phoneNumber}`
          : `WhatsApp enviado para ${conv.waContactName || conv.phoneNumber}`,
        detail: msg.body ?? (msg.templateName ? `Template: ${msg.templateName}` : undefined),
        createdAt: msg.createdAt,
        actor: msg.sentBy?.name,
      });
    }
  }

  for (const task of tasks) {
    events.push({
      id: `task-${task.id}`,
      type: "TASK",
      label: `Tarefa: ${task.title}`,
      detail: TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL] ?? task.status,
      createdAt: task.createdAt,
      actor: task.assignee?.name,
    });
  }

  events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return events;
}

/**
 * Timeline de um cliente (Client) — todos os negócios associados juntos,
 * usada na ficha do cliente (não apenas na ficha de um negócio específico).
 */
export async function getClientTimeline(clientId: string): Promise<TimelineEvent[]> {
  const [activity, waConversations, tasks] = await Promise.all([
    prisma.activityLog.findMany({
      where: { entity: "Client", entityId: clientId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.whatsAppConversation.findMany({
      where: { clientId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 300,
          include: { sentBy: { select: { name: true } } },
        },
      },
    }),
    prisma.task.findMany({
      where: { deal: { clientId } },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        assignee: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  const events: TimelineEvent[] = [];

  for (const log of activity) {
    events.push({
      id: `log-${log.id}`,
      type: (["CREATE", "UPDATE", "DELETE", "STAGE_CHANGE", "QUALIFICATION"].includes(log.action) ? log.action : "UPDATE") as TimelineEvent["type"],
      label: `${ACTIVITY_LABEL[log.action] ?? log.action} (Cliente)`,
      detail: log.meta ?? undefined,
      createdAt: log.createdAt,
      actor: log.user?.name,
    });
  }

  for (const conv of waConversations) {
    for (const msg of conv.messages) {
      const isInbound = msg.direction === "INBOUND";
      events.push({
        id: `wa-${msg.id}`,
        type: isInbound ? "WHATSAPP_IN" : "WHATSAPP_OUT",
        label: isInbound
          ? `WhatsApp recebido de ${conv.waContactName || conv.phoneNumber}`
          : `WhatsApp enviado para ${conv.waContactName || conv.phoneNumber}`,
        detail: msg.body ?? (msg.templateName ? `Template: ${msg.templateName}` : undefined),
        createdAt: msg.createdAt,
        actor: msg.sentBy?.name,
      });
    }
  }

  for (const task of tasks) {
    events.push({
      id: `task-${task.id}`,
      type: "TASK",
      label: `Tarefa: ${task.title}`,
      detail: TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL] ?? task.status,
      createdAt: task.createdAt,
      actor: task.assignee?.name,
    });
  }

  events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return events;
}
