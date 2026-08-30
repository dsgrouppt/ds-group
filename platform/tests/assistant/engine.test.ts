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

  // 2) Localização — zona prioritária atual (Leiria), para o percurso
  // "perfeito" atingir mesmo o score máximo (10) sob o modelo de cobertura
  // nacional (missão CTO 29.08.2026).
  r = await processInbound({ dealId, canal: "WHATSAPP", texto: "O apartamento é em Leiria" });
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
  await processInbound({ dealId, canal: "EMAIL", texto: "é na Amadora" }); // localizacao não reconhecida (undefined)
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
  // Após P1 (19.08.2026), uma nova mensagem em OPT_OUT já não é ignorada:
  // é tratada como reativação (tarefa RGPD para decisão humana), mas
  // continua a NÃO haver qualquer resposta automática ao lead.
  const after = await processInbound({ dealId, canal: "EMAIL", texto: "..." });
  assert.equal(after.stateAfter, ASSISTANT_STATE.OPT_OUT, "o estado nunca muda sozinho");
  assert.equal(after.plannedMessages.length, 0, "silêncio absoluto para quem pediu opt-out");
});

// Instante fixo DENTRO do horário comercial (terça, 25.08.2026, 11:00 Lisboa)
// e outro FORA (04:00 Lisboa) — decisão 6.3.
const NOW_BIZ = new Date("2026-08-25T10:00:00Z");
const NOW_NIGHT = new Date("2026-08-25T03:00:00Z");
const backdate = (ms: number) => new Date(NOW_BIZ.getTime() - ms);
const DAY = 24 * 60 * 60 * 1000;

test("nudges: cadência progressiva 24h/72h/7d, máx. 3, depois SEM_RESPOSTA (6.2)", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "quero remodelar a casa toda" }); // entra em QUALIFICACAO

  // Nudge 1: devido às 24h — com 25h de silêncio, dispara.
  await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: backdate(25 * 60 * 60 * 1000), lastOutboundAt: backdate(25 * 60 * 60 * 1000), createdAt: backdate(30 * 60 * 60 * 1000) } });
  let sweep = await runNudgeSweep(NOW_BIZ);
  assert.ok(sweep.nudged.includes(dealId), "nudge 1 às 24h devia disparar");

  // Nudge 2: exige 72h desde o nudge 1 — com só 25h, NÃO dispara.
  await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: backdate(25 * 60 * 60 * 1000), lastOutboundAt: backdate(25 * 60 * 60 * 1000) } });
  sweep = await runNudgeSweep(NOW_BIZ);
  assert.equal(sweep.nudged.includes(dealId), false, "nudge 2 antes de 72h NÃO devia disparar");

  // Com 4 dias de silêncio, o nudge 2 dispara; e o 3 exige 7 dias.
  await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: backdate(4 * DAY), lastOutboundAt: backdate(4 * DAY), createdAt: backdate(20 * DAY) } });
  sweep = await runNudgeSweep(NOW_BIZ);
  assert.ok(sweep.nudged.includes(dealId), "nudge 2 às 72h devia disparar");

  await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: backdate(8 * DAY), lastOutboundAt: backdate(8 * DAY) } });
  sweep = await runNudgeSweep(NOW_BIZ);
  assert.ok(sweep.nudged.includes(dealId), "nudge 3 aos 7 dias devia disparar");
  const s3 = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(s3.nudgeCount, 3);

  // Esgotados: mais 7 dias de silêncio → SEM_RESPOSTA + tarefa humana.
  await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: backdate(8 * DAY), lastOutboundAt: backdate(8 * DAY) } });
  const final = await runNudgeSweep(NOW_BIZ);
  assert.ok(final.exhausted.includes(dealId));
  const s = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(s.state, ASSISTANT_STATE.SEM_RESPOSTA);
  assert.ok(await prisma.task.findFirst({ where: { dealId, title: { contains: "sem resposta" } } }));
});

test("nudges: nunca fora do horário comercial (6.3)", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "quero remodelar a casa toda" });
  await prisma.assistantSession.update({ where: { dealId }, data: { lastInboundAt: backdate(8 * DAY), lastOutboundAt: backdate(8 * DAY), createdAt: backdate(9 * DAY) } });
  const sweep = await runNudgeSweep(NOW_NIGHT);
  assert.equal(sweep.skippedReason, "fora_de_horario_comercial");
  assert.equal(sweep.nudged.length, 0);
});

test("reativação SEM_RESPOSTA (P1): lead que volta escala imediatamente para humano", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await prisma.assistantSession.update({ where: { dealId }, data: { state: ASSISTANT_STATE.SEM_RESPOSTA, nudgeCount: 3 } });

  const r = await processInbound({ dealId, canal: "EMAIL", texto: "olá, afinal quero avançar com a obra" });
  assert.equal(r.processed, true);
  assert.equal(r.stateAfter, ASSISTANT_STATE.ESCALADO);
  const s = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId } });
  assert.equal(s.humanTakeover, true);
  const task = await prisma.task.findFirstOrThrow({ where: { dealId, title: { contains: "escalou" } } });
  assert.equal(task.priority, "URGENTE");
  assert.match(task.description ?? "", /nudges esgotados/);
});

