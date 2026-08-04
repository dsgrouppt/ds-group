import { prisma } from "@/lib/prisma";
import { PROJECT_STAGE_ORDER, PROJECT_STAGE_LABEL, type ProjectStageValue } from "@/lib/enums";

/**
 * Camada de acesso a dados do Portal do Cliente.
 *
 * Regra de ouro seguida em todas as funções abaixo: NUNCA aceitar um
 * `projectId`/`invoiceId`/etc. vindo de uma página e devolver os seus
 * dados sem primeiro confirmar que pertence ao `clientId` da sessão
 * autenticada. Um cliente autenticado só pode ver dados relacionados
 * consigo — isto é reforçado aqui, na camada de dados, e não apenas na
 * UI, precisamente para que um erro numa página não se torne uma fuga de
 * dados entre clientes.
 *
 * Segunda regra: só é devolvido ao portal o que foi explicitamente
 * marcado como visível — `Attachment.visibleToClient`. Nada é exposto por
 * omissão.
 */

export async function getClientProjects(clientId: string) {
  return prisma.project.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
}

/** Projeto mais relevante para o dashboard — o mais recente ainda não arquivado, ou o mais recente de todos. */
export async function getPrimaryProject(clientId: string) {
  const active = await prisma.project.findFirst({
    where: { clientId, stage: { notIn: ["ENTREGUE", "POS_OBRA_GARANTIA"] } },
    orderBy: { createdAt: "desc" },
  });
  if (active) return active;

  return prisma.project.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } });
}

/** Confirma pertença antes de devolver — ver nota de segurança acima. */
export async function getOwnedProject(projectId: string, clientId: string) {
  return prisma.project.findFirst({ where: { id: projectId, clientId } });
}

export function projectStageTimeline(currentStage: string) {
  const currentIndex = PROJECT_STAGE_ORDER.indexOf(currentStage as ProjectStageValue);
  return PROJECT_STAGE_ORDER.map((stage, index) => ({
    stage,
    label: PROJECT_STAGE_LABEL[stage],
    status: currentIndex === -1 ? "pending" : index < currentIndex ? "done" : index === currentIndex ? "current" : "pending",
  }));
}

export async function getProjectEvents(projectId: string) {
  return prisma.calendarEvent.findMany({
    where: { projectId },
    orderBy: { startAt: "asc" },
  });
}

export async function getClientAttachments(clientId: string, kind: string) {
  const projects = await prisma.project.findMany({ where: { clientId }, select: { id: true } });
  const projectIds = projects.map((p) => p.id);

  return prisma.attachment.findMany({
    where: {
      visibleToClient: true,
      kind,
      OR: [{ clientId }, { projectId: { in: projectIds } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectMessages(projectId: string) {
  return prisma.clientMessage.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getClientInvoices(clientId: string) {
  const projects = await prisma.project.findMany({ where: { clientId }, select: { id: true, title: true } });
  const projectIds = projects.map((p) => p.id);
  const titleById = new Map(projects.map((p) => [p.id, p.title]));

  const invoices = await prisma.invoice.findMany({
    where: { projectId: { in: projectIds } },
    include: { payments: true },
    orderBy: { issueDate: "desc" },
  });

  return invoices.map((invoice) => ({
    ...invoice,
    projectTitle: invoice.projectId ? titleById.get(invoice.projectId) ?? null : null,
  }));
}

export async function countUnreadMessages(clientId: string) {
  const projects = await prisma.project.findMany({ where: { clientId }, select: { id: true } });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return 0;

  return prisma.clientMessage.count({
    where: { projectId: { in: projectIds }, authorType: "EQUIPA", readByClient: false },
  });
}
