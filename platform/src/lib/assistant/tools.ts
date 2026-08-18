/**
 * DS Sales Assistant — catálogo FECHADO das 8 ferramentas (Etapa 2,
 * desenho técnico v2 §3, aprovado 18.08.2026).
 *
 * Contratos de segurança (verificados pela suite tests/assistant/security):
 *  1. A camada de decisão (determinística agora; LLM na Etapa 3) NUNCA
 *     escreve na base de dados — só pode pedir a execução de UMA destas
 *     ferramentas, por nome, com argumentos validados por Zod.
 *  2. Qualquer nome fora da whitelist é recusado e registado
 *     (ASSISTANT_TOOL_REJECTED) — nunca executado.
 *  3. Nenhuma ferramenta envia comunicações a clientes nesta etapa: o
 *     caminho de envio NÃO EXISTE neste módulo (não importa whatsapp.ts,
 *     email.ts nem hubspot.ts — afirmado por teste estático).
 *  4. `avancar_para_qualificado` é a ÚNICA transição de pipeline
 *     permitida (NOVO_LEAD → QUALIFICADO). Fechados, propostas e visitas
 *     confirmadas são território humano.
 *  5. `propor_visita` cria um evento PROVISÓRIO + tarefa urgente de
 *     confirmação humana — nunca confirma.
 *  6. Nada é apagado ou reescrito: todas as escritas são inserções ou
 *     atualizações de campos próprios do assistente/qualificação.
 *  7. Cada execução (sucesso ou recusa) fica em ActivityLog com ação
 *     ASSISTANT_* — distinguível de qualquer ação humana na auditoria.
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import {
  QUALIFICATION_CRITERIA_KEYS,
  qualificationScoreTotal,
  qualificationCategoryFromScore,
  type QualificationInput,
} from "@/lib/qualification";
import { validateOutboundText, HARD_LIMITS } from "./guardrails";
import {
  ASSISTANT_STATE,
  parseSessionData,
  serializeSessionData,
  transitionAllowed,
  type AssistantChannel,
} from "./states";

// ─────────────────────────────────────────────────────────────────────────
// Whitelist e schemas de argumentos
// ─────────────────────────────────────────────────────────────────────────

export const ASSISTANT_TOOLS = [
  "enviar_mensagem",
  "registar_resposta",
  "registar_qualificacao",
  "avancar_para_qualificado",
  "guardar_foto",
  "propor_visita",
  "criar_tarefa",
  "escalar_humano",
] as const;

export type AssistantToolName = (typeof ASSISTANT_TOOLS)[number];

const dealIdSchema = z.string().min(1).max(50);

const ToolSchemas = {
  enviar_mensagem: z.object({
    dealId: dealIdSchema,
    canal: z.enum(["WHATSAPP", "EMAIL"]),
    corpo: z.string().min(1).max(2000),
  }),
  registar_resposta: z.object({
    dealId: dealIdSchema,
    criterio: z.enum([...QUALIFICATION_CRITERIA_KEYS, "disponibilidade"]),
    pontuacao: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    texto: z.string().max(1000).optional(),
  }),
  registar_qualificacao: z.object({ dealId: dealIdSchema }),
  avancar_para_qualificado: z.object({ dealId: dealIdSchema }),
  guardar_foto: z.object({
    dealId: dealIdSchema,
    filename: z.string().min(1).max(200),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]),
    contentBase64: z.string().min(1),
  }),
  propor_visita: z.object({
    dealId: dealIdSchema,
    disponibilidades: z.array(z.string().max(200)).max(3),
    startAt: z.coerce.date().optional(),
  }),
  criar_tarefa: z.object({
    dealId: dealIdSchema,
    titulo: z.string().min(3).max(150),
    descricao: z.string().max(2000).optional(),
    prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
    dueAt: z.coerce.date().optional(),
  }),
  escalar_humano: z.object({
    dealId: dealIdSchema,
    motivo: z.string().min(3).max(500),
  }),
} satisfies Record<AssistantToolName, z.ZodTypeAny>;

export interface ToolResult {
  ok: boolean;
  tool: string;
  detail?: string;
  /** Sinal para o motor: a mensagem foi bloqueada pelos guardrails → escalar. */
  blockedByGuardrails?: string[];
}

