"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { DEAL_STAGE_ORDER, LEAD_SOURCE, PROJECT_TYPE, BUDGET_RANGE, LOSS_REASON, REACTIVATION_DAYS } from "@/lib/enums";
import { parseOptionalMoney } from "@/lib/money";
import { firstContactDueAt } from "@/lib/sla";
import { qualificationScoreTotal, qualificationCategoryFromScore, parseQualificationInput } from "@/lib/qualification";
import { notifyLeadNovo, notifyPropostaEnviada, notifyPropostaAceite, notifyPropostaRecusada } from "@/lib/notifications";
import { sendCapiEvent } from "@/lib/meta-capi";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Títulos e prazos da cadência de follow-up pós-proposta — doc
 * 05_Processo_Comercial_Operacional_DS.md §5 (tabela D+1 a D+21).
 */
const PROPOSAL_FOLLOWUPS = [
  { days: 1, title: "Follow-up D+1 — Confirmar receção da proposta", description: "Canal: Telefone. Confirmar que a proposta foi recebida e está clara." },
  { days: 3, title: "Follow-up D+3 — Perceber dúvidas ou objeções", description: "Canal: WhatsApp + oferta de chamada. Perceber se há dúvidas ou objeções concretas." },
  { days: 7, title: "Follow-up D+7 — Reforçar valor", description: "Canal: Telefone. Reforçar valor (não pressionar preço); perguntar se falta alguma informação." },
  { days: 14, title: "Follow-up D+14 — Última verificação ativa", description: "Canal: Telefone ou WhatsApp. Perceber se a decisão está tomada, adiada ou perdida para a concorrência." },
  { days: 21, title: "Follow-up D+21 — Encerramento formal", description: "Canal: Email. Encerramento formal e educado, deixando a porta aberta. Se não houve avanço, fecha como Fechado Perdido." },
] as const;

const DealSchema = z.object({
  title: z.string().min(2, "Título demasiado curto").max(150),
  clientId: z.string().min(1, "Selecione um cliente").max(50),
  source: z.nativeEnum(LEAD_SOURCE),
  projectType: z.nativeEnum(PROJECT_TYPE),
  budgetRange: z.string().max(60).optional(),
  amount: z.string().max(30).optional(),
  notes: z.string().max(5000).optional(),
});

export async function createDeal(formData: FormData) {
  const user = await requireModuleAccess("crm");
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para criar negócios.");
  }

  const parsed = DealSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    source: formData.get("source"),
    projectType: formData.get("projectType"),
    budgetRange: formData.get("budgetRange"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const data = parsed.data;

  /**
   * Automação "Primeiro Contacto" (doc 05 §1.1/§7.2, Fase 2 da auditoria):
   * ao criar um Deal, cria-se sempre a tarefa de primeiro contacto com o
   * prazo do SLA aprovado (15 min em horário comercial, 2h fora dele — ver
   * src/lib/sla.ts). Mesma criação + registo de auditoria numa única
   * transação, seguindo o padrão já usado em advanceDealStage/deleteDeal
   * neste ficheiro (nunca ficar com o Deal criado sem a tarefa, ou
   * vice-versa).
   */
  const now = new Date();
  const primeiroContactoDueAt = firstContactDueAt(now);
  const dealId = await prisma.$transaction(async (tx) => {
    const deal = await tx.deal.create({
      data: {
        title: data.title,
        clientId: data.clientId,
        source: data.source,
        projectType: data.projectType,
        budgetRange: data.budgetRange && data.budgetRange in BUDGET_RANGE ? data.budgetRange : undefined,
        amount: parseOptionalMoney(data.amount, "Valor proposto"),
        notes: data.notes || undefined,
        ownerId: user.id,
      },
    });

    await tx.task.create({
      data: {
        title: "Primeiro Contacto",
        description: "SLA: 15 min em horário comercial (seg-sex, 09:00-19:00) / 2h fora desse horário.",
        priority: "URGENTE",
        dueAt: primeiroContactoDueAt,
        assigneeId: deal.ownerId ?? undefined,
        dealId: deal.id,
        createdById: user.id,
      },
    });

    await tx.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "Deal", entityId: deal.id } });

    return deal.id;
  });

  // Notificação "Lead Novo" (Fase 4, doc 05 §7.4) — deliberadamente FORA da
  // transação: uma chamada de rede (envio de email) nunca deve poder
  // prender ou reverter uma escrita na base de dados já confirmada. Se o
  // envio falhar, o negócio e a tarefa continuam criados normalmente — só
  // o alerta é que fica em falta (e o próprio SLA de risco/violado, via
  // verificação periódica, acaba por cobrir o mesmo caso pouco depois).
  await notifyLeadNovo({
    dealId,
    dealTitle: data.title,
    assigneeEmail: user.email,
    assigneeName: user.name,
    dueAt: primeiroContactoDueAt,
  });

  revalidatePath("/crm");
  revalidatePath("/tarefas");
  redirect("/crm");
}

