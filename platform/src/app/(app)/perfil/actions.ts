"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
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

/**
 * Alteração de password pelo próprio utilizador — antes desta função, a
 * única forma de mudar uma password era um ADMIN redefini-la a partir de
 * Definições > Utilizadores (módulo a que só ADMIN tem acesso). Isto
 * deixava todos os outros perfis (Direção, Comercial, Gestor de Projeto,
 * Financeiro, RH, Marketing) sem qualquer forma de trocar a sua própria
 * password — um problema básico de higiene de acesso para uma plataforma
 * em produção. Esta ação está deliberadamente fora da matriz de módulos
 * (`permissions.ts`) — qualquer sessão válida pode mudar a sua própria
 * password, independentemente dos módulos a que tem acesso.
 */
export async function changeOwnPassword(formData: FormData) {
  const user = await requireUser();

  // Reutiliza o mesmo limitador do login — protege contra tentativas
  // repetidas de adivinhar a password atual.
  if (!consume(`change-password:${user.id}`, 8, 5 * 60 * 1000)) {
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

  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!current) {
    throw new Error("Conta não encontrada.");
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, current.passwordHash);
  if (!valid) {
    logger.warn("profile.change_password_failed", { userId: user.id, reason: "bad_current_password" });
    throw new Error("A palavra-passe atual está incorreta.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } });

  logger.info("profile.change_password_success", { userId: user.id });
  await prisma.activityLog.create({ data: { userId: user.id, action: "UPDATE", entity: "User", entityId: user.id, meta: "password alterada pelo próprio" } });

  revalidatePath("/perfil");
  redirect("/perfil?sucesso=1");
}
