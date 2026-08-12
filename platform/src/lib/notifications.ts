import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { DEAL_STAGE_LABEL, LOSS_REASON_LABEL, type LossReasonValue } from "./enums";

const APP_URL = process.env.NEXTAUTH_URL || "https://os.dsprojects.pt";

function dealLink(dealId: string): string {
  return `${APP_URL}/crm/${dealId}`;
}

function wrap(title: string, bodyHtml: string, ctaLabel: string, ctaHref: string): string {
  return `<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto;">
<h2 style="color:#1a1a1a;">${title}</h2>
${bodyHtml}
<p style="margin-top:24px;"><a href="${ctaHref}" style="background:#1a1a1a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">${ctaLabel}</a></p>
<p style="color:#888;font-size:12px;margin-top:32px;">DS OS — notificação automática (doc 05_Processo_Comercial_Operacional_DS.md §7.4).</p>
</div>`;
}

/**
 * Cada função "notifyX" abaixo é chamada nos pontos de gatilho já
 * existentes em crm/actions.ts (imediato, sem cron) ou pela verificação
 * periódica em runScheduledNotificationChecks (SLA/follow-up, que dependem
 * de tempo decorrido, não de uma ação do utilizador). Todas gravam um
 * `Notification` só depois de confirmado o envio (sent=true) — se o envio
 * falhar (ex.: RESEND_API_KEY não configurada), não fica registo, e a
 * próxima verificação tenta novamente. Isto é intencional: preferimos um
 * alerta atrasado a um alerta silenciosamente nunca reenviado depois de
 * uma falha transitória.
 */

export async function notifyLeadNovo(params: { dealId: string; dealTitle: string; assigneeEmail: string | null | undefined; assigneeName: string | null | undefined; dueAt: Date }) {
  const html = wrap(
    "Novo lead atribuído — Primeiro Contacto",
    `<p>Olá${params.assigneeName ? ` ${params.assigneeName}` : ""},</p>
     <p>Foi-lhe atribuído o negócio <strong>${params.dealTitle}</strong>. A tarefa "Primeiro Contacto" tem de ser concluída até <strong>${params.dueAt.toLocaleString("pt-PT")}</strong> (SLA aprovado: 15 min em horário comercial / 2h fora dele — doc 05 §2).</p>
     <p>Script sugerido (doc 05 §6.1): <em>"Boa tarde, [Nome], fala [o seu nome]. Vi que nos contactou sobre um projeto de remodelação em [localização/tipo de obra]. Tem 2 minutos para me contar um pouco mais sobre o que tem em mente?"</em></p>`,
    "Ver negócio no DS OS",
    dealLink(params.dealId)
  );
  const text = `Novo lead atribuído: ${params.dealTitle}. Primeiro Contacto até ${params.dueAt.toLocaleString("pt-PT")}. ${dealLink(params.dealId)}`;
  const result = await sendEmail(params.assigneeEmail, `Novo lead: ${params.dealTitle} — Primeiro Contacto até ${params.dueAt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`, html, text);
  if (result.sent && params.assigneeEmail) {
    await prisma.notification.create({ data: { type: "LEAD_NOVO", dealId: params.dealId, sentTo: params.assigneeEmail } });
  }
  return result;
}

export async function notifyPropostaEnviada(params: { dealId: string; dealTitle: string; ownerEmail: string | null | undefined; ownerName: string | null | undefined }) {
  const html = wrap(
    "Proposta enviada — cadência de follow-up iniciada",
    `<p>A proposta do negócio <strong>${params.dealTitle}</strong> foi marcada como enviada. As 5 tarefas de follow-up (D+1, D+3, D+7, D+14, D+21 — doc 05 §5) foram criadas automaticamente e vai receber um alerta em cada uma, no dia em que ficar devida.</p>`,
    "Ver negócio no DS OS",
    dealLink(params.dealId)
  );
  const text = `Proposta enviada: ${params.dealTitle}. Cadência de follow-up D+1..D+21 iniciada. ${dealLink(params.dealId)}`;
  const result = await sendEmail(params.ownerEmail, `Proposta enviada: ${params.dealTitle}`, html, text);
  if (result.sent && params.ownerEmail) {
    await prisma.notification.create({ data: { type: "PROPOSTA_ENVIADA", dealId: params.dealId, sentTo: params.ownerEmail } });
  }
  return result;
}

