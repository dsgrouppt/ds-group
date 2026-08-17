import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint TEMPORÁRIO, criado e removido na mesma sessão (17/ago/2026),
 * só para repor a password de um utilizador admin depois de o login
 * guardado no browser ter deixado de funcionar e o Diogo ter confirmado
 * por chat que também não sabia a password (nem a mudou) — autorização
 * explícita dada em chat para mexer nesta conta. Mesmo padrão de
 * autenticação por token partilhado dos outros endpoints /api/internal/*
 * (ver notifications-check/route.ts). GET lista só email/nome/role (sem
 * hash) para confirmar qual é o email certo antes de repor a password.
 * Depois de usado para confirmar a Timeline única em produção, este
 * ficheiro e a variável TEMP_ADMIN_RESET_TOKEN são removidos — não é uma
 * feature do DS OS.
 */
function checkAuth(request: NextRequest): boolean {
  const expected = process.env.TEMP_ADMIN_RESET_TOKEN;
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true, name: true, role: true, active: true },
  });
  return NextResponse.json({ ok: true, users });
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.newPassword !== "string" || body.newPassword.length < 12) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });
  if (!target || target.role !== "ADMIN") {
    return NextResponse.json({ error: "Utilizador não encontrado ou não é admin." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(body.newPassword, 10);

  const result = await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.id });
}
