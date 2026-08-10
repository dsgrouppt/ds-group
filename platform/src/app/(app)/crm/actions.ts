"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { DEAL_STAGE_ORDER, LEAD_SOURCE, PROJECT_TYPE, BUDGET_RANGE } from "@/lib/enums";
import { parseOptionalMoney } from "@/lib/money";

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

  await prisma.deal.create({
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

  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "Deal" } });

  revalidatePath("/crm");
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
export async function advanceDealStage(dealId: string, formData: FormData) {
  const user = await requireModuleAccess("crm");
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para alterar negócios.");
  }
  const nextStage = String(formData.get("nextStage") ?? "");
  if (!DEAL_STAGE_ORDER.includes(nextStage as (typeof DEAL_STAGE_ORDER)[number])) {
    throw new Error("Etapa inválida.");
  }

  await prisma.$transaction(async (tx) => {
    const deal = await tx.deal.update({ where: { id: dealId }, data: { stage: nextStage } });

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

    await tx.activityLog.create({
      data: { userId: user.id, action: "STAGE_CHANGE", entity: "Deal", entityId: dealId },
    });
  });

  revalidatePath("/crm");
  revalidatePath("/obras");
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
