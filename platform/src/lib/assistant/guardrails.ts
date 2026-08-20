/**
 * DS Sales Assistant — guardrails determinísticos (Etapa 2, desenho v2 §4,
 * camada 2 de segurança, aprovado 18.08.2026).
 *
 * Duas direções:
 *  1. OUTBOUND (validateOutboundText): nenhuma mensagem do assistente pode
 *     conter preços, prazos de execução, descontos ou promessas fora do
 *     catálogo. Regra do desenho: mensagem bloqueada NÃO é reformulada —
 *     escala para humano. Isto aplica-se por igual ao texto determinístico
 *     desta etapa e ao texto do LLM na Etapa 3 (o LLM propõe, isto decide).
 *  2. INBOUND (detectEscalationTriggers): gatilhos que obrigam a takeover
 *     humano imediato (desenho v2 §4 — 11 gatilhos; os que dependem de
 *     sinal conversacional detetam-se aqui, os restantes no engine).
 *
 * Deliberadamente sem dependências e sem IO: funções puras, testáveis
 * exaustivamente (ver tests/assistant/guardrails.test.ts).
 */

export interface GuardrailVerdict {
  ok: boolean;
  violations: string[];
}

// Padrões de dinheiro/percentagem: "12.500€", "€ 300", "12 mil euros", "30%".
// CORRIGIDO 20.08.2026 (defeito encontrado pela suite red-team): a versao
// anterior tinha \b DEPOIS da alternacao de moeda, o que fazia falhar todos
// os casos em que "EUR" simbolo era seguido de espaco, ponto ou fim de frase
// — ou seja, quase todas as frases reais ("25.000€.", "800€ por m2"). O \b
// aplica-se agora so as formas por extenso.
const MONEY_RE = /(\d[\d\s.,]*\s?(?:€|\beuros?\b|\beur\b))|(€\s?\d)|(\d+\s?%)|(\b\d+\s?mil\b)/i;
// Compromissos de calendário/execução: datas, durações e promessas de início/fim de obra.
const EXECUTION_DATE_RE = /\b(começamos|comecamos|iniciamos|arrancamos|terminamos|acabamos|entregamos|fica pronto|fica pronta|estará pronto|estara pronto|demora(m)?|leva(m)?\s+(cerca de\s+)?\d+|\d+\s?(dias?|semanas?|meses)\b|prazo de execução|prazo de execucao|data de início|data de inicio)/i;
// Descontos/promoções/negociação de preço.
const DISCOUNT_RE = /\b(desconto|promoç|promoc|oferta especial|baixar o preço|baixar o preco|melhor preço|melhor preco|mais barato|campanha)\b/i;
// Estimativas/valores de orçamento ditos pelo assistente (não confundir com PERGUNTAR a faixa).
const PRICE_COMMITMENT_RE = /\b(custa|custará|custara|fica por|orçamos|orcamos|o valor será|o valor sera|preço final|preco final|cobramos)\b/i;
// Trabalhos fora do catálogo DS (não vendemos serviços avulsos nem especialidades isoladas).
const OUT_OF_CATALOG_RE = /\b(desentupimento|desentupir|jardinagem|mudanças|mudancas|limpeza doméstica|limpeza domestica|reparação de eletrodomésticos|reparacao de eletrodomesticos|piscinas?|furos? artesianos?|painéis solares|paineis solares|telhados?)\b/i;
// Confirmação de visita (proibido: o assistente propõe, nunca confirma — desenho v2 §3).
const VISIT_CONFIRMATION_RE = /\b(visita (está|esta|fica) (confirmada|marcada|agendada)|confirmo a (sua )?visita|fica então marcada|fica entao marcada|agendei a (sua )?visita)\b/i;

export function validateOutboundText(text: string): GuardrailVerdict {
  const violations: string[] = [];
  if (MONEY_RE.test(text) || PRICE_COMMITMENT_RE.test(text)) violations.push("preco_ou_valor");
  if (EXECUTION_DATE_RE.test(text)) violations.push("prazo_ou_data_execucao");
  if (DISCOUNT_RE.test(text)) violations.push("desconto_ou_promocao");
  if (OUT_OF_CATALOG_RE.test(text)) violations.push("fora_de_catalogo");
  if (VISIT_CONFIRMATION_RE.test(text)) violations.push("confirmacao_de_visita");
  return { ok: violations.length === 0, violations };
}

