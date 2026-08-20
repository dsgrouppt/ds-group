/**
 * DS Sales Assistant — camada LLM (Etapa 3, SHADOW MODE).
 *
 * Contrato de segurança (o mesmo do desenho v2 §3/§4):
 *  - O LLM **propõe** texto. Nunca decide, nunca escreve na base de dados,
 *    nunca executa ferramentas. Toda a ação continua a passar pelo
 *    catálogo fechado de tools.ts.
 *  - Toda a proposta passa por `sanitizeProposal()` — guardrails
 *    determinísticos. Proposta que viole as regras NÃO é reformulada:
 *    é convertida em escalonamento para humano (regra do desenho v2 §4).
 *  - Em shadow mode nada é enviado ao cliente: a proposta é apenas
 *    registada (ActivityLog `ASSISTANT_LLM_SHADOW`) para revisão humana.
 *
 * Triplo interruptor (todos têm de estar ligados para haver sequer uma
 * chamada à API; nenhum existe em produção nesta publicação):
 *    ASSISTANT_ENABLED=true  +  ASSISTANT_LLM=true  +  ANTHROPIC_API_KEY
 * e ainda ASSISTANT_LLM_MODEL, que é deliberadamente sem valor por
 * omissão — não se adivinha um modelo, configura-se explicitamente.
 *
 * Sem dependências novas: usa `fetch` nativo, não o SDK — o package.json
 * e o lockfile ficam intocados.
 */

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { assistantEnabled, assistantShadowMode } from "./flags";
import { validateOutboundText, detectEscalationTriggers } from "./guardrails";
import { ASSISTANT_SYSTEM_PROMPT, buildUserPrompt, type LlmContextInput } from "./prompts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 512;
const TIMEOUT_MS = 12_000;

export interface LlmProposal {
  mensagem: string | null;
  escalar: boolean;
  motivoEscalonamento: string | null;
  confianca: number;
}

export interface LlmOutcome {
  ok: boolean;
  /** Proposta já saneada pelos guardrails (nunca a bruta do modelo). */
  proposal?: LlmProposal;
  /** Proposta original do modelo, para auditoria em shadow. */
  raw?: LlmProposal;
  reason?: string;
  sanitized?: string[];
}

const ProposalSchema = z.object({
  mensagem: z.string().max(2000).nullable().optional(),
  escalar: z.boolean(),
  motivoEscalonamento: z.string().max(500).nullable().optional(),
  confianca: z.number().min(0).max(1),
});

/** Limiar abaixo do qual a proposta é convertida em escalonamento. */
export const MIN_CONFIDENCE = 0.6;

export function assistantLlmEnabled(): boolean {
  return (
    assistantEnabled() &&
    process.env.ASSISTANT_LLM === "true" &&
    !!process.env.ANTHROPIC_API_KEY &&
    !!process.env.ASSISTANT_LLM_MODEL
  );
}

/**
 * Saneamento determinístico da proposta do modelo. É aqui que a segurança
 * real acontece — assume-se sempre que o modelo pode estar comprometido,
 * enganado por prompt injection ou simplesmente errado.
 *
 * Converte em escalonamento (nunca reformula) quando:
 *  - o texto proposto viola os guardrails (preço, prazo, desconto, fora de
 *    catálogo, confirmação de visita);
 *  - a mensagem do lead contém gatilhos de escalonamento obrigatório mas o
 *    modelo não escalou (o determinístico ganha sempre ao modelo);
 *  - a confiança declarada é baixa;
 *  - a proposta é incoerente (escalar=false sem mensagem).
 */