async function logAssistant(action: string, dealId: string, meta?: string): Promise<void> {
  await prisma.activityLog.create({
    data: { action, entity: "Deal", entityId: dealId, meta: meta ? meta.slice(0, 900) : undefined },
  });
}

async function requireSession(dealId: string) {
  const session = await prisma.assistantSession.findUnique({ where: { dealId } });
  if (!session) throw new Error(`AssistantSession inexistente para o deal ${dealId}.`);
  if (session.humanTakeover) throw new Error("Sessão em takeover humano — o assistente não pode agir.");
  return session;
}

// ─────────────────────────────────────────────────────────────────────────
// Implementações
// ─────────────────────────────────────────────────────────────────────────

/**
 * enviar_mensagem — Etapa 2: NÃO EXISTE caminho de envio. A mensagem é
 * validada pelos guardrails e, se passar, fica registada como "planeada"
 * na sessão (shadow) + ActivityLog. Se falhar os guardrails, nada é
 * registado como mensagem: devolve o sinal para o motor escalar
 * (mensagem bloqueada não se reformula — desenho v2 §4).
 */
async function enviarMensagem(args: z.infer<(typeof ToolSchemas)["enviar_mensagem"]>): Promise<ToolResult> {
  const session = await requireSession(args.dealId);

  const verdict = validateOutboundText(args.corpo);
  if (!verdict.ok) {
    await logAssistant("ASSISTANT_MESSAGE_BLOCKED", args.dealId, `violacoes=${verdict.violations.join(",")}`);
    return { ok: false, tool: "enviar_mensagem", blockedByGuardrails: verdict.violations };
  }

  const data = parseSessionData(session.dataJson);
  const hoje = new Date().toISOString().slice(0, 10);
  const enviadasHoje = (data.mensagens ?? []).filter((m) => m.quando.startsWith(hoje)).length;
  if (enviadasHoje >= HARD_LIMITS.MAX_ASSISTANT_MESSAGES_PER_CONVERSATION_PER_DAY) {
    await logAssistant("ASSISTANT_MESSAGE_BLOCKED", args.dealId, "limite_diario_atingido");
    return { ok: false, tool: "enviar_mensagem", detail: "limite_diario_atingido" };
  }

  data.mensagens = [
    ...(data.mensagens ?? []),
    { quando: new Date().toISOString(), canal: args.canal as AssistantChannel, corpo: args.corpo, enviada: false, shadow: true },
  ];

  await prisma.assistantSession.update({
    where: { dealId: args.dealId },
    data: { dataJson: serializeSessionData(data), lastOutboundAt: new Date() },
  });
  await logAssistant("ASSISTANT_SHADOW_MESSAGE", args.dealId, `canal=${args.canal};corpo=${args.corpo.slice(0, 200)}`);
  return { ok: true, tool: "enviar_mensagem", detail: "registada_em_shadow_nao_enviada" };
}

