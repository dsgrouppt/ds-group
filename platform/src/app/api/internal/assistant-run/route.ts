import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assistantEnabled, assistantShadowMode } from "@/lib/assistant/flags";
import { ensureSession, processInbound } from "@/lib/assistant/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DS Sales Assistant — endpoint interno de execução/observação em SHADOW
 * (Etapa 2). Não é um webhook público: segue exatamente o padrão dos
 * outros /api/internal/* (Bearer token dedicado, ASSISTANT_INTERNAL_TOKEN;
 * middleware.ts já deixa /api/internal/* passar sem sessão de browser).
 *
 * Serve para: (1) testes ponta-a-ponta em ambiente local; (2) na fase de
 * shadow em produção (após autorização), injetar manualmente eventos de
 * leads reais e observar o que o motor FARIA — sem nenhuma comunicação a
 * clientes, por construção (ver tools.ts / enviar_mensagem).
 *
 * Duplamente inerte em produção nesta etapa: requer ASSISTANT_INTERNAL_TOKEN
 * (não existe) E ASSISTANT_ENABLED="true" (não existe).
 */

const BodySchema = z.object({
  action: z.enum(["ensure-session", "inbound"]),
  dealId: z.string().min(1).max(50),
  canal: z.enum(["WHATSAPP", "EMAIL"]).default("EMAIL"),
  texto: z.string().max(4000).optional(),
  anexos: z
    .array(z.object({ filename: z.string().min(1).max(200), mimeType: z.string().min(1).max(100), contentBase64: z.string() }))
    .max(5)
    .optional(),
});

export async function POST(request: NextRequest) {
  const expected = process.env.ASSISTANT_INTERNAL_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Assistente não configurado (ASSISTANT_INTERNAL_TOKEN em falta)." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!assistantEnabled()) {
    return NextResponse.json({ error: "ASSISTANT_ENABLED desligado — motor inerte." }, { status: 503 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof z.ZodError ? err.issues[0]?.message : "Corpo inválido." }, { status: 400 });
  }

  try {
    if (body.action === "ensure-session") {
      const result = await ensureSession(body.dealId, body.canal);
      return NextResponse.json({ ok: true, shadow: assistantShadowMode(), ...result });
    }
    const result = await processInbound({ dealId: body.dealId, canal: body.canal, texto: body.texto ?? "", anexos: body.anexos });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[assistant-run] Falha:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "erro_desconhecido" }, { status: 500 });
  }
}
