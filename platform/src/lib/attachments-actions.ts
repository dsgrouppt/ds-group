"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can, type ModuleKey } from "@/lib/permissions";
import { saveFile, isAllowedFile, deleteStoredFile } from "@/lib/storage";

interface UploadTarget {
    clientId?: string;
    projectId?: string;
    taskId?: string;
    revalidate: string;
}

const ATTACHMENT_KINDS = ["DOCUMENTO", "FOTO_OBRA", "RELATORIO", "OUTRO"];

/**
 * Anexos são partilhados por três módulos (Obras, Tarefas, Clientes), cada
 * um com a sua própria entrada na matriz de permissões (ver
 * src/lib/permissions.ts). As Server Actions abaixo são endpoints POST
 * independentes da página onde são invocadas — o facto de a página
 * /obras/[id] só renderizar o formulário de upload para quem tem acesso ao
 * módulo "obras" NÃO impede, por si só, que um utilizador autenticado mas
 * sem esse acesso invoque a action diretamente (o identificador da Server
 * Action é o mesmo para todas as sessões da mesma build). Por isso a
 * autorização tem de ser verificada aqui dentro, e não apenas confiada à
 * página que a chama.
 */
function moduleForTarget(target: { clientId?: string | null; projectId?: string | null; taskId?: string | null }): ModuleKey {
    if (target.projectId) return "obras";
    if (target.taskId) return "tarefas";
    if (target.clientId) return "clientes";
    throw new Error("Alvo de anexo inválido.");
}

export async function uploadAttachment(target: UploadTarget, formData: FormData) {
    const user = await requireUser();

  const moduleKey = moduleForTarget(target);
    if (!can(user.role, moduleKey, "edit")) {
          throw new Error("Sem permissão para anexar ficheiros aqui.");
    }

  const rawKind = formData.get("kind");
    const kind = typeof rawKind === "string" && ATTACHMENT_KINDS.includes(rawKind) ? rawKind : "OUTRO";
    // Checkbox HTML só envia o campo quando marcado — a sua ausência
  // significa "não visível", que é o valor seguro por omissão (ver nota
  // de privacidade no schema, modelo Attachment).
  const visibleToClient = formData.get("visibleToClient") === "on";

  const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
          throw new Error("Selecione um ficheiro.");
    }

  const allowed = isAllowedFile(file);
    if (!allowed.ok) {
          throw new Error(allowed.reason);
    }

  const saved = await saveFile(file);

  await prisma.attachment.create({
        data: {
                filename: saved.filename,
                originalName: saved.originalName,
                mimeType: saved.mimeType,
                size: saved.size,
                path: saved.relativePath,
                clientId: target.clientId,
                projectId: target.projectId,
                taskId: target.taskId,
                uploadedById: user.id,
                kind,
                visibleToClient,
        },
  });

  await prisma.activityLog.create({ data: { userId: user.id, action: "UPLOAD", entity: "Attachment" } });

  revalidatePath(target.revalidate);
}

export async function deleteAttachment(attachmentId: string, revalidate: string, formData: FormData) {
    const user = await requireUser();
    void formData;

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return;

  const moduleKey = moduleForTarget(attachment);
    if (!can(user.role, moduleKey, "edit")) {
          throw new Error("Sem permissão para apagar este ficheiro.");
    }

  await deleteStoredFile(attachment.path);
    await prisma.attachment.delete({ where: { id: attachmentId } });
    await prisma.activityLog.create({ data: { userId: user.id, action: "DELETE", entity: "Attachment", entityId: attachmentId } });

  revalidatePath(revalidate);
}
