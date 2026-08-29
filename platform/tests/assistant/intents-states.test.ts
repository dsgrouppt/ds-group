import test from "node:test";
import assert from "node:assert/strict";
import {
  scoreLocalizacao,
  scoreTipoObra,
  scoreOrcamento,
  scorePrazo,
  scoreDecisor,
  extractBudgetEur,
  looksLikeAvailability,
  recusaOrcamento,
} from "../../src/lib/assistant/intents";
import { ASSISTANT_STATE, TERMINAL_STATES, transitionAllowed, isAssistantState } from "../../src/lib/assistant/states";

test("localização (cobertura nacional, missão CTO 29.08.2026): prioritária=2, resto de Portugal=1, estrangeiro=0, não reconhecida=undefined", () => {
  // Zona prioritária atual (Leiria) → 2.
  assert.equal(scoreLocalizacao("a obra é em Leiria"), 2);
  assert.equal(scoreLocalizacao("moro em Leiria, perto do centro"), 2);
  // Resto de Portugal (incl. cidades antes tratadas como "fora de área", e
     // as ilhas) → 1, nunca 0: não há exclusão geográfica nacional.
  assert.equal(scoreLocalizacao("O apartamento fica em Cascais"), 1);
  assert.equal(scoreLocalizacao("moro no Porto"), 1);
  assert.equal(scoreLocalizacao("a casa é em Lisboa"), 1);
  assert.equal(scoreLocalizacao("a casa é em Faro"), 1);
  assert.equal(scoreLocalizacao("fica no Algarve"), 1);
  assert.equal(scoreLocalizacao("moro no Funchal, Madeira"), 1);
  // Fora de Portugal → 0 (Espanha é expansão prevista 2027, ainda não é
     // operação atual) — o guião CONTINUA, o assistente nunca rejeita por zona.
  assert.equal(scoreLocalizacao("fica no estrangeiro, em Paris"), 0);
  assert.equal(scoreLocalizacao("moro em Madrid, Espanha"), 0);
  // Zona não reconhecida → undefined: o assistente NUNCA decide sozinho
     // (decisão 6.1) — segue para triagem humana via skip.
  assert.equal(scoreLocalizacao("é na Amadora"), undefined);
  assert.equal(scoreLocalizacao("é em Rio de Mouro"), undefined);
  assert.equal(scoreLocalizacao(""), undefined);
});

test("recusa de orçamento (P5): detetada e distinta de valor/incompreensão", () => {
  assert.equal(recusaOrcamento("prefiro não dizer"), true);
  assert.equal(recusaOrcamento("não tenho um valor definido"), true);
  assert.equal(recusaOrcamento("isso é privado"), true);
  assert.equal(recusaOrcamento("uns 30 mil"), false);
  assert.equal(recusaOrcamento("o que é que acham?"), false);
});

test("tipo de obra: completa=2, parcial=1, avulso=0, ambíguo=undefined", () => {
  assert.equal(scoreTipoObra("quero uma remodelação completa do T3"), 2);
  assert.equal(scoreTipoObra("remodelar a cozinha"), 1);
  assert.equal(scoreTipoObra("só pintura de uma sala"), 0);
  assert.equal(scoreTipoObra("uma coisa aí"), undefined);
});

test("extração de orçamento em euros", () => {
  assert.equal(extractBudgetEur("uns 30 mil"), 30000);
  assert.equal(extractBudgetEur("45.000€"), 45000);
  assert.equal(extractBudgetEur("tenho 45k"), 45000);
  assert.equal(extractBudgetEur("entre 30 e 50 mil"), 50000);
  assert.equal(extractBudgetEur("não sei"), undefined);
});

test("orçamento: régua de business-rules (mínimo 20k, alvo 30k+)", () => {
  assert.equal(scoreOrcamento("uns 10 mil euros"), 0);
  assert.equal(scoreOrcamento("25 mil"), 1);
  assert.equal(scoreOrcamento("cerca de 60.000€"), 2);
  assert.equal(scoreOrcamento("logo se vê"), undefined);
});

test("prazo: 1-3 meses=2, prazo longo=1, só a pesquisar=0", () => {
  assert.equal(scorePrazo("queria começar o quanto antes"), 2);
  assert.equal(scorePrazo("talvez no verão"), 1);
  assert.equal(scorePrazo("estou só a pesquisar, sem pressa"), 0);
  assert.equal(scorePrazo("hmm"), undefined);
});

test("decisor: decide=2, conjunto com ausente=1, não decide=0", () => {
  assert.equal(scoreDecisor("sou eu que decido"), 2);
  assert.equal(scoreDecisor("decidimos os dois, eu e a minha mulher"), 2);
  assert.equal(scoreDecisor("tenho de falar com o meu marido primeiro"), 1);
  assert.equal(scoreDecisor("é para um amigo, quem decide é ele"), 0);
});

test("deteção de disponibilidades", () => {
  assert.equal(looksLikeAvailability("posso na terça de manhã ou quinta às 18h"), true);
  assert.equal(looksLikeAvailability("amanhã depois das 17:30"), true);
  assert.equal(looksLikeAvailability("ok obrigado"), false);
});

test("máquina de estados: transições legais e ilegais", () => {
  assert.equal(transitionAllowed(ASSISTANT_STATE.AGUARDA_CONTACTO, ASSISTANT_STATE.CONTACTADO), true);
  assert.equal(transitionAllowed(ASSISTANT_STATE.CONTACTADO, ASSISTANT_STATE.QUALIFICACAO), true);
  assert.equal(transitionAllowed(ASSISTANT_STATE.QUALIFICACAO, ASSISTANT_STATE.FOTOS), true);
  assert.equal(transitionAllowed(ASSISTANT_STATE.CLASSIFICADO, ASSISTANT_STATE.AGENDAMENTO), true);
  assert.equal(transitionAllowed(ASSISTANT_STATE.AGENDAMENTO, ASSISTANT_STATE.VISITA_PROPOSTA), true);
  // Ilegais: saltos e regressões
  assert.equal(transitionAllowed(ASSISTANT_STATE.AGUARDA_CONTACTO, ASSISTANT_STATE.VISITA_PROPOSTA), false);
  assert.equal(transitionAllowed(ASSISTANT_STATE.VISITA_PROPOSTA, ASSISTANT_STATE.QUALIFICACAO), false);
  assert.equal(transitionAllowed("INVENTADO", ASSISTANT_STATE.CONTACTADO), false);
  assert.equal(transitionAllowed(ASSISTANT_STATE.CONTACTADO, "INVENTADO"), false);
});

test("estados terminais: única saída legal é SEM_RESPOSTA→ESCALADO (P1, reativação)", () => {
  for (const s of TERMINAL_STATES) {
    assert.ok(isAssistantState(s));
    for (const to of Object.values(ASSISTANT_STATE)) {
      const permitida = s === ASSISTANT_STATE.SEM_RESPOSTA && to === ASSISTANT_STATE.ESCALADO;
      assert.equal(transitionAllowed(s, to), permitida, `${s} -> ${to} devia ser ${permitida ? "permitido" : "proibido"}`);
    }
  }
});
