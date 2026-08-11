/**
 * Valores categóricos usados nos campos "String" do schema Prisma.
 * SQLite não suporta enums nativos — esta é a fonte de verdade da
 * aplicação para validação (Zod) e para os rótulos mostrados na UI.
 * Migrar para Postgres no futuro não obriga a mudar nada aqui.
 */

export const ROLE = {
  ADMIN: "ADMIN",
  DIRECAO: "DIRECAO",
  COMERCIAL: "COMERCIAL",
  GESTOR_PROJETO: "GESTOR_PROJETO",
  FINANCEIRO: "FINANCEIRO",
  RH: "RH",
  MARKETING: "MARKETING",
} as const;
export type RoleValue = (typeof ROLE)[keyof typeof ROLE];
export const ROLE_LABEL: Record<RoleValue, string> = {
  ADMIN: "Administrador",
  DIRECAO: "Direção",
  COMERCIAL: "Comercial",
  GESTOR_PROJETO: "Gestor de Projeto",
  FINANCEIRO: "Financeiro",
  RH: "Recursos Humanos",
  MARKETING: "Marketing",
};

export const CLIENT_TYPE = {
  FAMILIA: "FAMILIA",
  INVESTIDOR: "INVESTIDOR",
  ARQUITETO_PARCEIRO: "ARQUITETO_PARCEIRO",
} as const;
export type ClientTypeValue = (typeof CLIENT_TYPE)[keyof typeof CLIENT_TYPE];
export const CLIENT_TYPE_LABEL: Record<ClientTypeValue, string> = {
  FAMILIA: "Família",
  INVESTIDOR: "Investidor",
  ARQUITETO_PARCEIRO: "Arquiteto Parceiro",
};

export const LEAD_SOURCE = {
  GOOGLE_ADS: "GOOGLE_ADS",
  META_ADS: "META_ADS",
  REFERENCIA: "REFERENCIA",
  SEO_ORGANICO: "SEO_ORGANICO",
  GBP: "GBP",
  OUTRO: "OUTRO",
} as const;
export type LeadSourceValue = (typeof LEAD_SOURCE)[keyof typeof LEAD_SOURCE];
export const LEAD_SOURCE_LABEL: Record<LeadSourceValue, string> = {
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  REFERENCIA: "Referência",
  SEO_ORGANICO: "SEO Orgânico",
  GBP: "Google Business Profile",
  OUTRO: "Outro",
};

export const PROJECT_TYPE = {
  RESIDENCIAL: "RESIDENCIAL",
  MORADIA: "MORADIA",
  COMERCIAL: "COMERCIAL",
  INVESTIMENTO: "INVESTIMENTO",
} as const;
export type ProjectTypeValue = (typeof PROJECT_TYPE)[keyof typeof PROJECT_TYPE];
export const PROJECT_TYPE_LABEL: Record<ProjectTypeValue, string> = {
  RESIDENCIAL: "Residencial",
  MORADIA: "Moradia",
  COMERCIAL: "Comercial",
  INVESTIMENTO: "Investimento",
};

export const BUDGET_RANGE = {
  R20_30K: "R20_30K",
  R30_75K: "R30_75K",
  R75_150K: "R75_150K",
  R150K_PLUS: "R150K_PLUS",
} as const;
export type BudgetRangeValue = (typeof BUDGET_RANGE)[keyof typeof BUDGET_RANGE];
export const BUDGET_RANGE_LABEL: Record<BudgetRangeValue, string> = {
  R20_30K: "20.000€ – 30.000€",
  R30_75K: "30.000€ – 75.000€",
  R75_150K: "75.000€ – 150.000€",
  R150K_PLUS: "150.000€ ou mais",
};

// Ver docs/crm-especificacao.md §4 — Pipeline Comercial
export const DEAL_STAGE_ORDER = [
  "NOVO_LEAD",
  "QUALIFICADO",
  "VISITA_AGENDADA",
  "VISITA_REALIZADA",
  "PROPOSTA_ENVIADA",
  "EM_NEGOCIACAO",
  "FECHADO_GANHO",
  "FECHADO_PERDIDO",
] as const;
export type DealStageValue = (typeof DEAL_STAGE_ORDER)[number];
export const DEAL_STAGE_LABEL: Record<DealStageValue, string> = {
  NOVO_LEAD: "Novo Lead",
  QUALIFICADO: "Qualificado",
  VISITA_AGENDADA: "Visita Agendada",
  VISITA_REALIZADA: "Visita Realizada",
  PROPOSTA_ENVIADA: "Proposta Enviada",
  EM_NEGOCIACAO: "Em Negociação",
  FECHADO_GANHO: "Fechado — Ganho",
  FECHADO_PERDIDO: "Fechado — Perdido",
};

// Ver docs/05_Processo_Comercial_Operacional_DS.md §1.8 e §7.3.
// FORA_DE_AMBITO e OUTRO adicionados na Fase 1 da implementação do
// processo comercial (ago/2026) — antes só existiam os 5 motivos abaixo.
export const LOSS_REASON = {
  PRECO: "PRECO",
  PRAZO: "PRAZO",
  CONCORRENTE: "CONCORRENTE",
  ADIOU: "ADIOU",
  SEM_RESPOSTA: "SEM_RESPOSTA",
  FORA_DE_AMBITO: "FORA_DE_AMBITO",
  OUTRO: "OUTRO",
} as const;
export type LossReasonValue = (typeof LOSS_REASON)[keyof typeof LOSS_REASON];
export const LOSS_REASON_LABEL: Record<LossReasonValue, string> = {
  PRECO: "Preço",
  PRAZO: "Prazo",
  CONCORRENTE: "Escolheu concorrente",
  ADIOU: "Adiou projeto",
  SEM_RESPOSTA: "Sem resposta",
  FORA_DE_AMBITO: "Fora de âmbito",
  OUTRO: "Outro",
};

