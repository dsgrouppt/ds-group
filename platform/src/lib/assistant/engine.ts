/**
 * DS Sales Assistant — motor determinístico (Etapa 2, desenho técnico v2,
 * aprovado 18.08.2026). SEM IA generativa: toda a decisão vem da máquina
 * de estados (states.ts), das heurísticas conservadoras (intents.ts) e dos
 * guardrails (guardrails.ts). Toda a AÇÃO passa pelo catálogo fechado de
 * ferramentas (tools.ts) — o motor nunca escreve diretamente em modelos do
 * DS OS além do estado da própria AssistantSession.
 *
 * Nesta etapa o motor NÃO está ligado a nenhum webhook: só é invocável
 * pelos testes e pelo endpoint interno de shadow
 * (/api/internal/assistant-run, protegido por token). Não há qualquer
 * caminho de envio de comunicações a clientes.
 */

import { prisma } from "@/lib/prisma";
import { assistantEnabled, assistantShadowMode } from "./flags";
import { detectEscalationTriggers, HARD_LIMITS } from "./guardrails";
import { CRITERIA_ORDER, CRITERIA_QUESTIONS, CRITERION_SCORERS, looksLikeAvailability } from "./intents";
import { executeAssistantTool, type ToolResult } from "./tools";
import {
  ASSISTANT_STATE,
  TERMINAL_STATES,
  parseSessionData,
  serializeSessionData,
  transitionAllowed,
  isAssistantState,
  type AssistantChannel,
  type AssistantStateValue,
} from "./states";
import type { QualificationCriterionKey } from "@/lib/qualification";

export interface InboundAttachment {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface InboundEvent {
  dealId: string;
  canal: AssistantChannel;
  texto: string;
  anexos?: InboundAttachment[];
}

export interface EngineReport {
  processed: boolean;
  reason?: string;
  stateBefore?: string;
  stateAfter?: string;
  shadow: boolean;
  toolCalls: Array<{ tool: string; ok: boolean; detail?: string }>;
  plannedMessages: string[];
}

function report(partial: Partial<EngineReport>): EngineReport {
  return { processed: false, shadow: assistantShadowMode(), toolCalls: [], plannedMessages: [], ...partial };
}

/**
 * Cria (se não existir) a sessão do assistente para um negócio elegível.
 * Elegibilidade estrita (desenho v2 §3, lista negativa): só negócios de
 * Meta Lead Ads ainda em NOVO_LEAD. Tudo o resto fica intocado.
 */
export async function ensureSession(dealId: string, canal: AssistantChannel): Promise<{ created: boolean; reason?: string }> {
  if (!assistantEnabled()) return { created: false, reason: "assistant_desligado" };
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) return { created: false, reason: "deal_inexistente" };
  if (deal.source !== "META_LEAD_ADS") return { created: false, reason: "fora_do_ambito_source" };
  if (deal.stage !== "NOVO_LEAD") return { created: false, reason: `fora_do_ambito_stage=${deal.stage}` };

  const existing = await prisma.assistantSession.findUnique({ where: { dealId } });
  if (existing) return { created: false, reason: "ja_existe" };

  await prisma.assistantSession.create({ data: { dealId, channel: canal, state: ASSISTANT_STATE.AGUARDA_CONTACTO } });
  await prisma.activityLog.create({
    data: { action: "ASSISTANT_SESSION_CREATED", entity: "Deal", entityId: dealId, meta: `canal=${canal}` },
  });
  return { created: true };
}

async function setState(dealId: string, from: string, to: AssistantStateValue): Promise<boolean> {
  if (!transitionAllowed(from, to)) return false;
  await prisma.assistantSession.update({ where: { dealId }, data: { state: to } });
  await prisma.activityLog.create({
    data: { action: "ASSISTANT_STATE_CHANGE", entity: "Deal", entityId: dealId, meta: `${from}->${to}` },
  });
  return true;
}

/**
 * Deteção passiva de intervenção humana (desenho v2 §4, gatilho 11) SEM
 * alterar nenhum código existente: se existir qualquer mensagem OUTBOUND
 * enviada por um utilizador da equipa (sentById preenchido) nas conversas
 * WhatsApp deste negócio depois da criação da sessão, a equipa assumiu a
 * conversa — takeover imediato.
 */
async function humanInterventionDetected(dealId: string, sessionCreatedAt: Date): Promise<boolean> {
  const human = await prisma.whatsAppMessage.findFirst({
    where: {
      direction: "OUTBOUND",
      sentById: { not: null },
      createdAt: { gt: sessionCreatedAt },
      conversation: { dealId },
    },
    select: { id: true },
  });
  return human !== null;
}

