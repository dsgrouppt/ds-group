"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/session";
import { ROLE, ROLE_LABEL } from "@/lib/enums";

const CreateUserSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto").max(150),
  email: z.string().email("Email inválido").max(190),
  role: z.string().max(40),
});

export async function createUser(formData: FormData) {
  const admin = await requireModuleAccess("definicoes");

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.role in ROLE_LABEL)) {
    throw new Error("Perfil inválido.");
  }

  const email = data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Já existe um utilizador com este email.");
  }

  const generatedPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(generatedPassword, 12);

  const user = await prisma.user.create({
    data: { name: data.name, email, role: data.role, passwordHash },
  });

  await prisma.activityLog.create({ data: { userId: admin.id, action: "CREATE", entity: "User", entityId: user.id } });

  revalidatePath("/definicoes/utilizadores");
  redirect(`/definicoes/utilizadores/${user.id}?novaPassword=${generatedPassword}`);
}

const UpdateUserSchema = z.object({
  userId: z.string().min(1).max(50),
  name: z.string().min(2, "Nome demasiado curto"),
  role: z.string(),
  active: z.string().max(10).optional(),
});

export async function updateUser(formData: FormData) {
  const admin = await requireModuleAccess("definicoes");

  const parsed = UpdateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    role: formData.get("role"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const data = parsed.data;
  if (!(data.role in ROLE_LABEL)) {
    throw new Error("Perfil inválido.");
  }

  if (data.userId === admin.id && data.active !== "on" && admin.role === ROLE.ADMIN) {
    throw new Error("Não pode desativar a sua própria conta.");
  }
  if (data.userId === admin.id && data.role !== ROLE.ADMIN && admin.role === ROLE.ADMIN) {
    throw new Error("Não pode remover o seu próprio perfil de Administrador (ficaria sem acesso a Definições).");
  }

  await prisma.user.update({
    where: { id: data.userId },
    data: { name: data.name, role: data.role, active: data.active === "on" },
  });

  await prisma.activityLog.create({ data: { userId: admin.id, action: "UPDATE", entity: "User", entityId: data.userId } });

  revalidatePath("/definicoes/utilizadores");
  revalidatePath(`/definicoes/utilizadores/${data.userId}`);
}

export async function resetPassword(userId: string, formData: FormData) {
  void formData;
  const admin = await requireModuleAccess("definicoes");

  const generatedPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(generatedPassword, 12);

  await prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } });
  await prisma.activityLog.create({ data: { userId: admin.id, action: "RESET_PASSWORD", entity: "User", entityId: userId } });

  revalidatePath(`/definicoes/utilizadores/${userId}`);
  redirect(`/definicoes/utilizadores/${userId}?novaPassword=${generatedPassword}`);
}
