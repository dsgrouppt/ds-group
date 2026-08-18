import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { executeAssistantTool } from "../../src/lib/assistant/tools";
import { ensureSession } from "../../src/lib/assistant/engine";
import { ASSISTANT_STATE } from "../../src/lib/assistant/states";
import { createLead, cleanupAll, lastActivity, PNG_1PX_BASE64 } from "./helpers";

process.env.ASSISTANT_ENABLED = "true";

test.after(async () => {
  await cleanupAll();
  await prisma.$disconnect();
});

test("enviar_mensagem: em Etapa 2 regista em shadow, nunca envia", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const r = await executeAssistantTool("enviar_mensagem", { dealId, canal: "EMAIL", corpo: "Obrigado pelo seu contacto. Em que cidade fica o imóvel?" });
  assert.equal(r.ok, true);
  assert.equal(r.detail, "registada_em_shadow_nao_enviada");
  const session = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  const data = JSON.parse(session.dataJson);
  assert.equal(data.mensagens.length, 1);
  assert.equal(data.mensagens[0].enviada, false);
  assert.equal(data.mensagens[0].shadow, true);
  assert.ok(await lastActivity(dealId, "ASSISTANT_SHADOW_MESSAGE"));
});

test("enviar_mensagem: guardrails bloqueiam preço e nada fica registado como mensagem", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const r = await executeAssistantTool("enviar_mensagem", { dealId, canal: "EMAIL", corpo: "A obra custa 25.000€ e começamos em 2 semanas" });
  assert.equal(r.ok, false);
  assert.ok(r.blockedByGuardrails && r.blockedByGuardrails.length >= 2);
  const session = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(JSON.parse(session.dataJson).mensagens, undefined);
  assert.ok(await lastActivity(dealId, "ASSISTANT_MESSAGE_BLOCKED"));
});

test("registar_resposta + registar_qualificacao: usa a régua existente e grava no Deal", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");

  const incomplete = await executeAssistantTool("registar_qualificacao", { dealId });
  assert.equal(incomplete.ok, false);
  assert.match(incomplete.detail ?? "", /criterios_em_falta/);

  for (const [criterio, pontuacao] of [["localizacao", 2], ["tipoObra", 2], ["orcamento", 2], ["prazoUrgencia", 2], ["decisor", 1]] as const) {
    const r = await executeAssistantTool("registar_resposta", { dealId, criterio, pontuacao, texto: "resposta de teste" });
    assert.equal(r.ok, true);
  }
  const done = await executeAssistantTool("registar_qualificacao", { dealId });
  assert.equal(done.ok, true);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.qualificationScore, 9);
  assert.equal(deal.qualificationCategory, "PRIORITARIO");
  const log = await lastActivity(dealId, "QUALIFICATION");
  assert.match(log?.meta ?? "", /origem=assistente/);
});

test("avancar_para_qualificado: só NOVO_LEAD→QUALIFICADO; recusa outros estados", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const ok = await executeAssistantTool("avancar_para_qualificado", { dealId });
  assert.equal(ok.ok, true);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.stage, "QUALIFICADO");
  assert.ok(deal.firstContactedAt);

  // Segunda tentativa (já QUALIFICADO) tem de ser recusada.
  const again = await executeAssistantTool("avancar_para_qualificado", { dealId });
  assert.equal(again.ok, false);
  assert.match(again.detail ?? "", /transicao_recusada/);

  // Negócio em fase avançada: recusa sempre (sem sequer precisar de sessão noutro stage).
  const { dealId: d2 } = await createLead({ stage: "PROPOSTA_ENVIADA" });
  await prisma.assistantSession.create({ data: { dealId: d2 } });
  const refused = await executeAssistantTool("avancar_para_qualificado", { dealId: d2 });
  assert.equal(refused.ok, false);
});

test("guardar_foto: valida assinatura binária real e cria Attachment privado ligado ao Client", async () => {
  const { dealId, clientId } = await createLead();
  await ensureSession(dealId, "EMAIL");

  const ok = await executeAssistantTool("guardar_foto", { dealId, filename: "sala.png", mimeType: "image/png", contentBase64: PNG_1PX_BASE64 });
  assert.equal(ok.ok, true);
  const attachment = await prisma.attachment.findFirstOrThrow({ where: { clientId } });
  assert.equal(attachment.kind, "FOTO_OBRA");
  assert.equal(attachment.visibleToClient, false);

  // mimeType declarado não corresponde aos bytes → recusa (proteção do storage.ts reutilizada).
  const fake = await executeAssistantTool("guardar_foto", { dealId, filename: "malicioso.png", mimeType: "image/jpeg", contentBase64: PNG_1PX_BASE64 }).catch((e: Error) => ({ ok: false, tool: "guardar_foto", detail: e.message }));
  assert.equal(fake.ok, false);
});

test("propor_visita: cria SEMPRE tarefa urgente; evento provisório só com slot concreto; nunca confirma", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");

  // Sem slot concreto: só tarefa.
  const r1 = await executeAssistantTool("propor_visita", { dealId, disponibilidades: ["terça de manhã", "quinta às 18h"] });
  assert.equal(r1.ok, true);
  const task = await prisma.task.findFirstOrThrow({ where: { dealId, title: { contains: "Confirmar visita" } } });
  assert.equal(task.priority, "URGENTE");
  assert.equal(await prisma.calendarEvent.count({ where: { dealId } }), 0);

  // Com slot concreto: evento PROVISÓRIO ligado ao Deal, título deixa claro que não está confirmado.
  const r2 = await executeAssistantTool("propor_visita", { dealId, disponibilidades: ["quinta às 18h"], startAt: new Date("2026-08-20T18:00:00Z") });
  assert.equal(r2.ok, true);
  const evento = await prisma.calendarEvent.findFirstOrThrow({ where: { dealId } });
  assert.equal(evento.type, "VISITA_TECNICA");
  assert.match(evento.title, /PROPOSTA/);
  assert.match(evento.notes ?? "", /NÃO CONFIRMADA/);

  // O pipeline NÃO foi movido para VISITA_AGENDADA (isso é humano).
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.stage, "NOVO_LEAD");
});

test("criar_tarefa: cria tarefa ligada ao Deal", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const r = await executeAssistantTool("criar_tarefa", { dealId, titulo: "Verificar informação do lead", prioridade: "ALTA" });
  assert.equal(r.ok, true);
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: "Verificar informação do lead" } }));
});

test("escalar_humano: takeover irreversível pelo assistente + tarefa urgente + ferramentas bloqueadas", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const r = await executeAssistantTool("escalar_humano", { dealId, motivo: "Lead perguntou o preço" });
  assert.equal(r.ok, true);
  const session = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(session.humanTakeover, true);
  assert.equal(session.state, ASSISTANT_STATE.ESCALADO);
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: { contains: "escalou" } } }));

  // Depois do takeover, TODAS as ferramentas de ação são recusadas.
  const blocked = await executeAssistantTool("enviar_mensagem", { dealId, canal: "EMAIL", corpo: "Olá" }).catch((e: Error) => ({ ok: false, tool: "enviar_mensagem", detail: e.message }));
  assert.equal(blocked.ok, false);
  assert.match(String((blocked as { detail?: string }).detail), /takeover/);
});