/** registar_resposta — guarda uma resposta apurada (critério 0/1/2 ou disponibilidade) no dataJson da sessão. */
async function registarResposta(args: z.infer<(typeof ToolSchemas)["registar_resposta"]>): Promise<ToolResult> {
  const session = await requireSession(args.dealId);
  const data = parseSessionData(session.dataJson);

  if (args.criterio === "disponibilidade") {
    if (!args.texto) throw new Error("Disponibilidade requer texto.");
    data.disponibilidades = [...(data.disponibilidades ?? []), args.texto].slice(0, 3);
  } else {
    if (args.pontuacao === undefined) throw new Error("Critério de qualificação requer pontuação 0/1/2.");
    data.criterios = { ...(data.criterios ?? {}), [args.criterio]: args.pontuacao };
    if (args.texto) data.respostasTexto = { ...(data.respostasTexto ?? {}), [args.criterio]: args.texto.slice(0, 500) };
  }

  await prisma.assistantSession.update({
    where: { dealId: args.dealId },
    data: { dataJson: serializeSessionData(data), lastInboundAt: new Date() },
  });
  await logAssistant("ASSISTANT_ANSWER_RECORDED", args.dealId, `criterio=${args.criterio};pontuacao=${args.pontuacao ?? "texto"}`);
  return { ok: true, tool: "registar_resposta" };
}

/**
 * registar_qualificacao — converte as respostas recolhidas em score via a
 * régua EXISTENTE (src/lib/qualification.ts) e grava nos mesmos campos do
 * fluxo humano. Requer os 5 critérios completos — nunca inventa valores.
 */
async function registarQualificacao(args: z.infer<(typeof ToolSchemas)["registar_qualificacao"]>): Promise<ToolResult> {
  const session = await requireSession(args.dealId);
  const data = parseSessionData(session.dataJson);
  const criterios = data.criterios ?? {};

  const missing = QUALIFICATION_CRITERIA_KEYS.filter((k) => criterios[k] === undefined);
  if (missing.length > 0) {
    return { ok: false, tool: "registar_qualificacao", detail: `criterios_em_falta=${missing.join(",")}` };
  }

  const input = Object.fromEntries(QUALIFICATION_CRITERIA_KEYS.map((k) => [k, criterios[k]])) as QualificationInput;
  const score = qualificationScoreTotal(input);
  const category = qualificationCategoryFromScore(score);

  await prisma.$transaction([
    prisma.deal.update({ where: { id: args.dealId }, data: { qualificationScore: score, qualificationCategory: category } }),
    prisma.activityLog.create({
      data: { action: "QUALIFICATION", entity: "Deal", entityId: args.dealId, meta: `score=${score};categoria=${category};origem=assistente` },
    }),
  ]);
  return { ok: true, tool: "registar_qualificacao", detail: `score=${score};categoria=${category}` };
}

/**
 * avancar_para_qualificado — única transição de pipeline permitida ao
 * assistente: NOVO_LEAD → QUALIFICADO (mesma semântica do fluxo humano:
 * marca firstContactedAt na primeira passagem). Recusa qualquer outro
 * estado de partida.
 */
async function avancarParaQualificado(args: z.infer<(typeof ToolSchemas)["avancar_para_qualificado"]>): Promise<ToolResult> {
  await requireSession(args.dealId);
  const result = await prisma.$transaction(async (tx) => {
    const deal = await tx.deal.findUniqueOrThrow({ where: { id: args.dealId } });
    if (deal.stage !== "NOVO_LEAD") {
      return { ok: false as const, detail: `transicao_recusada_stage_atual=${deal.stage}` };
    }
    await tx.deal.update({
      where: { id: args.dealId },
      data: { stage: "QUALIFICADO", firstContactedAt: deal.firstContactedAt ?? new Date() },
    });
    await tx.activityLog.create({
      data: { action: "STAGE_CHANGE", entity: "Deal", entityId: args.dealId, meta: "stage=QUALIFICADO;origem=assistente" },
    });
    return { ok: true as const };
  });
  if (!result.ok) await logAssistant("ASSISTANT_TOOL_REFUSED", args.dealId, `avancar_para_qualificado:${result.detail}`);
  return { ...result, tool: "avancar_para_qualificado" };
}

/**
 * guardar_foto — arquiva uma foto/planta enviada pelo lead como Attachment
 * (kind FOTO_OBRA, visibleToClient=false) ligado ao Client do negócio.
 * Reutiliza saveFile() do storage.ts existente — incluindo a validação de
 * assinatura binária real do ficheiro (nunca confia no mimeType declarado).
 */
