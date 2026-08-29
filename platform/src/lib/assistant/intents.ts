/**
 * DS Sales Assistant — interpretação determinística das respostas do lead
 * (Etapa 2). Sem IA: heurísticas de texto em PT, deliberadamente
 * CONSERVADORAS — na dúvida devolvem `undefined` (o motor volta a
 * perguntar ou escala), nunca inventam uma classificação. Na Etapa 3 o
 * LLM substitui esta camada como *proposta*, mas a régua (0/1/2 por
 * critério) e a validação continuam a ser as de src/lib/qualification.ts.
 *
 * Reutiliza as regras de negócio existentes (business-rules.ts) — nunca
 * valores próprios.
 */

import { PRIORITY_AREAS, MIN_VIABLE_BUDGET_EUR, TARGET_BUDGET_RANGE_EUR } from "@/lib/business-rules";
import type { QualificationCriterionKey, QualificationCriterionScore } from "@/lib/qualification";

function normalize(text: string): string {
  return (text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Localização — cobertura NACIONAL (missão CTO 29.08.2026, substitui a
 * lista fechada de 8 concelhos e a lista OUT_OF_AREA_PT anteriores, que
 * tratavam a maior parte do país — incluindo Leiria — como "fora de
 * área"). A DS Projects trabalha em todo o território nacional; não existe
 * exclusão geográfica. A pontuação reflete operação/deslocação, nunca uma
 * rejeição por zona:
 *  - 2 = zona prioritária atual (PRIORITY_AREAS, business-rules.ts —
 *        maior concentração de serviço agora, ex.: Leiria);
 *  - 1 = qualquer outra localização em Portugal (continente ou ilhas) —
 *        válida, só implica confirmar deslocação/subempreiteiro local;
 *  - 0 = claramente fora de Portugal (estrangeiro) — Espanha é expansão
 *        prevista para 2027, ainda não é operação atual. O guião CONTINUA
 *        e o lead chega à triagem humana com o dossier completo; o
 *        assistente nunca rejeita automaticamente por zona;
 *  - undefined = zona não reconhecida — o motor repergunta uma vez e, se
 *        continuar sem reconhecer, marca o critério como "por avaliar" e
 *        entrega à triagem humana no fecho (ver engine.ts).
 *
 * Lista de cidades reconhecidas deliberadamente curta (não é uma lista
 * exaustiva de concelhos de Portugal) — serve só para reconhecer texto
 * livre do lead com confiança; qualquer cidade portuguesa não listada cai
 * em "zona não reconhecida" (repergunta), nunca em "fora de área".
 */
const PT_OTHER_RECOGNIZED = ["lisboa", "porto", "cascais", "oeiras", "sintra", "vila nova de gaia", "matosinhos", "almada", "faro", "portimao", "albufeira", "lagos", "tavira", "olhao", "evora", "beja", "coimbra", "aveiro", "viseu", "guarda", "castelo branco", "portalegre", "santarem", "braganca", "vila real", "viana do castelo", "covilha", "funchal", "madeira", "ponta delgada", "angra do heroismo", "acores", "algarve", "alentejo"];
const FOREIGN_HINTS = ["paris", "londres", "london", "madrid", "barcelona", "espanha", "genebra", "zurique", "luxemburgo", "bruxelas", "franca", "inglaterra", "suica", "alemanha", "estrangeiro", "fora de portugal", "luanda", "maputo", "brasil", "sao paulo"];

export function scoreLocalizacao(text: string): QualificationCriterionScore | undefined {
  const t = normalize(text);
  if (!t.trim()) return undefined;
  for (const city of PRIORITY_AREAS) { if (t.includes(normalize(city))) return 2; }
  if (FOREIGN_HINTS.some((z) => t.includes(z))) return 0;
  if (PT_OTHER_RECOGNIZED.some((z) => t.includes(z))) return 1;
  return undefined;
}

/** Tipo de obra: 2 = remodelação completa/gestão integral; 1 = parcial (1–2 divisões); 0 = trabalho avulso. */
export function scoreTipoObra(text: string): QualificationCriterionScore | undefined {
  const t = normalize(text);
  if (!t.trim()) return undefined;
  // Avulso primeiro (mais específico): "só pintura de uma sala" é avulso, mesmo mencionando uma divisão — a ordem dos testes é deliberada.
  if (/(so pintura|apenas pintura|so pintar|pintar (uma|a) parede|trocar (uma|a) torneira|pequeno arranjo|arranjo pontual|reparacao pontual|so o chao|apenas o chao|trocar o chao de uma)/.test(t)) return 0;
  if (/(remodelacao (total|completa|integral)|casa (toda|inteira)|apartamento (todo|inteiro)|obra completa|gestao (integral|completa|do projeto)|remodelar tudo|t[0-9]\s?(completo|todo|inteiro))/.test(t)) return 2;
  if (/(cozinha|casa de banho|casas de banho|wc|quarto|sala|sotao|garagem|varanda|marquise|uma divisao|duas divisoes)/.test(t)) return 1;
  return undefined;
}

/** Extrai um valor em euros do texto ("30 mil", "45.000€", "entre 30 e 50 mil"). Devolve o MAIOR valor referido. */
export function extractBudgetEur(text: string): number | undefined {
  const t = normalize(text).replace(/ /g, " ");
  let max: number | undefined;
  const consider = (n: number) => { if (Number.isFinite(n) && n > 0) max = max === undefined ? n : Math.max(max, n); };
  // "30 mil", "30m€" — milhares por extenso.
for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s*mil/g)) { consider(parseFloat(m[1].replace(",", ".")) * 1000); }
  // "45.000", "45000", "45 000" (com ou sem €/euros por perto).
for (const m of t.matchAll(/(\d{1,3}(?:[\s.]\d{3})+|\d{4,})(?!\s*mil)/g)) { consider(parseInt(m[1].replace(/[\s.]/g, ""), 10)); }
  // "45k"
for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s*k\b/g)) { consider(parseFloat(m[1].replace(",", ".")) * 1000); }
  return max;
}

