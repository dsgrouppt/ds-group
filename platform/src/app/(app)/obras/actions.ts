"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PROJECT_TYPE, PROJECT_STAGE_ORDER } from "@/lib/enums";
import { parseOptionalMoney } from "@/lib/money";

const ProjectSchema = z.object({
  title: z.string().min(2, "Título demasiado curto").max(150),
  clientId: z.string().min(1, "Selecione um cliente").max(50),
  serviceType: z.nativeEnum(PROJECT_TYPE),
  location: z.string().max(150).optional(),
  startDate: z.string().max(40).optional(),
  dueDate: z.string().max(40).optional(),
  budgetAmount: z.string().max(30).optional(),
  costAmount: z.string().max(30).optional(),
});

export async function createProject(formData: FormData) {
  const user = await requireModuleAccess("obras");
  if (!can(user.role, "obras", "edit")) {
    throw new Error("Sem permissão para criar obras.");
  }

  const parsed = ProjectSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    serviceType: formData.get("serviceType"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    dueDate: formData.get("dueDate"),
    budgetAmount: formData.get("budgetAmount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  await prisma.project.create({
    data: {
      title: data.title,
      clientId: data.clientId,
      serviceType: data.serviceType,
      location: data.location || undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      budgetAmount: parseOptionalMoney(data.budgetAmount, "Orcamento"),
      costAmount: parseOptionalMoney(data.costAmount, "Custo"),
      ownerId: user.id,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "Project" } });

  revalidatePath("/obras");
  redirect("/obras");
}

export async function advanceProjectStage(projectId: string, formData: FormData) {
  const user = await requireModuleAccess("obras");
  if (!can(user.role, "obras", "edit")) {
    throw new Error("Sem permissão para alterar obras.");
  }
  const nextStage = String(formData.get("nextStage") ?? "");
  if (!PROJECT_STAGE_ORDER.includes(nextStage as (typeof PROJECT_STAGE_ORDER)[number])) {
    throw new Error("Etapa inválida.");
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      stage: nextStage,
      deliveredAt: nextStage === "ENTREGUE" ? new Date() : undefined,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "STAGE_CHANGE", entity: "Project", entityId: projectId } });

  revalidatePath("/obras");
}

export async function updateProject(projectId: string, formData: FormData) {
  const user = await requireModuleAccess("obras");
  if (!can(user.role, "obras", "edit")) {
    throw new Error("Sem permissão para editar obras.");
  }

  const parsed = ProjectSchema.safeParse({
    title: formData.get("title"),
    clientId: formData.get("clientId"),
    serviceType: formData.get("serviceType"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    dueDate: formData.get("dueDate"),
    budgetAmount: formData.get("budgetAmount"),
    costAmount: formData.get("costAmount"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  await prisma.project.update({
    where: { id: projectId },
    data: {
      title: data.title,
      clientId: data.clientId,
      serviceType: data.serviceType,
      location: data.location || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      budgetAmount: parseOptionalMoney(data.budgetAmount, "Orcamento") ?? null,
      costAmount: parseOptionalMoney(data.costAmount, "Custo") ?? null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Project", entityId: projectId } });

  revalidatePath("/obras");
  revalidatePath(`/obras/${projectId}`);
}

export async function deleteProject(projectId: string, formData: FormData) {
  const user = await requireModuleAccess("obras");
  void formData;
  if (!can(user.role, "obras", "edit")) {
    throw new Error("Sem permissão para apagar obras.");
  }

  const invoiceCount = await prisma.invoice.count({ where: { projectId } });
  if (invoiceCount > 0) {
    throw new Error("Não é possível apagar uma obra com faturas associadas.");
  }

  await prisma.project.delete({ where: { id: projectId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "Project", entityId: projectId } });

  revalidatePath("/obras");
  redirect("/obras");
}