/**
 * Bug #11 (auditoria Fase C P2, ago/2026): esta funcao alterava o `stage`
 * do negocio e, quando a nova etapa era "FECHADO_GANHO", criava
 * automaticamente a Obra correspondente (automacao central do fluxo
 * CRM -> Obras, ver docs/crm-especificacao.md §6) -- mas eram duas escritas
 * distintas, sem transacao.
 *
 * Risco real: se o processo falhasse ou o pedido expirasse depois do
 * `deal.update` marcar o negocio como "FECHADO_GANHO" mas antes do
 * `project.create` correr, o negocio ficava permanentemente marcado como
 * ganho sem nunca gerar a Obra -- e como o controlo de avanco de etapa na
 * interface e condicionado pela etapa *atual*, deixava de existir forma de
 * voltar a despoletar a automacao. Perda silenciosa de uma Obra inteira,
 * sem qualquer erro visivel.
 *
 * Corrigido com `$transaction`: a mudanca de etapa, a criacao condicional
 * da Obra e o registo de auditoria sao agora atomicos -- ou acontecem
 * todos, ou nenhum acontece (e o negocio permanece na etapa anterior,
 * pronto para nova tentativa).
 */
/**
 * Bug #11 (ver nota histórica acima, preservada): mudança de etapa +
 * automações condicionais continuam atómicas via $transaction — mesma
 * garantia estendida agora às automações da Fase 2 (doc 05/06): tarefas de
 * follow-up ao entrar em "Proposta Enviada", exigência de lossReason +
 * tarefa de reativação ao fechar como perdido. Ou tudo acontece, ou nada.
 */
