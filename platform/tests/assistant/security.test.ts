/**
 * Suite de SEGURANÇA (Etapa 2): garante que o assistente não consegue
 * executar nada fora da whitelist aprovada, que não existe caminho de
 * envio a clientes, e que os interruptores falham para o lado seguro.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../../src/lib/prisma";
import { ASSISTANT_TOOLS, executeAssistantTool } from "../../src/lib/assistant/tools";
import { processInbound, ensureSession } from "../../src/lib/assistant/engine";
import { assistantMaySend, assistantShadowMode } from "../../src/lib/assistant/flags";
import { createLead, cleanupAll } from "./helpers";

process.env.ASSISTANT_ENABLED = "true";

test.after(async () => {
  await cleanupAll();
  await prisma.$disconnect();
});

test("catálogo é exatamente o aprovado no desenho v2 — 8 ferramentas, nem mais nem menos", () => {
  assert.deepEqual(
    [...ASSISTANT_TOOLS].sort(),
    ["avancar_para_qualificado", "criar_tarefa", "enviar_mensagem", "escalar_humano", "guardar_foto", "propor_visita", "registar_qualificacao", "registar_resposta"].sort()
  );
});

test("ferramenta fora da whitelist é recusada e auditada — nunca executada", async () => {
  const { dealId } = await createLead();
  for (const name of ["apagar_negocio", "fechar_ganho", "enviar_whatsapp", "delete_all", "update_deal", "confirmar_visita", "DROP TABLE", ""]) {
    const r = await executeAssistantTool(name, { dealId });
    assert.equal(r.ok, false, `"${name}" devia ser recusada`);
    assert.equal(r.detail, "ferramenta_fora_da_whitelist");
  }
  const rejections = await prisma.activityLog.count({ where: { entityId: dealId, action: "ASSISTANT_TOOL_REJECTED" } });
  assert.ok(rejections >= 7);
});

test("argumentos inválidos são recusados pelo Zod antes de qualquer IO", async () => {
  const bad = [
    ["enviar_mensagem", { dealId: "x", canal: "SMS", corpo: "olá" }],
    ["enviar_mensagem", { dealId: "x", canal: "EMAIL", corpo: "" }],
    ["registar_resposta", { dealId: "x", criterio: "inventado", pontuacao: 2 }],
    ["registar_resposta", { dealId: "x", criterio: "orcamento", pontuacao: 5 }],
    ["guardar_foto", { dealId: "x", filename: "a.exe", mimeType: "application/x-msdownload", contentBase64: "AAAA" }],
    ["criar_tarefa", { dealId: "x", titulo: "ab", prioridade: "MEGA" }],
    ["propor_visita", { dealId: "x", disponibilidades: ["a", "b", "c", "d"] }],
  ] as const;
  for (const [name, args] of bad) {
    const r = await executeAssistantTool(name, args);
    assert.equal(r.ok, false, `${name} com args inválidos devia falhar`);
    assert.match(r.detail ?? "", /argumentos_invalidos/);
  }
});

test("sem caminho de envio: módulos do assistente não importam whatsapp/email/hubspot/meta-capi", () => {
  const dir = path.join(process.cwd(), "src", "lib", "assistant");
  for (const file of ["tools.ts", "engine.ts", "guardrails.ts", "intents.ts", "states.ts", "flags.ts"]) {
    const source = readFileSync(path.join(dir, file), "utf8");
    for (const forbidden of ['from "@/lib/whatsapp"', 'from "@/lib/email"', 'from "@/lib/hubspot"', 'from "@/lib/meta-capi"', "graph.facebook.com", "api.resend.com"]) {
      assert.ok(!source.includes(forbidden), `${file} não pode conter "${forbidden}"`);
    }
  }
});

test("motor desligado (ASSISTANT_ENABLED ausente) não processa nem cria sessões", async () => {
  const { dealId } = await createLead();
  const original = process.env.ASSISTANT_ENABLED;
  delete process.env.ASSISTANT_ENABLED;
  try {
    const s = await ensureSession(dealId, "EMAIL");
    assert.deepEqual(s, { created: false, reason: "assistant_desligado" });
    const r = await processInbound({ dealId, canal: "EMAIL", texto: "olá" });
    assert.equal(r.processed, false);
    assert.equal(r.reason, "assistant_desligado");
    assert.equal(await prisma.assistantSession.count({ where: { dealId } }), 0);
  } finally {
    process.env.ASSISTANT_ENABLED = original;
  }
});

test("shadow é o modo por omissão e o envio real está vedado em qualquer combinação da Etapa 2", () => {
  assert.equal(assistantShadowMode(), true, "sem ASSISTANT_SHADOW definido, shadow tem de ser o default");
  assert.equal(assistantMaySend("WHATSAPP"), false);
  assert.equal(assistantMaySend("EMAIL"), false);
});

test("elegibilidade estrita: sessões só para leads META_LEAD_ADS em NOVO_LEAD", async () => {
  const organico = await createLead({ source: "SEO_ORGANICO" });
  assert.match((await ensureSession(organico.dealId, "EMAIL")).reason ?? "", /fora_do_ambito_source/);

  const avancado = await createLead({ stage: "EM_NEGOCIACAO" });
  assert.match((await ensureSession(avancado.dealId, "EMAIL")).reason ?? "", /fora_do_ambito_stage/);

  const elegivel = await createLead();
  assert.equal((await ensureSession(elegivel.dealId, "EMAIL")).created, true);
});

test("intervenção manual da equipa (mensagem WhatsApp OUTBOUND) força takeover imediato", async () => {
  const { dealId, clientId } = await createLead();
  await ensureSession(dealId, "EMAIL");

  const user = await prisma.user.findFirst();
  const phone = `+3519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const conv = await prisma.whatsAppConversation.create({ data: { phoneNumber: phone, clientId, dealId } });
  await prisma.whatsAppMessage.create({
    data: { conversationId: conv.id, direction: "OUTBOUND", body: "Olá, é a equipa DS", status: "ENVIADA", sentById: user?.id ?? null },
  });
  // Se não existir nenhum User na BD de teste, cria-se um só para este cenário.
  if (!user) {
    const u = await prisma.user.create({ data: { name: "TESTE-ASSISTANT-User", email: `teste-assistant-${Date.now()}@teste.local`, passwordHash: "x" } });
    await prisma.whatsAppMessage.updateMany({ where: { conversationId: conv.id }, data: { sentById: u.id } });
  }

  const r = await processInbound({ dealId, canal: "WHATSAPP", texto: "olá" });
  assert.equal(r.processed, true);
  assert.equal(r.stateAfter, "ESCALADO");
  const session = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(session.humanTakeover, true);
  assert.match(session.takeoverReason ?? "", /Intervenção manual/);
});
