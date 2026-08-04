"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/client-session";
import { logger } from "@/lib/logger";
import { consume } from "@/lib/rate-limit";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Introduza a sua palavra-passe atual."),
    newPassword: z.string().min(8, "A nova palavra-passe tem de ter pelo menos 8 caracteres.").max(72),
    confirmPassword: z.string().min(1, "Confirme a nova palavra-passe."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação não coincide com a nova palavra-passe.",
    path: ["confirmPassword"],
  });

/** Equivalente, para o Portal do Cliente, de changeOwnPassword em (app)/perfil/actions.ts. */
export async function changeOwnClientPassword(formData: FormData) {
  const client = await requireClient();

  if (!consume(`portal-change-password:${client.id}`, 8, 5 * 60 * 1000)) {
    throw new Error("Demasiadas tentativas. Aguarde alguns minutos antes de tentar novamente.");
  }

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const current = await prisma.client.findUnique({ where: { id: client.id }, select: { passwordHash: true } });
  if (!current?.passwordHash) {
    throw new Error("Conta não encontrada.");
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, current.passwordHash);
  if (!valid) {
    logger.warn("portal.change_password_failed", { clientId: client.id, reason: "bad_current_password" });
    throw new Error("A palavra-passe atual está incorreta.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.client.update({ where: { id: client.id }, data: { passwordHash, passwordChangedAt: new Date() } });

  logger.info("portal.change_password_success", { clientId: client.id });

  revalidatePath("/portal/conta");
  redirect("/portal/conta?sucesso=1");
}
