/**
 * Decisões de negócio já aprovadas (Diogo, CEO/COO) que o código consome
 * diretamente — fonte única destes valores, para não ficarem espalhados
 * como "números mágicos". Não alterar sem nova aprovação explícita.
 * Ver docs/05_Processo_Comercial_Operacional_DS.md e a missão CTO de
 * ago/2026 que fechou estes valores.
 */

// Área de atuação (doc 05 §3 — critério "Localização" da qualificação).
//
// Regra de negócio definitiva (missão CTO 29.08.2026, substitui a lista
// fechada de 8 concelhos Lisboa/Porto aprovada em ago/2026): a DS Projects
// trabalha em TODO O TERRITÓRIO NACIONAL (Portugal continental e ilhas) —
// não existe exclusão geográfica. Para obras fora da zona prioritária,
// procuram-se e validam-se profissionais/subempreiteiros na região da obra.
// Espanha é expansão prevista para 2027 — NÃO é operação atual.
//
// PRIORITY_AREAS não é um limite: é só a(s) zona(s) de maior concentração
// de serviço *atual*, usada para dar prioridade/pontuação máxima na
// qualificação. Qualquer outra localização em Portugal é igualmente válida
// (ver scoreLocalizacao em assistant/intents.ts e QUALIFICATION_CRITERIA em
// qualification.ts), só entra com pontuação diferente porque pode implicar
// mais deslocação/validação operacional — nunca porque está "fora de área".
// Deliberadamente uma lista curta (não uma lista artificial de todos os
// concelhos do país): acrescentar aqui só quando uma nova zona passar a ter
// concentração de obras equivalente a Leiria.
export const PRIORITY_AREAS = ["Leiria"] as const;

// Orçamento mínimo viável e faixa alvo (doc 05 §3 — critério "Orçamento").
// Espelha BUDGET_RANGE em enums.ts: R20_30K é o mínimo viável mas abaixo da
// faixa alvo (1 ponto); R30_75K/R75_150K/R150K_PLUS estão na faixa alvo ou
// acima (2 pontos).
export const MIN_VIABLE_BUDGET_EUR = 20_000;
export const TARGET_BUDGET_RANGE_EUR = { min: 30_000, max: 150_000 } as const; // 150k+ em aberto

// Horário comercial (para o SLA de primeiro contacto, doc 05 §2).
export const BUSINESS_HOURS = {
  timeZone: "Europe/Lisbon",
  days: new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]),
  startHour: 9,
  endHour: 19,
} as const;

export const SLA_FIRST_CONTACT_MINUTES_IN_HOURS = 15;
export const SLA_FIRST_CONTACT_MINUTES_OUT_OF_HOURS = 120;
