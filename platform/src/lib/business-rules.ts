/**
 * Decisões de negócio já aprovadas (Diogo, CEO/COO) que o código consome
 * diretamente — fonte única destes valores, para não ficarem espalhados
 * como "números mágicos". Não alterar sem nova aprovação explícita.
 * Ver docs/05_Processo_Comercial_Operacional_DS.md e a missão CTO de
 * ago/2026 que fechou estes valores.
 */

// Área de atuação (doc 05 §3 — critério "Localização" da qualificação).
export const SERVICE_AREA_CITIES = [
  "Lisboa",
  "Porto",
  "Cascais",
  "Oeiras",
  "Sintra",
  "Vila Nova de Gaia",
  "Matosinhos",
  "Almada",
] as const;

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