export function sanitizeProposal(raw: LlmProposal, mensagemDoLead: string): { proposal: LlmProposal; sanitized: string[] } {
  const sanitized: string[] = [];
  const analysis = detectEscalationTriggers(mensagemDoLead || "");

  let escalar = raw.escalar;
  let motivo = raw.motivoEscalonamento ?? null;
  let mensagem = raw.mensagem ?? null;

  if (analysis.triggers.length > 0 && !escalar) {
    escalar = true;
    motivo = `Gatilho determinístico ignorado pelo modelo: ${analysis.triggers.join(", ")}`;
    sanitized.push("gatilho_deterministico_forcado");
  }

  if (analysis.optOut) {
    escalar = true;
    mensagem = null;
    motivo = "Opt-out do lead — sem resposta automática (RGPD).";
    sanitized.push("opt_out_forcado");
  }

  if (mensagem) {
    const verdict = validateOutboundText(mensagem);
    if (!verdict.ok) {
      escalar = true;
      motivo = `Proposta bloqueada pelos guardrails: ${verdict.violations.join(", ")}`;
      mensagem = null;
      sanitized.push(`guardrails:${verdict.violations.join("|")}`);
    }
  }

  if (raw.confianca < MIN_CONFIDENCE && !escalar) {
    escalar = true;
    motivo = `Confiança do modelo abaixo do limiar (${raw.confianca}).`;
    sanitized.push("confianca_baixa");
  }

  if (!escalar && !mensagem) {
    escalar = true;
    motivo = "Proposta incoerente: sem mensagem e sem escalonamento.";
    sanitized.push("proposta_incoerente");
  }

  return { proposal: { mensagem, escalar, motivoEscalonamento: motivo, confianca: raw.confianca }, sanitized };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("resposta_sem_json");
  return JSON.parse(trimmed.slice(start, end + 1));
}

/**
 * Pede uma proposta ao modelo. Inerte (devolve `ok:false`) enquanto os
 * interruptores não estiverem todos ligados — que é o estado em produção.
 * NUNCA envia nada ao cliente: quem envia (no futuro) é o motor, através
 * da ferramenta `enviar_mensagem`, e só fora de shadow mode.
 */
export async function proposeReply(context: LlmContextInput): Promise<LlmOutcome> {
  if (!assistantLlmEnabled()) {
    return { ok: false, reason: "llm_desativado" };
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: process.env.ASSISTANT_LLM_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        system: ASSISTANT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(context) }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error("[assistant-llm] API recusou o pedido:", res.status);
      return { ok: false, reason: `http_${res.status}` };
    }

    const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const texto = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    const parsed = ProposalSchema.safeParse(extractJson(texto));
    if (!parsed.success) {
      return { ok: false, reason: `proposta_invalida: ${parsed.error.issues[0]?.message ?? "?"}` };
    }

    const rawProposal: LlmProposal = {
      mensagem: parsed.data.mensagem ?? null,
      escalar: parsed.data.escalar,
      motivoEscalonamento: parsed.data.motivoEscalonamento ?? null,
      confianca: parsed.data.confianca,
    };
    const { proposal, sanitized } = sanitizeProposal(rawProposal, context.mensagemAtual);
    return { ok: true, proposal, raw: rawProposal, sanitized };
  } catch (error) {
    console.error("[assistant-llm] Falha:", error);
    return { ok: false, reason: error instanceof Error ? error.message : "erro_desconhecido" };
  }
}

/**
 * Registo da proposta para revisão humana. Em shadow mode é o ÚNICO
 * efeito da camada LLM — nada chega ao cliente.
 */
export async function logShadowProposal(dealId: string, outcome: LlmOutcome): Promise<void> {
  const meta = [
    `shadow=${assistantShadowMode()}`,
    `ok=${outcome.ok}`,
    outcome.reason ? `reason=${outcome.reason}` : "",
    outcome.proposal ? `escalar=${outcome.proposal.escalar}` : "",
    outcome.proposal ? `confianca=${outcome.proposal.confianca}` : "",
    outcome.sanitized?.length ? `saneado=${outcome.sanitized.join("|")}` : "",
    outcome.raw?.mensagem ? `proposta="${outcome.raw.mensagem.slice(0, 300)}"` : "",
  ]
    .filter(Boolean)
    .join(";");

  await prisma.activityLog.create({
    data: { action: "ASSISTANT_LLM_SHADOW", entity: "Deal", entityId: dealId, meta: meta.slice(0, 900) },
  });
}