test("reativação CONCLUIDO (P1): tarefa NORMAL deduplicada a 24h", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await prisma.assistantSession.update({ where: { dealId }, data: { state: ASSISTANT_STATE.CONCLUIDO } });

  const r1 = await processInbound({ dealId, canal: "EMAIL", texto: "afinal talvez queira algo maior" });
  assert.equal(r1.processed, true);
  assert.equal(r1.stateAfter, ASSISTANT_STATE.CONCLUIDO);
  assert.equal(await prisma.task.count({ where: { dealId, title: { contains: "retomou contacto" } } }), 1);

  const r2 = await processInbound({ dealId, canal: "EMAIL", texto: "estão aí?" });
  assert.equal(r2.reason, "reativacao_deduplicada");
  assert.equal(await prisma.task.count({ where: { dealId, title: { contains: "retomou contacto" } } }), 1, "não pode duplicar a tarefa em 24h");
});

test("reativação OPT_OUT (P1): tarefa ALTA (RGPD) e ZERO resposta automática", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await prisma.assistantSession.update({ where: { dealId }, data: { state: ASSISTANT_STATE.OPT_OUT } });

  const r = await processInbound({ dealId, canal: "EMAIL", texto: "afinal podem contactar-me" });
  assert.equal(r.processed, true);
  assert.equal(r.stateAfter, ASSISTANT_STATE.OPT_OUT, "estado não muda — decisão humana");
  assert.equal(r.plannedMessages.length, 0, "nenhuma resposta automática a um lead em opt-out");
  const task = await prisma.task.findFirstOrThrow({ where: { dealId, title: { contains: "opt-out voltou" } } });
  assert.equal(task.priority, "ALTA");
});

test("fora de Portugal (cobertura nacional, missão CTO 29.08.2026): pontua 0, completa o guião e chega à triagem — nunca 'sem progresso'", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "quero remodelar a casa toda" }); // tipoObra=2
    // Espanha é expansão prevista para 2027 (ainda não é operação atual) —
    // é o único caso real de localizacao=0 sob o novo modelo. Uma cidade
    // portuguesa (mesmo fora da zona prioritária, ex.: Faro) já não pontua 0.
    const r = await processInbound({ dealId, canal: "EMAIL", texto: "a casa é em Madrid, Espanha" }); // localizacao=0 → guião continua
    assert.equal(r.stateAfter, ASSISTANT_STATE.QUALIFICACAO, "não pode escalar por zona");
    await processInbound({ dealId, canal: "EMAIL", texto: "o quanto antes" }); // prazo=2
    await processInbound({ dealId, canal: "EMAIL", texto: "uns 60 mil" }); // orcamento=2
    await processInbound({ dealId, canal: "EMAIL", texto: "decido eu" }); // decisor=2 → FOTOS
    const fim = await processInbound({ dealId, canal: "EMAIL", texto: "não tenho fotos" });
    const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
    assert.equal(deal.qualificationScore, 8, "2+0+2+2+2 — zona 0 não interrompe nada");
    assert.equal(fim.stateAfter, ASSISTANT_STATE.AGENDAMENTO, "QUALIFICADO segue para visita; zona vai no dossier");
});

test("Portugal fora da zona prioritária (cobertura nacional): pontua 1, nunca 0", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "quero remodelar a casa toda" }); // tipoObra=2
  const r = await processInbound({ dealId, canal: "EMAIL", texto: "a casa é em Faro" }); // localizacao=1 (Portugal, fora da zona prioritária)
  assert.equal(r.stateAfter, ASSISTANT_STATE.QUALIFICACAO);
  await processInbound({ dealId, canal: "EMAIL", texto: "o quanto antes" }); // prazo=2
  await processInbound({ dealId, canal: "EMAIL", texto: "uns 60 mil" }); // orcamento=2
  await processInbound({ dealId, canal: "EMAIL", texto: "decido eu" }); // decisor=2 → FOTOS
  const fim = await processInbound({ dealId, canal: "EMAIL", texto: "não tenho fotos" });
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.qualificationScore, 9, "2+1+2+2+2 — Faro é Portugal, não é 'fora de área'");
  assert.equal(fim.stateAfter, ASSISTANT_STATE.AGENDAMENTO);
  });