export async function advanceDealStage(dealId: string, formData: FormData) {
  const user = await requireModuleAccess("crm");
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para alterar negócios.");
  }
  const nextStage = String(formData.get("nextStage") ?? "");
  if (!DEAL_STAGE_ORDER.includes(nextStage as (typeof DEAL_STAGE_ORDER)[number])) {
    throw new Error("Etapa inválida.");
  }

  // Exigir lossReason ao fechar como perdido — doc 05 §1.8: "Informação
  // obrigatória: motivo de perda". Validado antes de abrir a transação
  // para falhar cedo com uma mensagem clara.
  let lossReason: string | undefined;
  if (nextStage === "FECHADO_PERDIDO") {
    const raw = String(formData.get("lossReason") ?? "");
    if (!(raw in LOSS_REASON)) {
      throw new Error("Selecione o motivo de perda antes de fechar o negócio como perdido.");
    }
    lossReason = raw;
  }

  const now = new Date();

  const outcome = await prisma.$transaction(async (tx) => {
    const before = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });

    const data: Prisma.DealUpdateInput = { stage: nextStage };

    // Etapa "Qualificação" (doc 05 §1.2, condição de entrada = primeiro
    // contacto já feito) — marca firstContactedAt na primeira vez que o
    // negócio chega aqui, para medir o SLA real de resposta (doc 05 §2).
    if (nextStage === "QUALIFICADO" && !before.firstContactedAt) {
      data.firstContactedAt = now;
    }

    if (nextStage === "FECHADO_PERDIDO" && lossReason) {
      data.lossReason = lossReason;
    }

    // include owner: necessário para as notificações da Fase 4 (doc 05
    // §7.4) enviadas depois da transação — evita uma query extra só para
    // obter o email do responsável pelo negócio.
    const deal = await tx.deal.update({ where: { id: dealId }, data, include: { owner: true, client: true } });

    // "Fechado — Ganho" cria automaticamente uma Obra, conforme
    // docs/crm-especificacao.md §6 (automação "Negócio marcado Fechado — Ganho").
    if (nextStage === "FECHADO_GANHO") {
      const existingProject = await tx.project.findUnique({ where: { dealId } });
      if (!existingProject) {
        await tx.project.create({
          data: {
            title: deal.title,
            clientId: deal.clientId,
            dealId: deal.id,
            serviceType: deal.projectType,
            budgetAmount: deal.amount ?? undefined,
            ownerId: deal.ownerId ?? undefined,
          },
        });
      }
    }

    // Ao entrar em "Proposta Enviada" (transição genuína, não repetida —
    // guard por `before.stage`): cria as 5 tarefas de follow-up D+1 a D+21
    // (doc 05 §5), com prazos calculados a partir de agora.
    if (nextStage === "PROPOSTA_ENVIADA" && before.stage !== "PROPOSTA_ENVIADA") {
      if (!deal.propostaEnviadaAt) {
        await tx.deal.update({ where: { id: dealId }, data: { propostaEnviadaAt: now } });
      }
      await tx.task.createMany({
        data: PROPOSAL_FOLLOWUPS.map((f) => ({
          title: f.title,
          description: f.description,
          dueAt: new Date(now.getTime() + f.days * DAY_MS),
          assigneeId: deal.ownerId ?? undefined,
          dealId: deal.id,
          createdById: user.id,
        })),
      });
    }

    // Ao fechar como perdido: se o motivo é elegível para recuperação
    // (doc 05 §1.8 + §7.2 — "sem resposta" ou "adiou projeto"), agenda um
    // único contacto de reativação (não uma nova cadência completa).
    if (nextStage === "FECHADO_PERDIDO" && lossReason) {
      const days = REACTIVATION_DAYS[lossReason as keyof typeof REACTIVATION_DAYS];
      if (days) {
        await tx.task.create({
          data: {
            title: `Reativação — Fechado Perdido (${lossReason === "SEM_RESPOSTA" ? "Sem Resposta" : "Adiou Projeto"})`,
            description: "Um único contacto de reativação (doc 05 §2) — não reabrir uma cadência completa de follow-up.",
            priority: "BAIXA",
            dueAt: new Date(now.getTime() + days * DAY_MS),
            assigneeId: deal.ownerId ?? undefined,
            dealId: deal.id,
            createdById: user.id,
          },
        });
      }
    }

    // meta="stage=X" — usado pelo Dashboard (Fase 3) para calcular "tempo
    // médio até fecho" sem precisar de um novo campo Deal.closedAt: a
    // primeira ocorrência de meta="stage=FECHADO_GANHO" para este negócio é
    // a data de fecho.
    await tx.activityLog.create({
      data: { userId: user.id, action: "STAGE_CHANGE", entity: "Deal", entityId: dealId, meta: `stage=${nextStage}` },
    });

    return {
      dealTitle: deal.title,
      ownerEmail: deal.owner?.email,
      ownerName: deal.owner?.name,
      isGenuineProposalTransition: nextStage === "PROPOSTA_ENVIADA" && before.stage !== "PROPOSTA_ENVIADA",
      // Meta CAPI (ago/2026) — dados do cliente + fbp/fbc guardados no
      // momento do lead (ver lead-intake/route.ts), reutilizados abaixo
      // para o evento de fecho de negócio (fora da transação).
      clientEmail: deal.client?.email,
      clientPhone: deal.client?.phone,
      metaFbp: deal.metaFbp,
      metaFbc: deal.metaFbc,
      amount: deal.amount,
    };
  });

  // Notificações da Fase 4 (doc 05 §7.4) — deliberadamente FORA da
  // transação, pelo mesmo motivo documentado em createDeal acima (uma
  // chamada de rede nunca deve poder prender/reverter uma escrita já
  // confirmada na base de dados).
  if (nextStage === "PROPOSTA_ENVIADA" && outcome.isGenuineProposalTransition) {
    await notifyPropostaEnviada({ dealId, dealTitle: outcome.dealTitle, ownerEmail: outcome.ownerEmail, ownerName: outcome.ownerName });
  } else if (nextStage === "FECHADO_GANHO") {
    await notifyPropostaAceite({ dealId, dealTitle: outcome.dealTitle, ownerEmail: outcome.ownerEmail, ownerName: outcome.ownerName });

    // Evento Meta CAPI "NegocioGanho" (ago/2026) — sem equivalente no
    // Pixel do browser (esta transição acontece aqui dentro do DS OS, não
    // no site público), por isso sem event_id/dedup: é um evento só-CAPI.
    // action_source "system_generated" porque a origem é uma ação interna
    // da equipa, não uma visita ao site. Reutiliza fbp/fbc guardados no
    // Deal desde o momento do lead original para manter a ligação à
    // campanha/clique que gerou o negócio. Falha silenciosa, como todas as
    // integrações externas neste ficheiro — nunca bloqueia o fecho do
    // negócio em si.
    const capiResult = await sendCapiEvent({
      eventName: "NegocioGanho",
      actionSource: "system_generated",
      userData: {
        email: outcome.clientEmail ?? undefined,
        phone: outcome.clientPhone ?? undefined,
        fbp: outcome.metaFbp ?? undefined,
        fbc: outcome.metaFbc ?? undefined,
      },
      customData: outcome.amount ? { value: outcome.amount, currency: "EUR" } : undefined,
    });
    if (!capiResult.ok) {
      console.error("[crm] Evento CAPI \"NegocioGanho\" não enviado:", capiResult.error);
    }
  } else if (nextStage === "FECHADO_PERDIDO") {
    await notifyPropostaRecusada({ dealId, dealTitle: outcome.dealTitle, ownerEmail: outcome.ownerEmail, ownerName: outcome.ownerName, lossReason });
  }

  revalidatePath("/crm");
  revalidatePath("/obras");
  revalidatePath("/tarefas");
  revalidatePath(`/crm/${dealId}`);
}

