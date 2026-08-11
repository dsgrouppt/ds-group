import { QUALIFICATION_CATEGORY, type QualificationCategoryValue } from "./enums";
import { SERVICE_AREA_CITIES, MIN_VIABLE_BUDGET_EUR, TARGET_BUDGET_RANGE_EUR } from "./business-rules";

/**
 * Score de qualificação de leads — doc 05 §3. Sistema de pontuação de 0 a
 * 10, com 5 critérios objetivos de 0/1/2 pontos cada. A estrutura e as
 * bandas de classificação vêm exatamente do documento; os limiares de
 * localização/orçamento usam os valores já aprovados (área de atuação,
 * orçamento mínimo viável, faixa alvo — ver business-rules.ts).
 *
 * Decisão técnica (não de negócio): o schema.prisma só guarda o resultado
 * final (Deal.qualificationScore/qualificationCategory), não os 5
 * critérios individuais — tal como especificado na Fase 1 da auditoria
 * (docs/06_Auditoria_DS_OS_e_Plano_Implementacao.md). O comercial preenche
 * os 5 critérios num formulário (ver src/app/(app)/crm/[id]/page.tsx); o
 * resultado é calculado aqui e só o total + categoria ficam persistidos.
 * Localização/tipo de obra/orçamento não são auto-detetados a partir de
 * Client.location/Deal.projectType/Deal.budgetRange porque a classificação
 * exige julgamento (ex.: "zona limítrofe" não é um simples match de texto)
 * — o comercial confirma os 3 primeiros e preenche prazo/decisor
 * diretamente, tal como o doc 05 desenha o processo (preenchimento humano
 * estruturado na etapa "Qualificação", não deteção automática de dados).
 */

export const QUALIFICATION_CRITERIA_KEYS = ["localizacao", "tipoObra", "orcamento", "prazoUrgencia", "decisor"] as const;
export type QualificationCriterionKey = (typeof QUALIFICATION_CRITERIA_KEYS)[number];

export type QualificationCriterionScore = 0 | 1 | 2;

export type QualificationInput = Record<QualificationCriterionKey, QualificationCriterionScore>;

interface CriterionOption {
  value: QualificationCriterionScore;
  label: string;
}

interface CriterionDefinition {
  key: QualificationCriterionKey;
  label: string;
  helpText?: string;
  options: CriterionOption[];
}

const areaList = SERVICE_AREA_CITIES.join(", ");
const targetRangeLabel = `${TARGET_BUDGET_RANGE_EUR.min.toLocaleString("pt-PT")}€–${TARGET_BUDGET_RANGE_EUR.max.toLocaleString("pt-PT")}€+`;
const minBudgetLabel = MIN_VIABLE_BUDGET_EUR.toLocaleString("pt-PT");

export const QUALIFICATION_CRITERIA: CriterionDefinition[] = [
  {
    key: "localizacao",
    label: "Localização",
    helpText: `Área de atuação principal: ${areaList}.`,
    options: [
      { value: 0, label: "Fora da área de atuação" },
      { value: 1, label: "Zona limítrofe / a confirmar deslocação" },
      { value: 2, label: "Dentro da área de atuação principal" },
    ],
  },
  {
    key: "tipoObra",
    label: "Tipo de obra",
    options: [
      { value: 0, label: "Trabalho pontual/avulso (ex.: só pintura)" },
      { value: 1, label: "Remodelação parcial (1–2 divisões)" },
      { value: 2, label: "Remodelação completa/gestão integral de projeto" },
    ],
  },
  {
    key: "orcamento",
    label: "Orçamento",
    helpText: `Mínimo viável: ${minBudgetLabel}€. Faixa alvo: ${targetRangeLabel}.`,
    options: [
      { value: 0, label: `Abaixo do mínimo viável (${minBudgetLabel}€)` },
      { value: 1, label: "Dentro da faixa mas ajustado/incerto" },
      { value: 2, label: "Dentro ou acima da faixa alvo, confirmado pelo cliente" },
    ],
  },
  {
    key: "prazoUrgencia",
    label: "Prazo / urgência",
    options: [
      { value: 0, label: '"Só a pesquisar", sem prazo' },
      { value: 1, label: "Prazo definido mas superior a 6 meses" },
      { value: 2, label: "Quer avançar nos próximos 1–3 meses" },
    ],
  },
  {
    key: "decisor",
    label: "Decisor",
    options: [
      { value: 0, label: "Não é decisor e decisor não está acessível" },
      { value: 1, label: "É decisor mas a decidir em conjunto com outra pessoa não presente" },
      { value: 2, label: "É o decisor (ou casal/decisores presentes)" },
    ],
  },
];

export function qualificationScoreTotal(input: QualificationInput): number {
  return QUALIFICATION_CRITERIA_KEYS.reduce((sum, key) => sum + input[key], 0);
}

/** Bandas de classificação — doc 05 §3, valores exatos do documento. */
export function qualificationCategoryFromScore(score: number): QualificationCategoryValue {
  if (score >= 9) return QUALIFICATION_CATEGORY.PRIORITARIO;
  if (score >= 6) return QUALIFICATION_CATEGORY.QUALIFICADO;
  if (score >= 3) return QUALIFICATION_CATEGORY.POTENCIAL;
  return QUALIFICATION_CATEGORY.FRACO;
}

export function parseQualificationInput(formData: FormData): QualificationInput {
  const result = {} as QualificationInput;
  for (const key of QUALIFICATION_CRITERIA_KEYS) {
    const raw = formData.get(key);
    const num = Number(raw);
    if (raw === null || !Number.isInteger(num) || num < 0 || num > 2) {
      throw new Error("Preencha os 5 critérios de qualificação (0, 1 ou 2 pontos cada).");
    }
    result[key] = num as QualificationCriterionScore;
  }
  return result;
}
