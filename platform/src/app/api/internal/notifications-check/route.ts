import { NextRequest, NextResponse } from "next/server";
import { runScheduledNotificationChecks } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint interno (Fase 4 — doc 05 §7.4), chamado máquina-a-máquina por
 * um serviço de cron dedicado na Railway (a cada 5 min — ver
 * docs/notificacoes-runbook.md), nunca por um browser. Mesmo padrão de
 * autenticação por token partilhado já usado em
 * /api/internal/uploads-backup (NOTIFICATIONS_INTERNAL_TOKEN em vez de
 * BACKUP_INTERNAL_TOKEN — tokens distintos por endpoint, para que uma
 * rotação de um nunca obrigue a mexer no outro). middleware.ts já deixa
 * /api/internal/* passar sem verificação de sessão de utilizador.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.NOTIFICATIONS_INTERNAL_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Verificação de notificações não configurada (NOTIFICATIONS_INTERNAL_TOKEN em falta)." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const summary = await runScheduledNotificationChecks();
    return NextResponse.json({ ok: true, ...summary }, { status: 200 });
  } catch (err) {
    console.error("[notifications-check] Falha na verificação periódica:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "erro_desconhecido" }, { status: 500 });
  }
}
