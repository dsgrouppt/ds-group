import test from "node:test";
import assert from "node:assert/strict";
import { validateOutboundText, detectEscalationTriggers, HARD_LIMITS } from "../../src/lib/assistant/guardrails";
import { ENGINE_MESSAGES } from "../../src/lib/assistant/engine";
import { CRITERIA_QUESTIONS } from "../../src/lib/assistant/intents";

test("outbound: bloqueia preços e valores monetários", () => {
  for (const t of [
    "A obra custa 12.500€",
    "fica por 30 mil euros",
    "cobramos 300€ por dia",
    "o valor será € 45.000",
    "com 20% de sinal",
  ]) {
    assert.equal(validateOutboundText(t).ok, false, `devia bloquear: ${t}`);
  }
});

test("outbound: bloqueia prazos e datas de execução", () => {
  for (const t of [
    "começamos na próxima semana",
    "a obra demora 3 semanas",
    "entregamos em 30 dias",
    "fica pronto em maio",
  ]) {
    assert.equal(validateOutboundText(t).ok, false, `devia bloquear: ${t}`);
  }
});

test("outbound: bloqueia descontos e promoções", () => {
  for (const t of ["temos um desconto para si", "oferta especial este mês", "conseguimos um melhor preço"]) {
    assert.equal(validateOutboundText(t).ok, false, `devia bloquear: ${t}`);
  }
});

test("outbound: bloqueia confirmação de visita e fora de catálogo", () => {
  assert.equal(validateOutboundText("A sua visita está confirmada para amanhã").ok, false);
  assert.equal(validateOutboundText("Agendei a sua visita").ok, false);
  assert.equal(validateOutboundText("Também fazemos desentupimentos e telhados").ok, false);
});

test("outbound: permite mensagens comerciais neutras", () => {
  for (const t of [
    "Obrigado pelo seu contacto. Pode dizer-me em que cidade fica o imóvel?",
    "A nossa equipa vai entrar em contacto consigo.",
    "Pode enviar fotografias do espaço por aqui.",
  ]) {
    const v = validateOutboundText(t);
    assert.equal(v.ok, true, `não devia bloquear: ${t} (${v.violations.join(",")})`);
  }
});

test("todas as mensagens fixas do motor passam os guardrails", () => {
  for (const [key, msg] of Object.entries({ ...ENGINE_MESSAGES, ...CRITERIA_QUESTIONS })) {
    const v = validateOutboundText(msg);
    assert.equal(v.ok, true, `mensagem do motor "${key}" viola guardrails: ${v.violations.join(",")}`);
  }
});

test("inbound: deteta gatilhos de escalonamento", () => {
  assert.ok(detectEscalationTriggers("quanto custa remodelar a cozinha?").triggers.includes("pergunta_preco"));
  assert.ok(detectEscalationTriggers("fazem desconto?").triggers.includes("pede_desconto"));
  assert.ok(detectEscalationTriggers("quando podem começar a obra?").triggers.includes("pergunta_datas_execucao"));
  assert.ok(detectEscalationTriggers("quero falar com uma pessoa, não com um robô").triggers.includes("pede_humano"));
  assert.ok(detectEscalationTriggers("isto é uma vergonha, vou apresentar reclamação").triggers.includes("reclamacao"));
  assert.ok(detectEscalationTriggers("preciso de arranjar o telhado").triggers.includes("fora_de_catalogo"));
});

test("inbound: deteta opt-out e não confunde com conversa normal", () => {
  assert.equal(detectEscalationTriggers("STOP").optOut, true);
  assert.equal(detectEscalationTriggers("não me contactem mais").optOut, true);
  assert.equal(detectEscalationTriggers("quero remodelar a minha casa em Cascais").optOut, false);
  assert.deepEqual(detectEscalationTriggers("quero remodelar a minha casa em Cascais").triggers, []);
});

test("limites duros do desenho v2 estão em vigor", () => {
  assert.equal(HARD_LIMITS.MAX_NUDGES, 3);
  assert.equal(HARD_LIMITS.MAX_TURNS_WITHOUT_PROGRESS, 2);
  assert.ok(HARD_LIMITS.MAX_ASSISTANT_MESSAGES_PER_CONVERSATION_PER_DAY <= 20);
});