function nextPendingCriterion(criterios: Partial<Record<QualificationCriterionKey, 0 | 1 | 2>>): QualificationCriterionKey | undefined {
  return CRITERIA_ORDER.find((k) => criterios[k] === undefined);
}

/** Mensagens determinísticas do motor (todas validadas pelos guardrails na suite de testes). */
export const ENGINE_MESSAGES = {
  pedirFotos:
    "Obrigado pelas respostas. Se tiver fotografias ou plantas do espaço, pode enviá-las por aqui — ajudam a nossa equipa a preparar a visita. Se não tiver, diga apenas que não tem, sem problema.",
  pedirDisponibilidade:
    "Excelente. O próximo passo é uma visita técnica ao espaço, sem compromisso. Pode indicar dois ou três dias e horários em que teria disponibilidade?",
  visitaProposta:
    "Obrigado. Registei as suas disponibilidades e a nossa equipa vai entrar em contacto para combinar a visita consigo.",
  fechoFraco:
    "Obrigado pelas informações. A nossa equipa vai analisar o seu pedido e entrará em contacto consigo. Obrigado por contactar a DS Projects.",
  reformularPedido:
    "Peço desculpa, não consegui perceber bem a sua resposta.",
} as const;

async function planMessage(dealId: string, canal: AssistantChannel, corpo: string, calls: EngineReport["toolCalls"], planned: string[]): Promise<ToolResult> {
  const result = await executeAssistantTool("enviar_mensagem", { dealId, canal, corpo });
  calls.push({ tool: "enviar_mensagem", ok: result.ok, detail: result.detail ?? result.blockedByGuardrails?.join(",") });
  if (result.ok) planned.push(corpo);
  return result;
}

/**
 * Processa uma mensagem recebida de um lead. Determinístico, idempotente a
 * nível de sessão, e — nesta etapa — sem qualquer efeito fora do DS OS.
 */
