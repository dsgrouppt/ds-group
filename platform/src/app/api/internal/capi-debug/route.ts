import { NextRequest, NextResponse } from "next/server";
import { runCapiDiagnostics } from "@/lib/meta-capi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint interno de diagnóstico (missão CTO 02.09.2026, expandido na
 * ronda "P0 - META CAPI API ACCESS BLOCKED - FECHAR DIAGNOSTICO E
 * RESOLVER"). Corre runCapiDiagnostics() (lib/meta-capi.ts): debug_token,
 * metadados do pixel (business/ad accounts associados) e um envio real
 * de evento de teste isolado por test_event_code. Nunca devolve
 * META_CAPI_ACCESS_TOKEN, META_APP_SECRET nem qualquer outro segredo —
 * apenas os metadados públicos que a própria Graph API já devolve
 * (IDs, nomes, tipos de erro, fbtrace_id). Autenticado por
 * CTO_DEBUG_TOKEN. Nunca deve ser chamado por um browser de cliente.
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
    const result = await runCapiDiagnostics();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[capi-debug] Falha ao correr diagnóstico CAPI:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "erro_desconhecido" },
      { status: 500 }
    );
  }
}
