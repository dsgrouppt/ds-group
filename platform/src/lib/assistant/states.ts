/**
 * DS Sales Assistant — máquina de estados da sessão (Etapa 2, desenho
 * técnico v2 §2/§4, aprovado 18.08.2026).
 *
 * Os valores de estado vivem aqui (e não em src/lib/enums.ts) de
 * propósito: o assistente é uma camada aditiva e esta etapa não altera
 * nenhum ficheiro existente do DS OS. Mesma decisão de String + validação
 * em código usada em todo o schema (ver comentário no topo de
 * prisma/schema.prisma).
 *
 * O estado é do NEGÓCIO (AssistantSession.dealId @unique), não do canal —
 * é isso que torna o motor independente do canal (WhatsApp/email).
 */

export const ASSISTANT_STATE = {
  AGUARDA_CONTACTO: "AGUARDA_CONTACTO", // sessão criada, 1.º contacto ainda não planeado/enviado
  CONTACTADO: "CONTACTADO", // 1.º contacto feito (ou planeado, em shadow), à espera de resposta
  QUALIFICACAO: "QUALIFICACAO", // a recolher os 5 critérios (qualification.ts)
  FOTOS: "FOTOS", // a pedir/receber fotos e plantas
  CLASSIFICADO: "CLASSIFICADO", // score gravado no Deal via qualification.ts
  AGENDAMENTO: "AGENDAMENTO", // a recolher disponibilidades para visita
  VISITA_PROPOSTA: "VISITA_PROPOSTA", // CalendarEvent provisório + tarefa de confirmação humana criados
  CONCLUIDO: "CONCLUIDO", // percurso do assistente terminado (humano assume o resto do pipeline)
  ESCALADO: "ESCALADO", // takeover humano (gatilho automático ou manual) — o assistente cala-se
  SEM_RESPOSTA: "SEM_RESPOSTA", // nudges esgotados (máx. 3) sem resposta do lead
  OPT_OUT: "OPT_OUT", // lead pediu para não ser contactado — silêncio imediato e definitivo
} as const;

export type AssistantStateValue = (typeof ASSISTANT_STATE)[keyof typeof ASSISTANT_STATE];

export const ASSISTANT_STATES: readonly AssistantStateValue[] = Object.values(ASSISTANT_STATE);

/** Estados terminais: o motor nunca processa nem age numa sessão nestes estados. */
export const TERMINAL_STATES: ReadonlySet<AssistantStateValue> = new Set([
  ASSISTANT_STATE.CONCLUIDO,
  ASSISTANT_STATE.ESCALADO,
  ASSISTANT_STATE.SEM_RESPOSTA,
  ASSISTANT_STATE.OPT_OUT,
]);

/**
 * Transições legais da máquina. Qualquer transição fora deste mapa é
 * recusada por transitionAllowed() — inclusive pela futura camada LLM
 * (Etapa 3), que propõe mas nunca decide: a decisão é sempre validada aqui.
 */
const TRANSITIONS: Readonly<Record<AssistantStateValue, readonly AssistantStateValue[]>> = {
  AGUARDA_CONTACTO: [ASSISTANT_STATE.CONTACTADO, ASSISTANT_STATE.ESCALADO, ASSISTANT_STATE.OPT_OUT],
  CONTACTADO: [ASSISTANT_STATE.QUALIFICACAO, ASSISTANT_STATE.ESCALADO, ASSISTANT_STATE.SEM_RESPOSTA, ASSISTANT_STATE.OPT_OUT],
  QUALIFICACAO: [ASSISTANT_STATE.FOTOS, ASSISTANT_STATE.CLASSIFICADO, ASSISTANT_STATE.ESCALADO, ASSISTANT_STATE.SEM_RESPOSTA, ASSISTANT_STATE.OPT_OUT],
  FOTOS: [ASSISTANT_STATE.CLASSIFICADO, ASSISTANT_STATE.ESCALADO, ASSISTANT_STATE.SEM_RESPOSTA, ASSISTANT_STATE.OPT_OUT],
  CLASSIFICADO: [ASSISTANT_STATE.AGENDAMENTO, ASSISTANT_STATE.CONCLUIDO, ASSISTANT_STATE.ESCALADO, ASSISTANT_STATE.OPT_OUT],
  AGENDAMENTO: [ASSISTANT_STATE.VISITA_PROPOSTA, ASSISTANT_STATE.ESCALADO, ASSISTANT_STATE.SEM_RESPOSTA, ASSISTANT_STATE.OPT_OUT],
  VISITA_PROPOSTA: [ASSISTANT_STATE.CONCLUIDO, ASSISTANT_STATE.ESCALADO, ASSISTANT_STATE.OPT_OUT],
  CONCLUIDO: [],
  ESCALADO: [],
  SEM_RESPOSTA: [],
  OPT_OUT: [],
};

export function isAssistantState(value: string): value is AssistantStateValue {
  return (ASSISTANT_STATES as readonly string[]).includes(value);
}

export function transitionAllowed(from: string, to: string): boolean {
  if (!isAssistantState(from) || !isAssistantState(to)) return false;
  return TRANSITIONS[from].includes(to);
}

export const ASSISTANT_CHANNELS = ["WHATSAPP", "EMAIL"] as const;
export type AssistantChannel = (typeof ASSISTANT_CHANNELS)[number];

/**
 * Dados recolhidos ao longo da conversa (AssistantSession.dataJson).
 * A fonte de verdade do score continua a ser o Deal
 * (qualificationScore/Category via src/lib/qualification.ts) — aqui vivem
 * apenas as respostas em bruto e o rasto do shadow mode.
 */
export interface AssistantSessionData {
  /** Respostas 0/1/2 já apuradas para os 5 critérios (parciais durante a conversa). */
  criterios?: Partial<Record<"localizacao" | "tipoObra" | "orcamento" | "prazoUrgencia" | "decisor", 0 | 1 | 2>>;
  /** Texto livre relevante registado por critério (auditoria/contexto). */
  respostasTexto?: Partial<Record<string, string>>;
  /** Disponibilidades para visita indicadas pelo lead (texto livre, máx. 3). */
  disponibilidades?: string[];
  /** IDs de Attachment guardados via guardar_foto. */
  fotos?: string[];
  /** Mensagens que o assistente TERIA enviado (shadow) ou enviou (futuro). */
  mensagens?: Array<{ quando: string; canal: AssistantChannel; corpo: string; enviada: boolean; shadow: boolean }>;
}

export function parseSessionData(dataJson: string | null | undefined): AssistantSessionData {
  if (!dataJson) return {};
  try {
    const parsed = JSON.parse(dataJson);
    return typeof parsed === "object" && parsed !== null ? (parsed as AssistantSessionData) : {};
  } catch {
    return {};
  }
}

export function serializeSessionData(data: AssistantSessionData): string {
  return JSON.stringify(data);
}