/**
 * Regista o resultado do formulário de qualificação (doc 05 §3) — 5
 * critérios de 0/1/2 pontos, score total e categoria calculados em
 * src/lib/qualification.ts. Ação separada de advanceDealStage porque a
 * qualificação é uma avaliação (pode ser refeita), não uma transição de
 * etapa — o comercial pode reavaliar um negócio sem o mover de estado.
 */
export async function submitQualification(dealId: string, formData: FormData) {
  const user = await requireModuleAccess("crm");
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para qualificar negócios.");
  }

  const input = parseQualificationInput(formData);
  const score = qualificationScoreTotal(input);
  const category = qualificationCategoryFromScore(score);

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: { qualificationScore: score, qualificationCategory: category },
    });
    await tx.activityLog.create({
      data: { userId: user.id, action: "QUALIFICATION", entity: "Deal", entityId: dealId, meta: `score=${score};categoria=${category}` },
    });
  });

  revalidatePath(`/crm/${dealId}`);
}

export async function updateDeal(dealId: string, formData: FormData) {
  const user = await requireModuleAccess("crm");
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para editar negócios.");
  }

  const parsed = DealSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    source: formData.get("source"),
    projectType: formData.get("projectType"),
    budgetRange: formData.get("budgetRange"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      title: data.title,
      clientId: data.clientId,
      source: data.source,
      projectType: data.projectType,
      budgetRange: data.budgetRange && data.budgetRange in BUDGET_RANGE ? data.budgetRange : null,
      amount: parseOptionalMoney(data.amount, "Valor proposto") ?? null,
      notes: data.notes || null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Deal", entityId: dealId } });

  revalidatePath("/crm");
  revalidatePath(`/crm/${dealId}`);
}

/**
 * Bug #12 (auditoria Fase C P2, ago/2026): o guard "nao apagar negocio com
 * obra associada" lia `project.findUnique({dealId})` e so depois apagava
 * o Deal -- sem transacao. Se `advanceDealStage` criasse a Obra
 * exatamente na janela entre a verificacao e o delete, o Deal podia ser
 * apagado com uma Obra orfa a apontar para um `dealId` inexistente (risco
 * MEDIUM: o schema torna este cenario raro porque `Project.dealId` e
 * unico, mas a janela de tempo existe). Corrigido movendo a verificacao
 * para dentro da mesma `$transaction` que o delete.
 */
export async function deleteDeal(dealId: string, formData: FormData) {
  const user = await requireModuleAccess("crm");
  void formData;
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para apagar negócios.");
  }

  await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { dealId } });
    if (project) {
      throw new Error("Não é possível apagar um negócio que já gerou uma obra.");
    }

    await tx.deal.delete({ where: { id: dealId } });
    await tx.activityLog.create({
      data: { userId: user.id, action: "DELETE", entity: "Deal", entityId: dealId },
    });
  });

  revalidatePath("/crm");
  redirect("/crm");
}
