"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { EVENT_TYPE_LABEL } from "@/lib/enums";

const EventSchema = z.object({
  title: z.string().min(2, "Título demasiado curto").max(150),
  type: z.string().max(40),
  startAt: z.string().min(1, "Data/hora obrigatória").max(40),
  endAt: z.string().max(40).optional(),
  projectId: z.string().max(50).optional(),
  location: z.string().max(150).optional(),
  notes: z.string().max(5000).optional(),
});

export async function createEvent(formData: FormData) {
  const user = await requireModuleAccess("agenda");
  if (!can(user.role, "agenda", "edit")) {
    throw new Error("Sem permissão para criar eventos.");
  }

  const parsed = EventSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    projectId: formData.get("projectId"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  if (!(data.type in EVENT_TYPE_LABEL)) {
    throw new Error("Tipo de evento inválido.");
  }

  await prisma.calendarEvent.create({
    data: {
      title: data.title,
      type: data.type,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : undefined,
      projectId: data.projectId || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "CREATE", entity: "CalendarEvent" } });

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function updateEvent(eventId: string, formData: FormData) {
  const user = await requireModuleAccess("agenda");
  if (!can(user.role, "agenda", "edit")) {
    throw new Error("Sem permissão para editar eventos.");
  }

  const parsed = EventSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    projectId: formData.get("projectId"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.type in EVENT_TYPE_LABEL)) {
    throw new Error("Tipo de evento inválido.");
  }

  await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: data.title,
      type: data.type,
      startAt: new Date(data.startAt),
      endAt: data.endAt ? new Date(data.endAt) : null,
      projectId: data.projectId || null,
      location: data.location || null,
      notes: data.notes || null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "CalendarEvent", entityId: eventId } });

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function deleteEvent(eventId: string, formData: FormData) {
  const user = await requireModuleAccess("agenda");
  void formData;
  if (!can(user.role, "agenda", "edit")) {
    throw new Error("Sem permissão para apagar eventos.");
  }

  await prisma.calendarEvent.delete({ where: { id: eventId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "CalendarEvent", entityId: eventId } });

  revalidatePath("/agenda");
  redirect("/agenda");
}
