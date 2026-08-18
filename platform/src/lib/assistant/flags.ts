/**
 * DS Sales Assistant — feature flags (Etapa 2, desenho técnico v2 §4,
 * aprovado 18.08.2026).
 *
 * Camada 1 de segurança: interruptores. TODOS desligados por omissão —
 * a ausência da variável em produção significa que o motor é inerte.
 * Nenhuma destas variáveis existe em produção à data desta etapa
 * (verificado no Railway em 18.08.2026), e a Etapa 2 NÃO as cria.
 *
 * Regras:
 *  - ASSISTANT_ENABLED: interruptor global. Sem "true" exato, o motor não
 *    processa nada (nem sequer em shadow).
 *  - ASSISTANT_SHADOW: quando "true", o motor corre e regista o que FARIA
 *    (mensagens planeadas, transições, ferramentas) mas NUNCA envia nada
 *    a clientes. Na Etapa 2 isto é redundante por construção — o código
 *    de envio nem sequer existe (ver tools.ts, `enviar_mensagem`) — mas o
 *    flag já fica definido para a Etapa 3/4 manter o mesmo contrato.
 *  - ASSISTANT_CHANNEL_*: autorização por canal (Etapa 4). Irrelevantes na
 *    Etapa 2 (não há envio), presentes para o contrato ficar fechado.
 */

export function assistantEnabled(): boolean {
  return process.env.ASSISTANT_ENABLED === "true";
}

export function assistantShadowMode(): boolean {
  // Shadow é o modo por omissão sempre que o assistente está ligado:
  // só ASSISTANT_SHADOW="false" explícito o desliga (fail-safe: um valor
  // ausente ou inválido mantém o modo mais seguro).
  return process.env.ASSISTANT_SHADOW !== "false";
}

export function assistantChannelEnabled(channel: "WHATSAPP" | "EMAIL"): boolean {
  if (channel === "WHATSAPP") return process.env.ASSISTANT_CHANNEL_WHATSAPP === "true";
  return process.env.ASSISTANT_CHANNEL_EMAIL === "true";
}

/**
 * Verdadeiro apenas quando enviar a clientes seria permitido: global ON,
 * shadow OFF explícito e canal ON. Na Etapa 2 é sempre irrelevante porque
 * não existe caminho de envio — mantido para os testes de segurança
 * poderem afirmar o contrato completo.
 */
export function assistantMaySend(channel: "WHATSAPP" | "EMAIL"): boolean {
  return assistantEnabled() && !assistantShadowMode() && assistantChannelEnabled(channel);
}
