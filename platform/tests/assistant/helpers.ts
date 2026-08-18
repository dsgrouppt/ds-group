/**
 * Helpers partilhados dos testes do DS Sales Assistant (Etapa 2).
 * Correm contra um Postgres real local com o schema da Etapa 1 aplicado
 * (mesma engine da produção). Cada teste cria os seus próprios registos
 * com prefixo identificável e limpa-os no fim.
 */
import { prisma } from "../../src/lib/prisma";

export const TEST_PREFIX = "TESTE-ASSISTANT-";

export async function createLead(opts?: { source?: string; stage?: string }): Promise<{ dealId: string; clientId: string }> {
  const client = await prisma.client.create({
    data: { name: `${TEST_PREFIX}Cliente ${Date.now()}-${Math.floor(Math.random() * 1e6)}`, email: `${TEST_PREFIX.toLowerCase()}${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.local`, phone: `+3519${Math.floor(10000000 + Math.random() * 89999999)}` },
  });
  const deal = await prisma.deal.create({
    data: {
      title: `${TEST_PREFIX}Negócio`,
      clientId: client.id,
      source: opts?.source ?? "META_LEAD_ADS",
      stage: opts?.stage ?? "NOVO_LEAD",
    },
  });
  return { dealId: deal.id, clientId: client.id };
}

export async function cleanupAll(): Promise<void> {
  const clients = await prisma.client.findMany({ where: { name: { startsWith: TEST_PREFIX } }, select: { id: true } });
  const clientIds = clients.map((c) => c.id);
  const deals = await prisma.deal.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } });
  const dealIds = deals.map((d) => d.id);
  await prisma.assistantSession.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.task.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.calendarEvent.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.attachment.deleteMany({ where: { clientId: { in: clientIds } } });
  await prisma.whatsAppMessage.deleteMany({ where: { conversation: { dealId: { in: dealIds } } } });
  await prisma.whatsAppConversation.deleteMany({ where: { dealId: { in: dealIds } } });
  await prisma.activityLog.deleteMany({ where: { entityId: { in: dealIds } } });
  await prisma.deal.deleteMany({ where: { id: { in: dealIds } } });
  await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
}

/** PNG 1×1 válido (assinatura binária real — storage.ts verifica os magic bytes). */
export const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function lastActivity(dealId: string, action: string) {
  return prisma.activityLog.findFirst({ where: { entityId: dealId, action }, orderBy: { createdAt: "desc" } });
}