// Motivos de perda que geram tarefa automática de reativação (doc 05 §1.8
// e §7.2 — "sem resposta" ou "adiou projeto"). Os restantes motivos
// (preço, prazo, concorrente, fora de âmbito, outro) não geram reativação
// automática porque representam uma recusa mais definitiva ou fora do
// nosso controlo comercial.
// Nº de dias: SEM_RESPOSTA = 45 (doc 05 §2, explícito). ADIOU = 90 — doc 05
// §1.8 só define um intervalo ("passados 3 a 6 meses"); assumimos o limite
// inferior (90 dias) como primeiro contacto de reativação. Ver relatório da
// Fase 2 — a confirmar/ajustar pelo Diogo se preferir outro valor dentro do
// intervalo aprovado.
export const REACTIVATION_DAYS: Partial<Record<LossReasonValue, number>> = {
  SEM_RESPOSTA: 45,
  ADIOU: 90,
};

// Categoria resultante do score de qualificação (doc 05 §3).
export const QUALIFICATION_CATEGORY = {
  FRACO: "FRACO",
  POTENCIAL: "POTENCIAL",
  QUALIFICADO: "QUALIFICADO",
  PRIORITARIO: "PRIORITARIO",
} as const;
export type QualificationCategoryValue = (typeof QUALIFICATION_CATEGORY)[keyof typeof QUALIFICATION_CATEGORY];
export const QUALIFICATION_CATEGORY_LABEL: Record<QualificationCategoryValue, string> = {
  FRACO: "Fraco",
  POTENCIAL: "Potencial",
  QUALIFICADO: "Qualificado",
  PRIORITARIO: "Prioritário",
};

// Ver docs/crm-especificacao.md §4 — Pipeline de Projeto
export const PROJECT_STAGE_ORDER = [
  "HANDOVER",
  "KICKOFF_AGENDADO",
  "PREPARACAO",
  "EXECUCAO",
  "CONTROLO_QUALIDADE",
  "VISTORIA_CLIENTE",
  "ENTREGUE",
  "POS_OBRA_GARANTIA",
] as const;
export type ProjectStageValue = (typeof PROJECT_STAGE_ORDER)[number];
export const PROJECT_STAGE_LABEL: Record<ProjectStageValue, string> = {
  HANDOVER: "Handover",
  KICKOFF_AGENDADO: "Kickoff Agendado",
  PREPARACAO: "Preparação",
  EXECUCAO: "Execução",
  CONTROLO_QUALIDADE: "Controlo de Qualidade",
  VISTORIA_CLIENTE: "Vistoria com Cliente",
  ENTREGUE: "Entregue",
  POS_OBRA_GARANTIA: "Pós-obra / Garantia Ativa",
};

export const TASK_STATUS = {
  PENDENTE: "PENDENTE",
  EM_CURSO: "EM_CURSO",
  CONCLUIDA: "CONCLUIDA",
  CANCELADA: "CANCELADA",
} as const;
export type TaskStatusValue = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];
export const TASK_STATUS_LABEL: Record<TaskStatusValue, string> = {
  PENDENTE: "Pendente",
  EM_CURSO: "Em Curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const EVENT_TYPE = {
  VISITA_TECNICA: "VISITA_TECNICA",
  REUNIAO: "REUNIAO",
  KICKOFF: "KICKOFF",
  VISTORIA: "VISTORIA",
  OUTRO: "OUTRO",
} as const;
export type EventTypeValue = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];
export const EVENT_TYPE_LABEL: Record<EventTypeValue, string> = {
  VISITA_TECNICA: "Visita Técnica",
  REUNIAO: "Reunião",
  KICKOFF: "Kickoff",
  VISTORIA: "Vistoria",
  OUTRO: "Outro",
};

export const INVOICE_STATUS = {
  EMITIDA: "EMITIDA",
  PAGA: "PAGA",
  ATRASADA: "ATRASADA",
  CANCELADA: "CANCELADA",
} as const;
export type InvoiceStatusValue = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];
export const INVOICE_STATUS_LABEL: Record<InvoiceStatusValue, string> = {
  EMITIDA: "Emitida",
  PAGA: "Paga",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

export const EMPLOYEE_STATUS = {
  ATIVO: "ATIVO",
  INATIVO: "INATIVO",
  FERIAS: "FERIAS",
} as const;
export type EmployeeStatusValue = (typeof EMPLOYEE_STATUS)[keyof typeof EMPLOYEE_STATUS];
export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatusValue, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  FERIAS: "Férias",
};

export const CAMPAIGN_CHANNEL = {
  GOOGLE_ADS: "GOOGLE_ADS",
  META_ADS: "META_ADS",
  SEO: "SEO",
  EMAIL: "EMAIL",
  REFERRAL: "REFERRAL",
  OUTRO: "OUTRO",
} as const;
export type CampaignChannelValue = (typeof CAMPAIGN_CHANNEL)[keyof typeof CAMPAIGN_CHANNEL];
export const CAMPAIGN_CHANNEL_LABEL: Record<CampaignChannelValue, string> = {
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  SEO: "SEO",
  EMAIL: "Email",
  REFERRAL: "Referência",
  OUTRO: "Outro",
};

export const TASK_PRIORITY = {
  BAIXA: "BAIXA",
  NORMAL: "NORMAL",
  ALTA: "ALTA",
  URGENTE: "URGENTE",
} as const;
export type TaskPriorityValue = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];
export const TASK_PRIORITY_LABEL: Record<TaskPriorityValue, string> = {
  BAIXA: "Baixa",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};
