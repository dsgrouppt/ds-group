import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint de health check para monitorização (uptime checks, load
 * balancer, orquestrador de containers). Não exige autenticação — é
 * excluído no matcher do middleware — mas não devolve informação
 * sensível, só o estado de ligação à base de dados.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "connected" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error", database: "unreachable" }, { status: 503 });
  }
}
