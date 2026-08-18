/**
 * Testes de integração do motor (Etapa 2): percurso feliz completo em
 * shadow, caminho FRACO, escalonamento por preço, opt-out e nudges.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma";
import { ensureSession, processInbound, runNudgeSweep } from "../../src/lib/assistant/engine";
import { ASSISTANT_STATE, parseSessionData } from "../../src/lib/assistant/states";
import { createLead, cleanupAll, PNG_1PX_BASE64 } from "./helpers";

process.env.ASSISTANT_ENABLED = "true";

test.after(async () => {
  await cleanupAll();
  await prisma.$disconnect();
});

test("percurso feliz completo: lead → qualificação → fotos → score → QUALIFICADO → proposta de visita (tudo em shadow)", async () => {
  const { dealId } = await createLead();
  assert.equal((await ensureSession(dealId, "WHATSAPP")).created, true);

  // 1) Primeira resposta do lead: tipo de obra (completa).
  let r = await processInbound({ dealId, canal: "WHATSAPP", texto: "Olá! Quero fazer uma remodelação completa do meu T3" });
  assert.equal(r.processed, true);
  assert.equal(r.stateAfter, ASSISTANT_STATE.QUALIFICACAO);
  assert.ok(r.plannedMessages.length > 0, "devia planear a pergunta seguinte");

  // 2) Localização.
  r = await processInbound({ dealId, canal: "WHATSAPP", texto: "O apartamento é em Oeiras" });
  assert.equal(r.stateAfter, ASSISTANT_STATE.QUALIFICACAO);

  // 3) Prazo.
  r = await processInbound({ dealId, canal: "WHATSAPP", texto: "Queríamos avançar o quanto antes" });
  // 4) Orçamento.
  r = await processInbound({ dealId, canal: "WHATSAPP", texto: "Temos cerca de 60 mil para investir" });
  // 5) Decisor → 5/5 completos → pedir fotos.
  r = await processInbound({ dealId, canal: "WHATSAPP", texto: "Decidimos os dois, eu e a minha mulher" });
  assert.equal(r.stateAfter, ASSISTANT_STATE.FOTOS);

  // 6) Fotos + fecho da classificação → QUALIFICADO no pipeline + agendamento.
  r = await processInbound({
    dealId,
    canal: "WHATSAPP",
    texto: "Envio já uma foto da sala",
    anexos: [{ filename: "sala.png", mimeType: "image/png", contentBase64: PNG_1PX_BASE64 }],
  });
  assert.equal(r.stateAfter, ASSISTANT_STATE.AGENDAMENTO);

  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.stage, "QUALIFICADO");
  assert.equal(deal.qualificationScore, 10);
  assert.equal(deal.qualificationCategory, "PRIORITARIO");
  assert.ok(deal.firstContactedAt);

  // 7) Disponibilidades → proposta de visita + tarefa humana.
  r = await processInbound({ dealId, canal: "WHATSAPP", texto: "Posso na terça de manhã ou na quinta às 18h" });
  assert.equal(r.stateAfter, ASSISTANT_STATE.VISITA_PROPOSTA);
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: { contains: "Confirmar visita" } } }));

  // Invariantes de segurança do percurso inteiro:
  const session = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  const data = parseSessionData(session.dataJson);
  assert.ok((data.mensagens ?? []).length >= 4);
  assert.ok((data.mensagens ?? []).every((m) => m.shadow === true && m.enviada === false), "nenhuma mensagem pode ter sido enviada");
  assert.ok((data.fotos ?? []).length === 1);
  assert.equal(deal.stage, "QUALIFICADO"); // nunca além de QUALIFICADO
  assert.equal(await prisma.calendarEvent.count({ where: { dealId, title: { not: { contains: "PROPOSTA" } } } }), 0);
});

test("lead FRACO: mensagem educada + triagem humana + CONCLUIDO, pipeline fica em NOVO_LEAD", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");

  await processInbound({ dealId, canal: "EMAIL", texto: "só pintura de uma parede da sala" }); // tipoObra=0
  await processInbound({ dealId, canal: "EMAIL", texto: "fica em Paris" }); // não percebido → repergunta 1
  await processInbound({ dealId, canal: "EMAIL", texto: "é na Amadora" }); // localizacao=1
  await processInbound({ dealId, canal: "EMAIL", texto: "estou só a pesquisar, sem pressa" }); // prazo=0
  await processInbound({ dealId, canal: "EMAIL", texto: "uns 5 mil euros" }); // orcamento=0
  const r = await processInbound({ dealId, canal: "EMAIL", texto: "é para um amigo, quem decide é ele" }); // decisor=0 → FOTOS
  assert.equal(r.stateAfter, ASSISTANT_STATE.FOTOS);

  const final = await processInbound({ dealId, canal: "EMAIL", texto: "não tenho fotos" });
  assert.equal(final.stateAfter, ASSISTANT_STATE.CONCLUIDO);

  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.qualificationCategory, "FRACO");
  assert.equal(deal.stage, "NOVO_LEAD", "lead FRACO nunca é promovido");
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: { contains: "Triagem humana" } } }), "triagem humana obrigatória — o assistente não descarta leads");
});

test("pergunta de preço escala imediatamente para humano", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const r = await processInbound({ dealId, canal: "EMAIL", texto: "Boa tarde, quanto custa remodelar uma cozinha?" });
  assert.equal(r.stateAfter, ASSISTANT_STATE.ESCALADO);
  const session = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(session.humanTakeover, true);
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: { contains: "escalou" } } }));

  // Depois do escalonamento, o motor ignora novas mensagens (silêncio).
  const after = await processInbound({ dealId, canal: "EMAIL", texto: "então?" });
  assert.equal(after.processed, false);
  assert.equal(after.reason, "takeover_humano");
});

test("opt-out silencia imediatamente e cria tarefa RGPD", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const r = await processInbound({ dealId, canal: "EMAIL", texto: "não me contactem mais, por favor" });
  assert.equal(r.stateAfter, ASSISTANT_STATE.OPT_OUT);
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: { contains: "opt-out" } } }));
  const after = await processInbound({ dealId, canal: "EMAIL", texto: "..." });
  assert.equal(after.processed, false);
});

test("nudges: máximo 3, depois SEM_RESPOSTA com tarefa humana", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "quero remodelar a casa toda" }); // entra em QUALIFICACAO

  const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
  for (let i = 1; i <= 3; i++) {
    await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: old, lastOutboundAt: old } });
    const sweep = await runNudgeSweep();
    assert.ok(sweep.nudged.includes(dealId), `nudge ${i} devia acontecer`);
    const s = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
    assert.equal(s.nudgeCount, i);
  }
  await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: old, lastOutboundAt: old } });
  const final = await runNudgeSweep();
  assert.ok(final.exhausted.includes(dealId));
  const s = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(s.state, ASSISTANT_STATE.SEM_RESPOSTA);
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: { contains: "sem resposta" } } }));
});
