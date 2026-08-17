import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint TEMPORÁRIO, criado e removido na mesma sessão (17/ago/2026),
 * só para repor a password de admin@dsgroup.pt depois de o login guardado
 * no browser ter deixado de funcionar e o Diogo ter confirmado por chat
 * que também não sabia a password (nem a mudou) — autorização explícita
 * dada em chat para mexer nesta conta. Mesmo padrão de autenticação por
 * token partilhado dos outros endpoints /api/internal/* (ver
 * notifications-check/route.ts), mas restrito a um único email fixo
 * (defesa em profundidade: mesmo com o token, não dá para repor a
 * password de mais ninguém). Depois de usado uma vez para confirmar a
 * Timeline única em produção, este ficheiro e a variável
 * TEMP_ADMIN_RESET_TOKEN são removidos — não é uma feature do DS OS.
 */
const ALLOWED_EMAIL = "admin@dsgroup.pt";

export async function POST(request: NextRequest) {
  const expected = process.env.TEMP_ADMIN_RESET_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Não configurado." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || body.email !== ALLOWED_EMAIL || typeof body.newPassword !== "string" || body.newPassword.length < 12) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.newPassword, 10);

  const result = await prisma.user.updateMany({
    where: { email: ALLOWED_EMAIL },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