/**
 * Recusa explícita de indicar orçamento (P5 da validação final, aprovada
 * 19.08.2026) — DISTINTA de incompreensão: o lead percebeu a pergunta e
 * não quer/não sabe responder. O motor aceita, segue o guião sem pontuar,
 * e o fecho vai a triagem humana (a régua exige os 5 critérios).
 */
export function recusaOrcamento(text: string): boolean {
  const t = normalize(text);
  return /(nao digo|prefiro nao (dizer|responder|partilhar)|nao (te|lhe|vos) digo|nao tenho (um )?(valor|orcamento) (definido|em mente|pensado)|nao sei mesmo|nao faco ideia|sem orcamento definido|logo se ve|nao quero (dizer|responder|partilhar)|isso e (privado|comigo)|depende do que for preciso)/.test(t);
}

/** Orçamento: régua de business-rules — 0 abaixo do mínimo viável; 1 dentro mas incerto; 2 na faixa alvo. */
export function scoreOrcamento(text: string): QualificationCriterionScore | undefined {
  const t = normalize(text);
  if (!t.trim()) return undefined;
  if (/(nao sei|nao faco ideia|sem orcamento|logo se ve|depende|nao pensei nisso)/.test(t)) return undefined;
  const value = extractBudgetEur(t);
  if (value === undefined) return undefined;
  if (value < MIN_VIABLE_BUDGET_EUR) return 0;
  if (value >= TARGET_BUDGET_RANGE_EUR.min) return 2;
  return 1; // >= mínimo viável mas abaixo da faixa alvo
}

/** Prazo/urgência: 2 = 1–3 meses; 1 = prazo definido mas longo; 0 = só a pesquisar. */
export function scorePrazo(text: string): QualificationCriterionScore | undefined {
  const t = normalize(text);
  if (!t.trim()) return undefined;
  if (/(o quanto antes|ja|urgente|este mes|proximo mes|proximas semanas|imediato|assim que possivel|quanto antes|1 a 3 meses|dois meses|tres meses|um mes)/.test(t)) return 2;
  if (/(este ano|para o ano|daqui a (uns|alguns) meses|segundo semestre|primeiro semestre|seis meses|6 meses|no verao|no inverno|na primavera|no outono)/.test(t)) return 1;
  if (/(so a pesquisar|apenas a ver|sem pressa|ainda nao sei quando|um dia|sem data|so curiosidade|a sondar)/.test(t)) return 0;
  return undefined;
}

/** Decisor: 2 = decide (só ou com decisores presentes); 1 = decide em conjunto com ausente; 0 = não decide. */
export function scoreDecisor(text: string): QualificationCriterionScore | undefined {
  const t = normalize(text);
  if (!t.trim()) return undefined;
  if (/(sou eu que decido|decido eu|a decisao e minha|eu e o meu marido|eu e a minha mulher|eu e o meu companheiro|eu e a minha companheira|decidimos os dois|somos nos)/.test(t)) return 2;
  if (/(tenho de falar com|depende do meu|depende da minha|em conjunto com|a minha esposa decide comigo|o meu marido decide comigo|falar primeiro com)/.test(t)) return 1;
  if (/(nao sou eu que decido|e para (um|uma) (amigo|amiga|familiar|cliente)|estou so a ajudar|quem decide e)/.test(t)) return 0;
  return undefined;
}

export const CRITERION_SCORERS: Record<QualificationCriterionKey, (text: string) => QualificationCriterionScore | undefined> = { localizacao: scoreLocalizacao, tipoObra: scoreTipoObra, orcamento: scoreOrcamento, prazoUrgencia: scorePrazo, decisor: scoreDecisor };

/** Ordem de recolha na conversa (a mais natural comercialmente). */
export const CRITERIA_ORDER: readonly QualificationCriterionKey[] = ["tipoObra", "localizacao", "prazoUrgencia", "orcamento", "decisor"];

/** Pergunta determinística seguinte para um critério (texto validado pelos guardrails nos testes). */
export const CRITERIA_QUESTIONS: Record<QualificationCriterionKey, string> = {
  tipoObra: "Para percebermos como ajudar: que tipo de projeto tem em mente? (ex.: remodelação completa da casa, cozinha, casa de banho)",
  localizacao: "Em que cidade ou zona fica o imóvel?",
  prazoUrgencia: "Quando gostaria de avançar com o projeto?",
  orcamento: "Para enquadrarmos a proposta: tem um orçamento aproximado em mente para o investimento?",
  decisor: "A decisão sobre o projeto é sua, ou vai ser tomada em conjunto com mais alguém?",
};

/** Deteção simples de disponibilidade para visita (dias/horas no texto). */
export function looksLikeAvailability(text: string): boolean {
  const t = normalize(text);
  return /(segunda|terca|quarta|quinta|sexta|sabado|domingo|amanha|depois de amanha|de manha|a tarde|ao fim do dia|\b\d{1,2}h(\d{2})?\b|\b\d{1,2}:\d{2}\b|proxima semana|este fim de semana|dia \d{1,2})/.test(t);
}