export async function notifyPropostaAceite(params: { dealId: string; dealTitle: string; ownerEmail: string | null | undefined; ownerName: string | null | undefined }) {
  const html = wrap(
    "Negócio Fechado — Ganho",
    `<p>Parabéns! O negócio <strong>${params.dealTitle}</strong> foi fechado como Ganho. A Obra correspondente já foi criada automaticamente em Obras — agende a reunião de arranque (doc 05 §1.7).</p>`,
    "Ver negócio no DS OS",
    dealLink(params.dealId)
  );
  const text = `Fechado — Ganho: ${params.dealTitle}. ${dealLink(params.dealId)}`;
  const result = await sendEmail(params.ownerEmail, `Fechado — Ganho: ${params.dealTitle}`, html, text);
  if (result.sent && params.ownerEmail) {
    await prisma.notification.create({ data: { type: "PROPOSTA_ACEITE", dealId: params.dealId, sentTo: params.ownerEmail } });
  }
  return result;
}

export async function notifyPropostaRecusada(params: { dealId: string; dealTitle: string; ownerEmail: string | null | undefined; ownerName: string | null | undefined; lossReason: string | null | undefined }) {
  const reasonLabel = params.lossReason && params.lossReason in LOSS_REASON_LABEL ? LOSS_REASON_LABEL[params.lossReason as LossReasonValue] : params.lossReason || "não especificado";
  const html = wrap(
    "Negócio Fechado — Perdido",
    `<p>O negócio <strong>${params.dealTitle}</strong> foi fechado como Perdido. Motivo: <strong>${reasonLabel}</strong>.</p>
     <p>Se o motivo for elegível ("Sem resposta" ou "Adiou projeto"), uma tarefa de reativação automática já foi agendada (doc 05 §1.8 / §7.2).</p>`,
    "Ver negócio no DS OS",
    dealLink(params.dealId)
  );
  const text = `Fechado — Perdido: ${params.dealTitle}. Motivo: ${reasonLabel}. ${dealLink(params.dealId)}`;
  const result = await sendEmail(params.ownerEmail, `Fechado — Perdido: ${params.dealTitle} (${reasonLabel})`, html, text);
  if (result.sent && params.ownerEmail) {
    await prisma.notification.create({ data: { type: "PROPOSTA_RECUSADA", dealId: params.dealId, sentTo: params.ownerEmail } });
  }
  return result;
}

const SLA_RISK_WINDOW_MINUTES = 10;

/**
 * Verificação periódica (chamada por /api/internal/notifications-check,
 * disparado por um cron da Railway a cada 5 min — ver
 * docs/notificacoes-runbook.md). Cobre os dois tipos de alerta que
 * dependem de tempo decorrido, não de uma ação do utilizador:
 *
 * 1. SLA de "Primeiro Contacto" em risco (faltam ≤10 min) ou violado (já
 *    passou o prazo) — doc 05 §7.4.
 * 2. Follow-up do dia (D+1..D+21) — tarefa cujo prazo já chegou.
 *
 * Idempotência: cada alerta só é considerado "já enviado" se existir um
 * `Notification` desse type+taskId — nunca reenviado. SLA_RISCO e
 * SLA_VIOLADO são tipos distintos porque uma mesma tarefa passa pelos
 * dois estados em sequência (risco primeiro, violado depois, se
 * ninguém agir a tempo) e ambos merecem um alerta próprio.
 */
