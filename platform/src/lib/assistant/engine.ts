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
import { isWithinBusinessHours } from "@/lib/sla";
import { assistantEnabled, assistantShadowMode } from "./flags";
import { detectEscalationTriggers, HARD_LIMITS } from "./guardrails";
import { CRITERIA_ORDER, CRITERIA_QUESTIONS, CRITERION_SCORERS, looksLikeAvailability, recusaOrcamento } from "./intents";
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

function nextPendingCriterion(
  criterios: Partial<Record<QualificationCriterionKey, 0 | 1 | 2>>,
  semResposta: string[] = []
): QualificationCriterionKey | undefined {
  return CRITERIA_ORDER.find((k) => criterios[k] === undefined && !semResposta.includes(k));
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
  transicaoHumano:
    "Vou passar o seu pedido a um membro da nossa equipa, que vai entrar em contacto consigo brevemente. Obrigado!",
  transicaoUrgente:
    "Compreendo a urgência. Vou passar o seu pedido já à nossa equipa para falarem consigo o mais depressa possível.",
  semProblemaOrcamento:
    "Sem problema — podemos avançar sem esse valor.",
  zonaRegistada:
    "Obrigado, fica registado — a nossa equipa confirma a zona consigo.",
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

  const toolCalls: EngineReport["toolCalls"] = [];
  const plannedMessages: string[] = [];
  const push = (r: ToolResult) => toolCalls.push({ tool: r.tool, ok: r.ok, detail: r.detail ?? r.blockedByGuardrails?.join(",") });
  const stateBefore = session.state;

  // ── Reativação em estado terminal (P1 da validação final, 19.08.2026) ──
  // Um lead que escreve depois de a sessão ter terminado nunca fica em
  // limbo: cada terminal tem tratamento próprio e chega sempre a um humano.
  if (isAssistantState(session.state) && TERMINAL_STATES.has(session.state)) {
    const dedupCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (session.state === ASSISTANT_STATE.SEM_RESPOSTA) {
      // Reativação quente: única saída legal de um terminal (→ ESCALADO).
      push(await executeAssistantTool("escalar_humano", { dealId: event.dealId, motivo: `Lead voltou a responder após nudges esgotados. Mensagem: "${event.texto.slice(0, 200)}"` }));
      await prisma.assistantSession.update({ where: { dealId: event.dealId }, data: { lastInboundAt: new Date() } });
      return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.ESCALADO, toolCalls, plannedMessages });
    }
    if (session.state === ASSISTANT_STATE.CONCLUIDO) {
      const titulo = "Lead retomou contacto após fecho do assistente";
      const existing = await prisma.task.findFirst({ where: { dealId: event.dealId, title: titulo, createdAt: { gt: dedupCutoff } } });
      if (!existing) {
        push(await executeAssistantTool("criar_tarefa", { dealId: event.dealId, titulo, descricao: `Mensagem do lead: "${event.texto.slice(0, 300)}". Seguimento humano.`, prioridade: "NORMAL" }));
      }
      return report({ processed: true, reason: existing ? "reativacao_deduplicada" : undefined, stateBefore, stateAfter: session.state, toolCalls, plannedMessages });
    }
    if (session.state === ASSISTANT_STATE.OPT_OUT) {
      // Respeito integral pelo opt-out: ZERO resposta automática; a decisão
      // de recontactar é humana (RGPD).
      const titulo = "Lead em opt-out voltou a escrever — decisão humana sobre recontacto (RGPD)";
      const existing = await prisma.task.findFirst({ where: { dealId: event.dealId, title: titulo, createdAt: { gt: dedupCutoff } } });
      if (!existing) {
        push(await executeAssistantTool("criar_tarefa", { dealId: event.dealId, titulo, descricao: `Mensagem do lead: "${event.texto.slice(0, 300)}". NÃO recontactar por canais automáticos sem decisão humana.`, prioridade: "ALTA" }));
      }
      return report({ processed: true, reason: existing ? "reativacao_deduplicada" : undefined, stateBefore, stateAfter: session.state, toolCalls, plannedMessages });
    }
    // ESCALADO sem humanTakeover (caso raro): silêncio — território humano.
    return report({ reason: `estado_terminal=${session.state}`, stateBefore, stateAfter: session.state });
  }

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

  // Gatilhos de escalonamento obrigatório. Urgência extrema (P3, 19.08.2026)
  // salta a qualificação: voz humana em minutos, não um questionário. A
  // mensagem de transição é planeada ANTES do takeover (depois dele o
  // enviar_mensagem fica bloqueado, por desenho).
  if (analysis.triggers.length > 0) {
    const urgente = analysis.triggers.includes("urgencia_extrema");
    await planMessage(event.dealId, event.canal, urgente ? ENGINE_MESSAGES.transicaoUrgente : ENGINE_MESSAGES.transicaoHumano, toolCalls, plannedMessages);
    push(await executeAssistantTool("escalar_humano", {
      dealId: event.dealId,
      motivo: `${urgente ? "URGENTE — contactar por telefone já. " : ""}Gatilhos: ${analysis.triggers.join(", ")}. Mensagem do lead: "${event.texto.slice(0, 200)}"`,
    }));
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
    const semResposta = data.criteriosSemResposta ?? [];
    const pending = nextPendingCriterion(data.criterios ?? {}, semResposta);
    if (pending) {
      // P5 (19.08.2026): recusa explícita de orçamento — aceitar, marcar
      // "sem resposta" e seguir o guião; o fecho vai a triagem humana.
      if (pending === "orcamento" && recusaOrcamento(event.texto)) {
        const novaLista = [...semResposta, "orcamento"];
        await prisma.assistantSession.update({
          where: { dealId: event.dealId },
          data: {
            dataJson: serializeSessionData({
              ...data,
              criteriosSemResposta: novaLista,
              respostasTexto: { ...(data.respostasTexto ?? {}), orcamento: `recusado: "${event.texto.slice(0, 200)}"` },
              semProgresso: 0,
            }),
          },
        });
        await prisma.activityLog.create({ data: { action: "ASSISTANT_ANSWER_RECORDED", entity: "Deal", entityId: event.dealId, meta: "criterio=orcamento;pontuacao=recusado" } });
        const next = nextPendingCriterion(data.criterios ?? {}, novaLista);
        await planMessage(event.dealId, event.canal, `${ENGINE_MESSAGES.semProblemaOrcamento}${next ? ` ${CRITERIA_QUESTIONS[next]}` : ""}`, toolCalls, plannedMessages);
        if (!next) {
          await setState(event.dealId, state, ASSISTANT_STATE.FOTOS);
          await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.pedirFotos, toolCalls, plannedMessages);
          return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.FOTOS, toolCalls, plannedMessages });
        }
        return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
      }

      const score = CRITERION_SCORERS[pending](event.texto);
      if (score !== undefined) {
        push(await executeAssistantTool("registar_resposta", { dealId: event.dealId, criterio: pending, pontuacao: score, texto: event.texto }));
        if ((data.semProgresso ?? 0) > 0) {
          const afterAnswer = parseSessionData((await prisma.assistantSession.findUniqueOrThrow({ where: { dealId: event.dealId } })).dataJson);
          await prisma.assistantSession.update({
            where: { dealId: event.dealId },
            data: { dataJson: serializeSessionData({ ...afterAnswer, semProgresso: 0 }) },
          });
        }
      } else {
        const stalls = (data.semProgresso ?? 0) + 1;
        // P2 + 6.1 (19.08.2026): zona não reconhecida à repergunta NÃO é
        // "sem progresso" — marca-se "por avaliar" (a pontuação de zona
        // limítrofe é exclusiva de humanos) e o guião continua.
        if (pending === "localizacao" && stalls >= HARD_LIMITS.MAX_TURNS_WITHOUT_PROGRESS) {
          const novaLista = [...semResposta, "localizacao"];
          await prisma.assistantSession.update({
            where: { dealId: event.dealId },
            data: {
              dataJson: serializeSessionData({
                ...data,
                criteriosSemResposta: novaLista,
                respostasTexto: { ...(data.respostasTexto ?? {}), localizacao: `nao reconhecida: "${event.texto.slice(0, 200)}"` },
                semProgresso: 0,
              }),
            },
          });
          await prisma.activityLog.create({ data: { action: "ASSISTANT_ANSWER_RECORDED", entity: "Deal", entityId: event.dealId, meta: "criterio=localizacao;pontuacao=nao_reconhecida" } });
          const next = nextPendingCriterion(data.criterios ?? {}, novaLista);
          await planMessage(event.dealId, event.canal, `${ENGINE_MESSAGES.zonaRegistada}${next ? ` ${CRITERIA_QUESTIONS[next]}` : ""}`, toolCalls, plannedMessages);
          if (!next) {
            await setState(event.dealId, state, ASSISTANT_STATE.FOTOS);
            await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.pedirFotos, toolCalls, plannedMessages);
            return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.FOTOS, toolCalls, plannedMessages });
          }
          return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
        }
        // Sem progresso: contar voltas; ao limite, escalar (nunca insistir indefinidamente).
        if (stalls >= HARD_LIMITS.MAX_TURNS_WITHOUT_PROGRESS) {
          push(await executeAssistantTool("escalar_humano", { dealId: event.dealId, motivo: `Sem progresso após ${stalls} voltas no critério "${pending}".` }));
          return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.ESCALADO, toolCalls, plannedMessages });
        }
        await prisma.assistantSession.update({
          where: { dealId: event.dealId },
          data: { dataJson: serializeSessionData({ ...data, semProgresso: stalls }) },
        });
        await planMessage(event.dealId, event.canal, `${ENGINE_MESSAGES.reformularPedido} ${CRITERIA_QUESTIONS[pending]}`, toolCalls, plannedMessages);
        return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
      }
    }

    // Reavaliar após possível registo.
    const updated = parseSessionData((await prisma.assistantSession.findUniqueOrThrow({ where: { dealId: event.dealId } })).dataJson);
    const stillPending = nextPendingCriterion(updated.criterios ?? {}, updated.criteriosSemResposta ?? []);
    if (stillPending) {
      await planMessage(event.dealId, event.canal, CRITERIA_QUESTIONS[stillPending], toolCalls, plannedMessages);
      return report({ processed: true, stateBefore, stateAfter: state, toolCalls, plannedMessages });
    }
    // Critérios esgotados (respondidos ou marcados "sem resposta") → fotos.
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
        // Motivo específico quando a incompletude vem de critérios que o
        // lead recusou/não foi possível apurar (P5 + 6.1): triagem humana
        // preenche a pontuação em falta — nunca o assistente.
        const semResposta = (parseSessionData((await prisma.assistantSession.findUniqueOrThrow({ where: { dealId: event.dealId } })).dataJson).criteriosSemResposta ?? []);
        const motivo = semResposta.length > 0
          ? `Qualificação incompleta — critérios por avaliar humanamente: ${semResposta.join(", ")} (recusado/não reconhecido). Restante dossier completo na sessão.`
          : `Qualificação incompleta ao fechar (${qual.detail}).`;
        push(await executeAssistantTool("escalar_humano", { dealId: event.dealId, motivo }));
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

      // P4 (19.08.2026): POTENCIAL (3–5) NÃO é promovido no pipeline — fica
      // em NOVO_LEAD; recolhe disponibilidades e a proposta de visita sai
      // com prioridade ALTA para validação humana prévia.
      if (deal.qualificationCategory !== "POTENCIAL") {
        push(await executeAssistantTool("avancar_para_qualificado", { dealId: event.dealId }));
      }
      await setState(event.dealId, ASSISTANT_STATE.CLASSIFICADO, ASSISTANT_STATE.AGENDAMENTO);
      await planMessage(event.dealId, event.canal, ENGINE_MESSAGES.pedirDisponibilidade, toolCalls, plannedMessages);
      return report({ processed: true, stateBefore, stateAfter: ASSISTANT_STATE.AGENDAMENTO, toolCalls, plannedMessages });
    }
  }

  if (state === ASSISTANT_STATE.AGENDAMENTO) {
    if (looksLikeAvailability(event.texto)) {
      push(await executeAssistantTool("registar_resposta", { dealId: event.dealId, criterio: "disponibilidade", texto: event.texto.slice(0, 200) }));
      const updated = parseSessionData((await prisma.assistantSession.findUniqueOrThrow({ where: { dealId: event.dealId } })).dataJson);
      // P4: POTENCIAL → tarefa ALTA com nota de validação humana prévia.
      const dealNow = await prisma.deal.findUniqueOrThrow({ where: { id: event.dealId } });
      const potencial = dealNow.qualificationCategory === "POTENCIAL";
      push(await executeAssistantTool("propor_visita", {
        dealId: event.dealId,
        disponibilidades: updated.disponibilidades ?? [],
        prioridade: potencial ? "ALTA" : "URGENTE",
        nota: potencial ? `POTENCIAL (score ${dealNow.qualificationScore}/10) — validar por telefone antes de agendar.` : undefined,
      }));
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
/**
 * Cadência progressiva aprovada (decisão 6.2, 19.08.2026): 1.º nudge 24h
 * após a última interação, 2.º nudge 72h depois do 1.º, 3.º nudge 7 dias
 * depois do 2.º; esgotados (e passados mais 7 dias), SEM_RESPOSTA.
 */
const NUDGE_DELAYS_MS = [24 * 60 * 60 * 1000, 72 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000] as const;

export async function runNudgeSweep(now: Date = new Date()): Promise<{ nudged: string[]; exhausted: string[]; skippedReason?: string }> {
  if (!assistantEnabled()) return { nudged: [], exhausted: [] };
  // Decisão 6.3 (19.08.2026): nenhum nudge automático fora do horário
  // comercial (o 1.º contacto à entrada do lead continua 24/7 — isso é
  // resposta ao anúncio, não follow-up).
  if (!isWithinBusinessHours(now)) return { nudged: [], exhausted: [], skippedReason: "fora_de_horario_comercial" };

  // Filtro grosso na BD (candidatos com ≥24h de silêncio); o prazo exato
  // por nudgeCount é aplicado por sessão, abaixo.
  const cutoff = new Date(now.getTime() - NUDGE_DELAYS_MS[0]);
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
    // Prazo progressivo: o nudge N (0-indexado por nudgeCount) só é devido
    // NUDGE_DELAYS_MS[nudgeCount] depois da última mensagem do assistente.
    const delay = NUDGE_DELAYS_MS[Math.min(s.nudgeCount, NUDGE_DELAYS_MS.length - 1)];
    const lastActivity = Math.max(s.lastOutboundAt?.getTime() ?? 0, s.lastInboundAt?.getTime() ?? 0, s.createdAt.getTime());
    if (now.getTime() - lastActivity < delay) continue;
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
