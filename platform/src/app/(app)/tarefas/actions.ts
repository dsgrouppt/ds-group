"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { TASK_STATUS_LABEL, TASK_PRIORITY_LABEL } from "@/lib/enums";

const TaskSchema = z.object({
  title: z.string().min(2, "Título demasiado curto").max(150),
  description: z.string().max(5000).optional(),
  status: z.string().max(40),
  priority: z.string().max(40),
  dueAt: z.string().max(40).optional(),
  assigneeId: z.string().max(50).optional(),
  dealId: z.string().max(50).optional(),
  projectId: z.string().max(50).optional(),
});

export async function createTask(formData: FormData) {
  const user = await requireModuleAccess("tarefas");
  if (!can(user.role, "tarefas", "edit")) {
    throw new Error("Sem permissão para criar tarefas.");
  }

  const parsed = TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt"),
    assigneeId: formData.get("assigneeId"),
    dealId: formData.get("dealId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.status in TASK_STATUS_LABEL) || !(data.priority in TASK_PRIORITY_LABEL)) {
    throw new Error("Estado ou prioridade inválidos.");
  }

  await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      priority: data.priority,
      dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
      assigneeId: data.assigneeId || undefined,
      dealId: data.dealId || undefined,
      projectId: data.projectId || undefined,
      createdById: user.id,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "Task" } });

  revalidatePath("/tarefas");
  redirect("/tarefas");
}

export async function updateTask(taskId: string, formData: FormData) {
  const user = await requireModuleAccess("tarefas");
  if (!can(user.role, "tarefas", "edit")) {
    throw new Error("Sem permissão para editar tarefas.");
  }

  const parsed = TaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    dueAt: formData.get("dueAt"),
    assigneeId: formData.get("assigneeId"),
    dealId: formData.get("dealId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.status in TASK_STATUS_LABEL) || !(data.priority in TASK_PRIORITY_LABEL)) {
    throw new Error("Estado ou prioridade inválidos.");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      assigneeId: data.assigneeId || null,
      dealId: data.dealId || null,
      projectId: data.projectId || null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Task", entityId: taskId } });

  revalidatePath("/tarefas");
  revalidatePath(`/tarefas/${taskId}`);
}

export async function deleteTask(taskId: string, formData: FormData) {
  const user = await requireModuleAccess("tarefas");
  void formData;
  if (!can(user.role, "tarefas", "edit")) {
    throw new Error("Sem permissão para apagar tarefas.");
  }

  await prisma.task.delete({ where: { id: taskId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "Task", entityId: taskId } });

  revalidatePath("/tarefas");
  redirect("/tarefas");
}

export async function addComment(taskId: string, formData: FormData) {
  const user = await requireModuleAccess("tarefas");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Escreva um comentário antes de enviar.");
  }
  if (body.length > 3000) {
    throw new Error("Comentário demasiado longo (máx. 3000 caracteres).");
  }

  await prisma.taskComment.create({ data: { taskId, authorId: user.id, body } });

  revalidatePath(`/tarefas/${taskId}`);
}
