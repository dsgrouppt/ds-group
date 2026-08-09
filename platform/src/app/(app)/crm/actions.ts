"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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

export async function advanceDealStage(dealId: string, formData: FormData) {
  const user = await requireModuleAccess("crm");
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para alterar negócios.");
  }
  const nextStage = String(formData.get("nextStage") ?? "");
  if (!DEAL_STAGE_ORDER.includes(nextStage as (typeof DEAL_STAGE_ORDER)[number])) {
    throw new Error("Etapa inválida.");
  }

  await prisma.deal.update({ where: { id: dealId }, data: { stage: nextStage } });

  // "Fechado — Ganho" cria automaticamente uma Obra, conforme
  // docs/crm-especificacao.md §6 (automação "Negócio marcado Fechado — Ganho").
  if (nextStage === "FECHADO_GANHO") {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (deal) {
      const existingProject = await prisma.project.findUnique({ where: { dealId } });
      if (!existingProject) {
        await prisma.project.create({
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
  }

  await prisma.activityLog.create({ data: { userId: user.id, action: "STAGE_CHANGE", entity: "Deal", entityId: dealId } });

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

export async function deleteDeal(dealId: string, formData: FormData) {
  const user = await requireModuleAccess("crm");
  void formData;
  if (!can(user.role, "crm", "edit")) {
    throw new Error("Sem permissão para apagar negócios.");
  }

  const project = await prisma.project.findUnique({ where: { dealId } });
  if (project) {
    throw new Error("Não é possível apagar um negócio que já gerou uma obra.");
  }

  await prisma.deal.delete({ where: { id: dealId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "Deal", entityId: dealId } });

  revalidatePath("/crm");
  redirect("/crm");
}