async function guardarFoto(args: z.infer<(typeof ToolSchemas)["guardar_foto"]>): Promise<ToolResult> {
  const session = await requireSession(args.dealId);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: args.dealId } });

  const buffer = Buffer.from(args.contentBase64, "base64");
  const file = new File([buffer], args.filename, { type: args.mimeType });
  const saved = await saveFile(file); // lança se a assinatura binária não corresponder

  const attachment = await prisma.attachment.create({
    data: {
      filename: saved.filename,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      size: saved.size,
      path: saved.relativePath,
      kind: "FOTO_OBRA",
      visibleToClient: false,
      clientId: deal.clientId,
    },
  });

  const data = parseSessionData(session.dataJson);
  data.fotos = [...(data.fotos ?? []), attachment.id];
  await prisma.assistantSession.update({ where: { dealId: args.dealId }, data: { dataJson: serializeSessionData(data) } });
  await logAssistant("ASSISTANT_PHOTO_SAVED", args.dealId, `attachmentId=${attachment.id};nome=${saved.originalName}`);
  return { ok: true, tool: "guardar_foto", detail: attachment.id };
}

/**
 * propor_visita — cria a proposta de visita: tarefa URGENTE de confirmação
 * humana sempre; CalendarEvent provisório (type VISITA_TECNICA, ligado ao
 * Deal via a coluna nova da Etapa 1) apenas quando existe um slot concreto
 * (startAt) — o assistente NUNCA confirma visitas nem inventa datas.
 */
async function proporVisita(args: z.infer<(typeof ToolSchemas)["propor_visita"]>): Promise<ToolResult> {
  await requireSession(args.dealId);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: args.dealId }, include: { client: true } });

  const dispon = args.disponibilidades.length > 0 ? `Disponibilidades indicadas pelo lead: ${args.disponibilidades.join(" | ")}` : "Lead não indicou disponibilidades concretas.";

  await prisma.$transaction(async (tx) => {
    let eventoInfo = "sem evento provisório (nenhum slot concreto)";
    if (args.startAt) {
      const evento = await tx.calendarEvent.create({
        data: {
          title: `Visita Técnica (PROPOSTA por confirmar) — ${deal.client.name}`,
          type: "VISITA_TECNICA",
          startAt: args.startAt,
          dealId: deal.id,
          notes: `Proposta criada pelo DS Sales Assistant. NÃO CONFIRMADA — requer confirmação humana. ${dispon}`,
        },
      });
      eventoInfo = `eventoId=${evento.id}`;
    }
    await tx.task.create({
      data: {
        title: "Confirmar visita técnica (proposta pelo assistente)",
        description: `${dispon}\nConfirmar com o cliente, criar/ajustar o evento na Agenda e mover o negócio para Visita Agendada (ação humana). ${eventoInfo}`,
        priority: "URGENTE",
        dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        assigneeId: deal.ownerId ?? undefined,
        dealId: deal.id,
      },
    });
    await tx.activityLog.create({
      data: { action: "ASSISTANT_VISIT_PROPOSED", entity: "Deal", entityId: deal.id, meta: `${dispon.slice(0, 400)};${eventoInfo}` },
    });
  });
  return { ok: true, tool: "propor_visita" };
}

/** criar_tarefa — tarefa interna para a equipa, ligada ao Deal (nunca a clientes). */
async function criarTarefa(args: z.infer<(typeof ToolSchemas)["criar_tarefa"]>): Promise<ToolResult> {
  await requireSession(args.dealId);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: args.dealId } });
  const task = await prisma.task.create({
    data: {
      title: args.titulo,
      description: args.descricao,
      priority: args.prioridade,
      dueAt: args.dueAt,
      assigneeId: deal.ownerId ?? undefined,
      dealId: deal.id,
    },
  });
  await logAssistant("ASSISTANT_TASK_CREATED", args.dealId, `taskId=${task.id};titulo=${args.titulo.slice(0, 120)}`);
  return { ok: true, tool: "criar_tarefa", detail: task.id };
}