// ── Gatilhos de escalonamento no texto do lead ──

// Alargado 20.08.2026 (red-team): perguntas de preco indiretas — "media por
// metro quadrado", "quanto ficaria", "valor por m2" — nao eram apanhadas.
const ASKS_PRICE_RE = /(\b(quanto custa|quanto fica|quanto ficaria|quanto é|quanto e|preço|preco|orçamento de quanto|orcamento de quanto|valor (aproximado|estimado|por)|dá para fazer por|da para fazer por|estimativa|quanto (é que )?(custam|custaria|cobram))\b)|((média|media|valor|preço|preco|custo)[^.?!]{0,20}(por|\/)\s?(m2|m²|metro quadrado))/i;
const ASKS_DISCOUNT_RE = /\b(desconto|mais barato|baixar o preço|baixar o preco|negociar|melhor oferta)\b/i;
const ASKS_DATES_RE = /\b(quando (podem|conseguem) (começar|comecar)|para quando|quanto tempo demora|prazo de execução|prazo de execucao|data de início|data de inicio)\b/i;
const WANTS_HUMAN_RE = /\b(falar com (uma pessoa|alguém|alguem|um humano|o responsável|o responsavel|o dono|um comercial)|não quero falar com (um |uma )?(robô|robo|bot|máquina|maquina)|nao quero falar com (um |uma )?(robô|robo|bot|máquina|maquina)|chamada|liguem-me|ligar-me|telefonem)\b/i;
const COMPLAINT_RE = /\b(reclamação|reclamacao|péssimo|pessimo|horrível|horrivel|vergonha|enganad[oa]|burla|processar|advogado|livro de reclamações|livro de reclamacoes)\b/i;
const OPT_OUT_RE = /\b(stop|remover|não me contactem|nao me contactem|parem de (me )?enviar|apagar os meus dados|cancelar subscrição|cancelar subscricao|deixem-me em paz)\b/i;
// Urgência EXTREMA (P3 da validação final, aprovada 19.08.2026): situações
// em que o lead precisa de voz humana em minutos, não de um questionário.
// Distinto de urgência comercial normal ("quero avançar o quanto antes"),
// que apenas pontua prazoUrgencia=2 e NÃO dispara este gatilho.
const EXTREME_URGENCY_RE = /\b(infiltraç|infiltrac|inundaç|inundac|alagad|a alagar|cano rebentado|cano roto|rebentou (um |o )?cano|teto (a cair|caiu)|tecto (a cair|caiu)|casa inabitável|casa inabitavel|sem condições para (viver|morar)|sem condicoes para (viver|morar)|emergência|emergencia|urgente mesmo|muito urgente|urgentíssimo|urgentissimo|prazo de escritura|entrega de chaves)\b/i;

export type EscalationTrigger =
  | "pergunta_preco"
  | "pede_desconto"
  | "pergunta_datas_execucao"
  | "pede_humano"
  | "reclamacao"
  | "fora_de_catalogo"
  | "urgencia_extrema";

export interface InboundAnalysis {
  optOut: boolean;
  triggers: EscalationTrigger[];
}

export function detectEscalationTriggers(text: string): InboundAnalysis {
  const t = text || "";
  const triggers: EscalationTrigger[] = [];
  if (ASKS_PRICE_RE.test(t)) triggers.push("pergunta_preco");
  if (ASKS_DISCOUNT_RE.test(t)) triggers.push("pede_desconto");
  if (ASKS_DATES_RE.test(t)) triggers.push("pergunta_datas_execucao");
  if (WANTS_HUMAN_RE.test(t)) triggers.push("pede_humano");
  if (COMPLAINT_RE.test(t)) triggers.push("reclamacao");
  if (OUT_OF_CATALOG_RE.test(t)) triggers.push("fora_de_catalogo");
  if (EXTREME_URGENCY_RE.test(t)) triggers.push("urgencia_extrema");
  return { optOut: OPT_OUT_RE.test(t), triggers };
}

/** Limites duros (desenho v2 §4). Centralizados para os testes os afirmarem. */
export const HARD_LIMITS = {
  MAX_NUDGES: 3,
  MAX_ASSISTANT_MESSAGES_PER_CONVERSATION_PER_DAY: 12,
  MAX_TURNS_WITHOUT_PROGRESS: 2,
} as const;
