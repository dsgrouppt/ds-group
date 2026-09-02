import { NextRequest, NextResponse } from "next/server";
import { debugCapiToken } from "@/lib/meta-capi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint interno de diagnóstico (missão CTO 02.09.2026) — expõe
 * debugCapiToken() (já existente em lib/meta-capi.ts mas nunca antes
 * ligado a nenhuma rota) para confirmar, sem depender de acesso direto
 * ao valor de META_CAPI_ACCESS_TOKEN, se o token configurado ainda tem a
 * permissão ads_management e qual a mensagem de erro exata devolvida
 * pela Graph API quando o Meta bloqueia o acesso (ex.: "API access
 * blocked"). Autenticado por CTO_DEBUG_TOKEN (variável dedicada, gerada
 * para este diagnóstico e distinta dos tokens partilhados dos restantes
 * endpoints /api/internal/*, para não misturar segredos operacionais com
 * segredos de diagnóstico). Nunca deve ser chamado por um browser de
 * cliente.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CTO_DEBUG_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Diagnóstico CAPI não configurado (CTO_DEBUG_TOKEN em falta)." },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await debugCapiToken();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[capi-debug] Falha ao validar token CAPI:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "erro_desconhecido" },
      { status: 500 }
    );
  }
}
