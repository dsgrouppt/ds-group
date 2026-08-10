"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CAMPAIGN_CHANNEL_LABEL } from "@/lib/enums";
import { parseOptionalMoney } from "@/lib/money";

const CampaignSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto").max(150),
  channel: z.string().max(40),
  budget: z.string().max(30).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  notes: z.string().max(5000).optional(),
});

/**
 * Bug #23 (auditoria adversarial independente, ago/2026): `budget` usava
 * `Number(data.budget)` diretamente, ao contrario de todos os outros
 * campos monetarios da plataforma (Invoice.amount, Payment.amount,
 * Deal.amount, Project.budgetAmount/costAmount), que passam por
 * `parseMoney`/`parseOptionalMoney` desde o Bug #7. `Number()` sem
 * validacao aceita negativos, `Infinity` e `NaN` -- e o Postgres `float8`
 * aceita `NaN` como valor valido, por isso um orcamento invalido nao
 * gerava erro, ficava silenciosamente gravado como NaN, corrompendo
 * qualquer soma/comparacao futura envolvendo orcamentos de campanhas.
 * Corrigido para usar `parseOptionalMoney`, tal como todos os outros
 * campos monetarios.
 */
export async function createCampaign(formData: FormData) {
  const user = await requireModuleAccess("marketing");
  if (!can(user.role, "marketing", "edit")) {
    throw new Error("Sem permissão para criar campanhas.");
  }

  const parsed = CampaignSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    budget: formData.get("budget"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  if (!(data.channel in CAMPAIGN_CHANNEL_LABEL)) {
    throw new Error("Canal inválido.");
  }

  await prisma.marketingCampaign.create({
    data: {
      name: data.name,
      channel: data.channel,
      budget: parseOptionalMoney(data.budget, "Orçamento") ?? undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      notes: data.notes || undefined,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "MarketingCampaign" } });

  revalidatePath("/marketing");
  redirect("/marketing");
}

export async function updateCampaign(campaignId: string, formData: FormData) {
  const user = await requireModuleAccess("marketing");
  if (!can(user.role, "marketing", "edit")) {
    throw new Error("Sem permissão para editar campanhas.");
  }

  const parsed = CampaignSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    budget: formData.get("budget"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.channel in CAMPAIGN_CHANNEL_LABEL)) {
    throw new Error("Canal inválido.");
  }

  const active = formData.get("active") === "on";

  await prisma.marketingCampaign.update({
    where: { id: campaignId },
    data: {
      name: data.name,
      channel: data.channel,
      budget: parseOptionalMoney(data.budget, "Orçamento") ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      notes: data.notes || null,
      active,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "MarketingCampaign", entityId: campaignId } });

  revalidatePath("/marketing");
  revalidatePath(`/marketing/${campaignId}`);
}

export async function deleteCampaign(campaignId: string, formData: FormData) {
  const user = await requireModuleAccess("marketing");
  void formData;
  if (!can(user.role, "marketing", "edit")) {
    throw new Error("Sem permissão para apagar campanhas.");
  }

  await prisma.marketingCampaign.delete({ where: { id: campaignId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "MarketingCampaign", entityId: campaignId } });

  revalidatePath("/marketing");
  redirect("/marketing");
}
