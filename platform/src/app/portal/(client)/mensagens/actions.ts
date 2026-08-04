"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/client-session";
import { getOwnedProject } from "@/lib/portal-data";

const MessageSchema = z.object({
  projectId: z.string().min(1),
  body: z.string().min(1, "A mensagem não pode estar vazia.").max(4000),
});

export async function sendClientMessage(formData: FormData) {
  const client = await requireClient();

  const parsed = MessageSchema.safeParse({
    projectId: formData.get("projectId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  // Confirma pertença do projeto antes de escrever — ver nota de
  // segurança em src/lib/portal-data.ts. Sem isto, um cliente autenticado
  // poderia enviar (e ler) mensagens de outro cliente só por adivinhar o
  // `projectId` num campo escondido do formulário.
  const project = await getOwnedProject(parsed.data.projectId, client.id);
  if (!project) {
    throw new Error("Projeto não encontrado.");
  }

  await prisma.clientMessage.create({
    data: {
      projectId: project.id,
      clientId: client.id,
      authorType: "CLIENTE",
      authorName: client.name ?? client.email ?? "Cliente",
      body: parsed.data.body.trim(),
      readByClient: true,
      readByTeam: false,
    },
  });

  revalidatePath("/portal/mensagens");
}