/**
 * escalar_humano — marca takeover (irreversível pelo próprio assistente),
 * move a sessão para ESCALADO e cria tarefa URGENTE. Sem envio de email
 * nesta etapa (nenhuma comunicação automática — nem interna).
 */
async function escalarHumano(args: z.infer<(typeof ToolSchemas)["escalar_humano"]>): Promise<ToolResult> {
  const session = await prisma.assistantSession.findUnique({ where: { dealId: args.dealId } });
  if (!session) throw new Error(`AssistantSession inexistente para o deal ${args.dealId}.`);
  const deal = await prisma.deal.findUniqueOrThrow({ where: { id: args.dealId } });

  await prisma.$transaction(async (tx) => {
    await tx.assistantSession.update({
      where: { dealId: args.dealId },
      data: {
        humanTakeover: true,
        takeoverReason: args.motivo.slice(0, 500),
        state: transitionAllowed(session.state, ASSISTANT_STATE.ESCALADO) || session.state === ASSISTANT_STATE.ESCALADO ? ASSISTANT_STATE.ESCALADO : session.state,
      },
    });
    await tx.task.create({
      data: {
        title: "Assistente escalou lead — intervenção humana necessária",
        description: `Motivo: ${args.motivo}`,
        priority: "URGENTE",
        dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        assigneeId: deal.ownerId ?? undefined,
        dealId: deal.id,
      },
    });
    await tx.activityLog.create({
      data: { action: "ASSISTANT_ESCALATED", entity: "Deal", entityId: args.dealId, meta: args.motivo.slice(0, 400) },
    });
  });
  return { ok: true, tool: "escalar_humano" };
}

// ─────────────────────────────────────────────────────────────────────────
// Executor único com whitelist
// ─────────────────────────────────────────────────────────────────────────

const IMPLEMENTATIONS: Record<AssistantToolName, (args: never) => Promise<ToolResult>> = {
  enviar_mensagem: enviarMensagem,
  registar_resposta: registarResposta,
  registar_qualificacao: registarQualificacao,
  avancar_para_qualificado: avancarParaQualificado,
  guardar_foto: guardarFoto,
  propor_visita: proporVisita,
  criar_tarefa: criarTarefa,
  escalar_humano: escalarHumano,
};

/**
 * Ponto único de execução. TUDO o que o assistente faz ao DS OS passa por
 * aqui: whitelist → Zod → implementação → auditoria. Nomes desconhecidos
 * são recusados e registados; argumentos inválidos são recusados antes de
 * qualquer IO.
 */
export async function executeAssistantTool(name: string, rawArgs: unknown): Promise<ToolResult> {
  if (!(ASSISTANT_TOOLS as readonly string[]).includes(name)) {
    const dealId = typeof rawArgs === "object" && rawArgs !== null && "dealId" in rawArgs ? String((rawArgs as { dealId: unknown }).dealId).slice(0, 50) : "desconhecido";
    try {
      await prisma.activityLog.create({
        data: { action: "ASSISTANT_TOOL_REJECTED", entity: "Deal", entityId: dealId, meta: `ferramenta_desconhecida=${String(name).slice(0, 100)}` },
      });
    } catch {
      /* auditoria best-effort — a recusa mantém-se mesmo sem log */
    }
    return { ok: false, tool: String(name).slice(0, 100), detail: "ferramenta_fora_da_whitelist" };
  }

  const toolName = name as AssistantToolName;
  const parsed = ToolSchemas[toolName].safeParse(rawArgs);
  if (!parsed.success) {
    return { ok: false, tool: toolName, detail: `argumentos_invalidos: ${parsed.error.issues[0]?.message ?? "?"}` };
  }
  return IMPLEMENTATIONS[toolName](parsed.data as never);
}