test("zona não reconhecida (6.1): assistente NÃO decide limítrofe — marca por avaliar e triagem humana no fecho", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "quero remodelar a casa toda" }); // tipoObra=2
  await processInbound({ dealId, canal: "EMAIL", texto: "é em Rio de Mouro" }); // não reconhecida → repergunta
  const r2 = await processInbound({ dealId, canal: "EMAIL", texto: "já disse, Rio de Mouro" }); // 2.ª volta → skip, segue
  assert.equal(r2.stateAfter, ASSISTANT_STATE.QUALIFICACAO, "não escala por 'sem progresso'");
  await processInbound({ dealId, canal: "EMAIL", texto: "o quanto antes" });
  await processInbound({ dealId, canal: "EMAIL", texto: "uns 60 mil" });
  await processInbound({ dealId, canal: "EMAIL", texto: "decido eu" }); // 4/5 + localizacao por avaliar → FOTOS
  const fim = await processInbound({ dealId, canal: "EMAIL", texto: "não tenho fotos" });
  assert.equal(fim.stateAfter, ASSISTANT_STATE.ESCALADO, "fecho sem os 5 critérios → triagem humana");
  const task = await prisma.task.findFirstOrThrow({ where: { dealId, title: { contains: "escalou" } } });
  assert.match(task.description ?? "", /localizacao/);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.qualificationScore, null, "o score fica para o humano preencher");
});

test("urgência extrema (P3): salta a qualificação e escala com mensagem de transição", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  const r = await processInbound({ dealId, canal: "EMAIL", texto: "tenho uma infiltração, a casa está a alagar!" });
  assert.equal(r.stateAfter, ASSISTANT_STATE.ESCALADO);
  assert.ok(r.plannedMessages.some((m) => m.includes("Compreendo a urgência")), "mensagem de transição urgente planeada");
  const task = await prisma.task.findFirstOrThrow({ where: { dealId, title: { contains: "escalou" } } });
  assert.match(task.description ?? "", /URGENTE — contactar por telefone/);
});

test("POTENCIAL (P4): sem promoção no pipeline; visita com tarefa ALTA e nota de validação", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "queria remodelar a cozinha" }); // tipoObra=1
  await processInbound({ dealId, canal: "EMAIL", texto: "fica em Leiria" }); // localizacao=2 (zona prioritária)
  await processInbound({ dealId, canal: "EMAIL", texto: "estou só a pesquisar, sem pressa" }); // prazo=0
  await processInbound({ dealId, canal: "EMAIL", texto: "uns 25 mil" }); // orcamento=1
  await processInbound({ dealId, canal: "EMAIL", texto: "tenho de falar com o meu marido primeiro" }); // decisor=1 → total 5 = POTENCIAL
  const fotos = await processInbound({ dealId, canal: "EMAIL", texto: "não tenho fotos" });
  assert.equal(fotos.stateAfter, ASSISTANT_STATE.AGENDAMENTO);

  const deal1 = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal1.qualificationCategory, "POTENCIAL");
  assert.equal(deal1.stage, "NOVO_LEAD", "POTENCIAL nunca é promovido pelo assistente");

  const r = await processInbound({ dealId, canal: "EMAIL", texto: "posso na quarta de manhã" });
  assert.equal(r.stateAfter, ASSISTANT_STATE.VISITA_PROPOSTA);
  const task = await prisma.task.findFirstOrThrow({ where: { dealId, title: { contains: "Confirmar visita" } } });
  assert.equal(task.priority, "ALTA");
  assert.match(task.description ?? "", /POTENCIAL \(score 5\/10\) — validar por telefone/);
});

test("recusa de orçamento (P5): aceita, segue o guião e o fecho vai a triagem humana com motivo específico", async () => {
  const { dealId } = await createLead();
  await ensureSession(dealId, "EMAIL");
  await processInbound({ dealId, canal: "EMAIL", texto: "quero remodelar a casa toda" }); // tipoObra=2
  await processInbound({ dealId, canal: "EMAIL", texto: "fica em Leiria" }); // localizacao=2 (zona prioritária)
  await processInbound({ dealId, canal: "EMAIL", texto: "o quanto antes" }); // prazo=2
  const rec = await processInbound({ dealId, canal: "EMAIL", texto: "prefiro não dizer" }); // orcamento recusado → segue
  assert.equal(rec.stateAfter, ASSISTANT_STATE.QUALIFICACAO, "não repete a pergunta nem escala");
  assert.ok(rec.plannedMessages.some((m) => m.includes("Sem problema")), "aceita a recusa com naturalidade");
  await processInbound({ dealId, canal: "EMAIL", texto: "decido eu" }); // decisor=2 → FOTOS (4/5 + recusado)
  const fim = await processInbound({ dealId, canal: "EMAIL", texto: "não tenho fotos" });
  assert.equal(fim.stateAfter, ASSISTANT_STATE.ESCALADO, "régua exige os 5 → triagem humana");
  const task = await prisma.task.findFirstOrThrow({ where: { dealId, title: { contains: "escalou" } } });
  assert.match(task.description ?? "", /orcamento/);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
  assert.equal(deal.qualificationScore, null, "score nunca é fechado automaticamente sem os 5");
});