export async function runScheduledNotificationChecks(now: Date = new Date()) {
  const summary = { slaRisco: 0, slaViolado: 0, followupDue: 0, errors: [] as string[] };

  const riskThreshold = new Date(now.getTime() + SLA_RISK_WINDOW_MINUTES * 60_000);

  const pendingContactTasks = await prisma.task.findMany({
    where: {
      title: "Primeiro Contacto",
      status: { in: ["PENDENTE", "EM_CURSO"] },
      dueAt: { not: null, lte: riskThreshold },
    },
    include: { assignee: true, deal: true },
  });

  for (const task of pendingContactTasks) {
    if (!task.dueAt || !task.deal) continue;
    const violated = task.dueAt.getTime() <= now.getTime();
    const type = violated ? "SLA_VIOLADO" : "SLA_RISCO";

    const already = await prisma.notification.findFirst({ where: { type, taskId: task.id } });
    if (already) continue;

    const html = wrap(
      violated ? "SLA de Primeiro Contacto violado" : "SLA de Primeiro Contacto em risco",
      `<p>O negócio <strong>${task.deal.title}</strong> tem a tarefa "Primeiro Contacto" ${violated ? `<strong>com o prazo já ultrapassado</strong> (era ${task.dueAt.toLocaleString("pt-PT")})` : `a expirar às <strong>${task.dueAt.toLocaleString("pt-PT")}</strong>`}. Aja agora.</p>`,
      "Ver negócio no DS OS",
      dealLink(task.dealId!)
    );
    const text = `${violated ? "SLA violado" : "SLA em risco"}: ${task.deal.title}. ${dealLink(task.dealId!)}`;
    const result = await sendEmail(
      task.assignee?.email,
      `${violated ? "SLA VIOLADO" : "SLA em risco"}: ${task.deal.title}`,
      html,
      text
    );
    if (result.sent && task.assignee?.email) {
      await prisma.notification.create({ data: { type, taskId: task.id, dealId: task.dealId, sentTo: task.assignee.email } });
      if (violated) summary.slaViolado++; else summary.slaRisco++;
    } else if (!result.sent && result.reason !== "resend_nao_configurado" && result.reason !== "sem_destinatario") {
      summary.errors.push(`${type} task=${task.id}: ${result.reason}`);
    }
  }

  const dueFollowups = await prisma.task.findMany({
    where: {
      title: { startsWith: "Follow-up D+" },
      status: { in: ["PENDENTE", "EM_CURSO"] },
      dueAt: { not: null, lte: now },
    },
    include: { assignee: true, deal: true },
  });

  for (const task of dueFollowups) {
    if (!task.deal) continue;
    const already = await prisma.notification.findFirst({ where: { type: "FOLLOWUP_DUE", taskId: task.id } });
    if (already) continue;

    const html = wrap(
      `Follow-up devido: ${task.title}`,
      `<p>O negócio <strong>${task.deal.title}</strong> tem um follow-up devido hoje: <strong>${task.title}</strong>.</p>
       ${task.description ? `<p>${task.description}</p>` : ""}`,
      "Ver negócio no DS OS",
      dealLink(task.dealId!)
    );
    const text = `Follow-up devido: ${task.title} — ${task.deal.title}. ${dealLink(task.dealId!)}`;
    const result = await sendEmail(task.assignee?.email, `Follow-up devido: ${task.deal.title} — ${task.title}`, html, text);
    if (result.sent && task.assignee?.email) {
      await prisma.notification.create({ data: { type: "FOLLOWUP_DUE", taskId: task.id, dealId: task.dealId, sentTo: task.assignee.email } });
      summary.followupDue++;
    } else if (!result.sent && result.reason !== "resend_nao_configurado" && result.reason !== "sem_destinatario") {
      summary.errors.push(`FOLLOWUP_DUE task=${task.id}: ${result.reason}`);
    }
  }

  return summary;
}
