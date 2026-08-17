import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncClientToHubspot } from "@/lib/hubspot";
import { DEAL_STAGE_LABEL } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint interno de sincronização periódica DS OS → HubSpot (Prioridade
 * 5, ago/2026). Mesmo padrão de autenticação por token partilhado já
 * usado em /api/internal/notifications-check (HUBSPOT_SYNC_INTERNAL_TOKEN
 * em vez de NOTIFICATIONS_INTERNAL_TOKEN) — chamado máquina-a-máquina por
 * um serviço de cron dedicado na Railway, nunca por um browser.
 * middleware.ts já deixa /api/internal/* passar sem sessão de utilizador.
 *
 * Cada execução sincroniza dois grupos, sem exigir comparação de campo-a-
 * campo no Prisma (não suportado nativamente em `where`):
 *   1. Clientes NUNCA sincronizados (hubspotContactId nulo), até um limite.
 *   2. Clientes atualizados numa janela recente (mesmo intervalo do cron),
 *      mesmo que já tenham hubspotContactId — cobre mudanças de etapa de
 *      negócio, notas, etc. Reenviar um cliente já sincronizado nunca cria
 *      duplicado (upsert por email, ver src/lib/hubspot.ts).
 * Clientes sem email são ignorados (o HubSpot exige email como chave).
 */
const BATCH_LIMIT = 50;
const RECENT_WINDOW_MINUTES = 20;

async function syncBatch(clients: Array<{ id: string; name: string; email: string | null; phone: string | null }>) {
  let synced = 0;
  let failed = 0;
  let skippedNoEmail = 0;

  for (const client of clients) {
    if (!client.email) {
      skippedNoEmail++;
      continue;
    }

    const latestDeal = await prisma.deal.findFirst({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      select: { stage: true },
    });

    const result = await syncClientToHubspot({
      email: client.email,
      name: client.name,
      phone: client.phone,
      latestDealStage: latestDeal ? DEAL_STAGE_LABEL[latestDeal.stage as keyof typeof DEAL_STAGE_LABEL] ?? latestDeal.stage : undefined,
      dsOsClientId: client.id,
    });

    if (result.ok && result.hubspotContactId) {
      await prisma.client.update({
        where: { id: client.id },
        data: { hubspotContactId: result.hubspotContactId, hubspotSyncedAt: new Date() },
      });
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed, skippedNoEmail };
}

export async function POST(request: NextRequest) {
  const expected = process.env.HUBSPOT_SYNC_INTERNAL_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Sincronização HubSpot não configurada (HUBSPOT_SYNC_INTERNAL_TOKEN em falta)." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    return NextResponse.json({ ok: true, skipped: true, reason: "hubspot_access_token_em_falta" });
  }

  try {
    const since = new Date(Date.now() - RECENT_WINDOW_MINUTES * 60 * 1000);

    const [neverSynced, recentlyUpdated] = await Promise.all([
      prisma.client.findMany({
        where: { hubspotContactId: null },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: { createdAt: "asc" },
        take: BATCH_LIMIT,
      }),
      prisma.client.findMany({
        where: { hubspotContactId: { not: null }, updatedAt: { gte: since } },
        select: { id: true, name: true, email: true, phone: true },
        take: BATCH_LIMIT,
      }),
    ]);

    const seen = new Set<string>();
    const toSync = [...neverSynced, ...recentlyUpdated].filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));

    const summary = await syncBatch(toSync);
    return NextResponse.json({ ok: true, ...summary, total: toSync.length });
  } catch (err) {
    console.error("[hubspot-sync] Falha na sincronização periódica:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "erro_desconhecido" }, { status: 500 });
  }
}