export async function processInbound(event: InboundEvent): Promise<EngineReport> {
  if (!assistantEnabled()) return report({ reason: "assistant_desligado" });

  const session = await prisma.assistantSession.findUnique({ where: { dealId: event.dealId } });
  if (!session) return report({ reason: "sem_sessao" });
  if (session.humanTakeover) return report({ reason: "takeover_humano", stateBefore: session.state, stateAfter: session.state });
  if (isAssistantState(session.state) && TERMINAL_STATES.has(session.state)) {
    return report({ reason: `estado_terminal=${session.state}`, stateBefore: session.state, stateAfter: session.state });
  }

  const toolCalls: EngineReport["toolCalls"] = [];
  const plannedMessages: string[] = [];
  const push = (r: ToolResult) => toolCalls.push({ tool: r.tool, ok: r.ok, detail: r.detail ?? r.blockedByGuardrails?.join(",") });
  const stateBefore = session.state;

  // Gatilho 11 — intervenção manual da equipa → takeover imediato, sem processar.
  if (await humanInterventionDetected(event.dealId, session.createdAt)) {
    push(await executeAssistantTool("escalar_humano", { dealId: event.dealId, motivo: "Intervenção manual da equipa detetada na conversa — o assistente cala-se." }));
    return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.ESCALADO, toolCalls, plannedMessages });
  }

  // Opt-out — silêncio imediato e definitivo (antes de qualquer outra análise).
  const analysis = detectEscalationTriggers(event.texto);
  if (analysis.optOut) {
    await prisma.assistantSession.update({ where: { dealId: event.dealId }, data: { state: ASSISTANT_STATE.OPT_OUT, lastInboundAt: new Date() } });
    await prisma.activityLog.create({ data: { action: "ASSISTANT_OPT_OUT", entity: "Deal", entityId: event.dealId, meta: "pedido do lead" } });
    push(await executeAssistantTool("criar_tarefa", { dealId: event.dealId, titulo: "Lead pediu para não ser contactado (opt-out)", descricao: "Registado pelo assistente. Verificar obrigações RGPD e não recontactar por canais automáticos.", prioridade: "ALTA" }));
    return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.OPT_OUT, toolCalls, plannedMessages });
  }

  // Gatilhos de escalonamento obrigatório.
  if (analysis.triggers.length > 0) {
    push(await executeAssistantTool("escalar_humano", { dealId: event.dealId, motivo: `Gatilhos: ${analysis.triggers.join(", ")}. Mensagem do lead: "${event.texto.slice(0, 200)}"` }));
    return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.ESCALADO, toolCalls, plannedMessages });
  }

  // Anexos (fotos/plantas) — arquivados em qualquer estado ativo.
  for (const anexo of event.anexos ?? []) {
    push(await executeAssistantTool("guardar_foto", { dealId: event.dealId, filename: anexo.filename, mimeType: anexo.mimeType, contentBase64: anexo.contentBase64 }));
  }

  // Registo de progresso/atividade.
  await prisma.assistantSession.update({ where: { dealId: event.dealId }, data: { lastInboundAt: new Date() } });

  let state = session.state;

  // Primeiro sinal de vida do lead: entra em qualificação.
  if (state === ASSISTANT_STATE.AGUARDA_CONTACTO || state === ASSISTANT_STATE.CONTACTADO) {
    if (state === ASSISTANT_STATE.AGUARDA_CONTACTO) {
      await setState(event.dealId, state, ASSISTANT_STATE.CONTACTADO);
      state = ASSISTANT_STATE.CONTACTADO;
    }
    await setState(event.dealId, state, ASSISTANT_STATE.QUALIFICACAO);
    state = ASSISTANT_STATE.QUALIFICACAO;
  }

  const fresh = await prisma.assistantSession.findUniqueOrThrow({ where: { dealId: event.dealId } });
  const data = parseSessionData(fresh.dataJson);

  if (state === ASSISTANT_STATE.QUALIFICACAO) {
    const pending = nextPendingCriterion(data.criterios ?? {});
    if (pending) {
      const score = CRITERION_SCORERS[pending](event.texto);
      if (score !== undefined) {
        push(await executeAssistantTool("registar_resposta", { dealId: event.dealId, criterio: pending, pontuacao: score, texto: event.texto }));
      } else {
        // Sem progresso: contar voltas; ao limite, escalar (nunca insistir indefinidamente).
        const stalls = ((data as { semProgresso?: number }).semProgresso ?? 0) + 1;
        if (stalls >= HARD_LIMITS.MAX_TURNS_WITHOUT_PROGRESS) {
          push(await executeAssistantTool("escalar_humano", { dealId: event.dealId, motivo: `Sem progresso após ${stalls} voltas no critério "${pending}".` }));
          return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.ESCALADO, toolCalls, plannedMessages });
        }
        await prisma.assistantSession.update({
          where: { dealId: event.dealId },
          data: { dataJson: serializeSessionData({ ...data, semProgresso: stalls } as never) },
        });
        await planMessage(event.dealId, event.canal, `${ENGINE_MESSAGES.reformularPedido} ${CRITERIA_QUESTIONS[pending]}`, toolCalls, plannedMessages);
        return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
      }
    }

    // Reavaliar após possível registo.
    const updated = parseSessionData((await prisma.assistantSession.findUniqueOrThrow({ where: { dealId: event.dealId } })).dataJson);
    const stillPending = nextPendingCriterion(updated.criterios ?? {});
    if (stillPending) {
      await planMessage(event.dealId, event.canal, CRITERIA_QUESTIONS[stillPending], toolCalls, plannedMessages);
      return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
    }
    // 5/5 recolhidos → pedir fotos.
    await setState(event.dealId, state, ASSISTANT_STATE.FOTOS);
    await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.pedirFotos, toolCalls, plannedMessages);
    return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.FOTOS, toolCalls, plannedMessages });
  }

  if (state === ASSISTANT_STATE.FOTOS) {
    // Com fotos recebidas agora, ou com o lead a dizer que não tem, fecha-se a classificação.
    const saidNoPhotos = /\b(n(ã|a)o tenho|sem fotos|sem fotografias|n(ã|a)o consigo enviar)\b/i.test(event.texto);
    if ((event.anexos ?? []).length > 0 || saidNoPhotos || event.texto.trim().length > 0) {
      const qual = await executeAssistantTool("registar_qualificacao", { dealId: event.dealId });
      push(qual);
      if (!qual.ok) {
        push(await executeAssistantTool("escalar_humano", { dealId: event.dealId, motivo: `Qualificação incompleta ao fechar (${qual.detail}).` }));
        return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.ESCALADO, toolCalls, plannedMessages });
      }
      await setState(event.dealId, state, ASSISTANT_STATE.CLASSIFICADO);

      const deal = await prisma.deal.findUniqueOrThrow({ where: { id: event.dealId } });
      if (deal.qualificationCategory === "FRACO") {
        // Nunca descartar sozinho: mensagem educada + triagem humana + fim do percurso do assistente.
        push(await executeAssistantTool("criar_tarefa", { dealId: event.dealId, titulo: "Triagem humana — lead classificado FRACO pelo assistente", descricao: `Score ${deal.qualificationScore}/10. Decidir resposta final (fora de âmbito, reencaminhar, etc.).`, prioridade: "NORMAL" }));
        await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.fechoFraco, toolCalls, plannedMessages);
        await setState(event.dealId, ASSISTANT_STATE.CLASSIFICADO, ASSISTANT_STATE.CONCLUIDO);
        return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.CONCLUIDO, toolCalls, plannedMessages });
      }

      push(await executeAssistantTool("avancar_para_qualificado", { dealId: event.dealId }));
      await setState(event.dealId, ASSISTANT_STATE.CLASSIFICADO, ASSISTANT_STATE.AGENDAMENTO);
      await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.pedirDisponibilidade, toolCalls, plannedMessages);
      return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.AGENDAMENTO, toolCalls, plannedMessages });
    }
  }

  if (state === ASSISTANT_STATE.AGENDAMENTO) {
    if (looksLikeAvailability(event.texto)) {
      push(await executeAssistantTool("registar_resposta", { dealId: event.dealId, criterio: "disponibilidade", texto: event.texto.slice(0, 200) }));
      const updated = parseSessionData((await prisma.assistantSession.findUniqueOrThrow({ where: { dealId: event.dealId } })).dataJson);
      push(await executeAssistantTool("propor_visita", { dealId: event.dealId, disponibilidades: updated.disponibilidades ?? [] }));
      await setState(event.dealId, state, ASSISTANT_STATE.VISITA_PROPOSTA);
      await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.visitaProposta, toolCalls, plannedMessages);
      return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.VISITA_PROPOSTA, toolCalls, plannedMessages });
    }
    await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.pedirDisponibilidade, toolCalls, plannedMessages);
    return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
  }

  if (state === ASSISTANT_STATE.VISITA_PROPOSTA) {
    if (looksLikeAvailability(event.texto)) {
      push(await executeAssistantTool("registar_resposta", { dealId: event.dealId, criterio: "disponibilidade", texto: event.texto.slice(0, 200) }));
    }
    await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.visitaProposta, toolCalls, plannedMessages);
    return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
  }

  return report({ processed: true, reason: `sem_acao_para_estado=${state}`, stateBefore, stateAfter: state, toolCalls, plannedMessages });
}

