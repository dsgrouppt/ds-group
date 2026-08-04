"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { can } from "@/lib/permissions";
import { CLIENT_TYPE } from "@/lib/enums";

const ClientSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto").max(150),
  email: z.string().email().max(190).optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  type: z.enum([CLIENT_TYPE.FAMILIA, CLIENT_TYPE.INVESTIDOR, CLIENT_TYPE.ARQUITETO_PARCEIRO]),
  location: z.string().max(150).optional(),
  notes: z.string().max(5000).optional(),
});

export async function createClient(formData: FormData) {
  const user = await requireModuleAccess("clientes");
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para criar clientes.");
  }

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    type: formData.get("type"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const data = parsed.data;

  await prisma.client.create({
    data: {
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      type: data.type,
      location: data.location || undefined,
      notes: data.notes || undefined,
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "CREATE", entity: "Client" },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateClient(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para editar clientes.");
  }

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    type: formData.get("type"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type,
      location: data.location || null,
      notes: data.notes || null,
    },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Client", entityId: clientId } });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteClient(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  void formData;
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para apagar clientes.");
  }

  const [dealCount, projectCount] = await Promise.all([
    prisma.deal.count({ where: { clientId } }),
    prisma.project.count({ where: { clientId } }),
  ]);
  if (dealCount > 0 || projectCount > 0) {
    throw new Error("Não é possível apagar um cliente com negócios ou obras associadas.");
  }

  await prisma.client.delete({ where: { id: clientId } });
  await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "Client", entityId: clientId } });

  revalidatePath("/clientes");
  redirect("/clientes");
}


// ─────────────────────────────────────────────────────────────────────────
// PORTAL DO CLIENTE — ativação e gestão de acesso
// ─────────────────────────────────────────────────────────────────────────
// A equipa define aqui a password inicial (ou uma nova, em caso de reposição)
// e comunica-a ao cliente por um canal já confiável (telefone, email direto)
// — não existe ainda envio automático de convite (ver docs/pendencias-tecnicas.md).

const PortalPasswordSchema = z.object({
  password: z.string().min(8, "A password tem de ter pelo menos 8 caracteres.").max(72),
});

export async function activateClientPortal(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para gerir o acesso ao portal.");
  }

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { email: true } });
  if (!client?.email) {
    throw new Error("Este cliente não tem email registado — não é possível ativar o acesso ao portal sem um email para login.");
  }

  // O login do portal identifica o cliente só pelo email (Client.email não
  // é único na base de dados — dois registos podem partilhar o mesmo
  // contacto de propósito, ex. duas obras da mesma família). Isso é
  // inofensivo até os DOIS terem o portal ativo com o mesmo email: nesse
  // caso o login deixaria de ser determinístico. Bloqueado aqui, na
  // origem, em vez de só na autenticação.
  const emailConflict = await prisma.client.findFirst({
    where: { email: client.email, portalActive: true, id: { not: clientId } },
    select: { id: true, name: true },
  });
  if (emailConflict) {
    throw new Error(
      `Já existe outro cliente ("${emailConflict.name}") com acesso ao portal ativo usando este mesmo email. Desative o acesso desse cliente primeiro, ou corrija o email antes de continuar.`
    );
  }

  const parsed = PortalPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Password inválida.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.client.update({
    where: { id: clientId },
    data: { passwordHash, portalActive: true, passwordChangedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "UPDATE", entity: "ClientPortalAccess", entityId: clientId, meta: "ativado/password redefinida" },
  });

  revalidatePath(`/clientes/${clientId}`);
}

export async function deactivateClientPortal(clientId: string, formData: FormData) {
  const user = await requireModuleAccess("clientes");
  void formData;
  if (!can(user.role, "clientes", "edit")) {
    throw new Error("Sem permissão para gerir o acesso ao portal.");
  }

  await prisma.client.update({ where: { id: clientId }, data: { portalActive: false } });

  await prisma.activityLog.create({
    data: { userId: user.id, action: "UPDATE", entity: "ClientPortalAccess", entityId: clientId, meta: "desativado" },
  });

  revalidatePath(`/clientes/${clientId}`);
}
