"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CAMPAIGN_CHANNEL_LABEL } from "@/lib/enums";

const CampaignSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto").max(150),
  channel: z.string().max(40),
  budget: z.string().max(30).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  notes: z.string().max(5000).optional(),
});

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
      budget: data.budget ? Number(data.budget) : undefined,
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
      budget: data.budget ? Number(data.budget) : null,
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