/**
 * Varredura de nudges (para o cron interno, Etapa 4). Máx. 3 por lead;
 * esgotados → SEM_RESPOSTA + tarefa humana. Nesta etapa só é invocada por
 * testes/endpoint interno; as "mensagens" são sempre planeadas (shadow).
 */
export async function runNudgeSweep(now: Date = new Date()): Promise<{ nudged: string[]; exhausted: string[] }> {
  if (!assistantEnabled()) return { nudged: [], exhausted: [] };
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const stale = await prisma.assistantSession.findMany({
    where: {
      humanTakeover: false,
      state: { in: [ASSISTANT_STATE.CONTACTADO, ASSISTANT_STATE.QUALIFICACAO, ASSISTANT_STATE.FOTOS, ASSISTANT_STATE.AGENDAMENTO] },
      OR: [{ lastInboundAt: { lt: cutoff } }, { lastInboundAt: null, createdAt: { lt: cutoff } }],
      lastOutboundAt: { lt: cutoff },
    },
    take: 50,
  });

  const nudged: string[] = [];
  const exhausted: string[] = [];
  for (const s of stale) {
    if (s.nudgeCount >= HARD_LIMITS.MAX_NUDGES) {
      await prisma.assistantSession.update({ where: { id: s.id }, data: { state: ASSISTANT_STATE.SEM_RESPOSTA } });
      await executeAssistantTool("criar_tarefa", { dealId: s.dealId, titulo: "Lead sem resposta após 3 lembretes do assistente", descricao: "Decidir seguimento humano ou fecho como perdido (Sem Resposta).", prioridade: "NORMAL" });
      await prisma.activityLog.create({ data: { action: "ASSISTANT_STATE_CHANGE", entity: "Deal", entityId: s.dealId, meta: `${s.state}->SEM_RESPOSTA (nudges esgotados)` } });
      exhausted.push(s.dealId);
      continue;
    }
    const r = await executeAssistantTool("enviar_mensagem", {
      dealId: s.dealId,
      canal: s.channel as AssistantChannel,
      corpo: "Olá! Continuamos disponíveis para o ajudar com o seu projeto. Quando puder, responda a esta mensagem para continuarmos. Obrigado — DS Projects.",
    });
    if (r.ok) {
      await prisma.assistantSession.update({ where: { id: s.id }, data: { nudgeCount: { increment: 1 } } });
      nudged.push(s.dealId);
    }
  }
  return { nudged, exhausted };
}
