/**
 * Cliente mínimo para o WhatsApp Business Cloud API (Meta) — execução
 * urgente, ago/2026 ("META LEADS + WHATSAPP + CENTRALIZAÇÃO DS OS").
 *
 * Mesmo padrão de falha silenciosa já usado em todo o DS OS para
 * integrações externas (Resend, HubSpot, Meta CAPI): nunca lança exceção
 * para quem chama, só regista em log e devolve `{ ok: false }` — uma
 * integração externa nunca pode bloquear ou reverter uma escrita já
 * confirmada no DS OS.
 *
 * DEPENDÊNCIA EXTERNA (não resolúvel por código, ver relatório final):
 * requer uma WhatsApp Business Account (WABA) real, com um número de
 * telefone verificado, ligada à mesma App da Meta usada no webhook de
 * Lead Ads (ver /api/webhooks/meta-leads). Sem isto, `sendWhatsAppMessage`
 * falha sempre com "não configurado" — é código pronto a usar assim que
 * essas credenciais existirem, não uma integração já ativa.
 *
 * Variáveis necessárias (nenhuma existe em produção à data desta ronda):
 *  - WHATSAPP_ACCESS_TOKEN: token da Página/WABA com permissão de envio.
 *  - WHATSAPP_PHONE_NUMBER_ID: ID do número de telefone WhatsApp Business
 *    (não é o número em si — é um ID interno da Graph API).
 *
 * Nota sobre templates: fora de uma janela de 24h desde a última mensagem
 * do cliente, a Meta só permite enviar mensagens usando um "template"
 * pré-aprovado (ver `templateName`/`templateParams`) — mensagem livre
 * (`body`) só funciona dentro dessa janela de 24h. Isto é uma regra da
 * própria Meta, não uma limitação deste código.
 */

const GRAPH_API_VERSION = process.env.META_CAPI_API_VERSION || "v21.0";

export interface SendWhatsAppMessageInput {
  to: string; // E.164, ex.: "+351912345678"
  body?: string; // mensagem livre — só dentro da janela de 24h (ver nota acima)
  templateName?: string; // fora da janela de 24h, obrigatório usar um template aprovado
  templateLanguage?: string; // ex.: "pt_PT"
  templateParams?: string[];
}

export interface SendWhatsAppMessageResult {
  ok: boolean;
  waMessageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<SendWhatsAppMessageResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: "WhatsApp não configurado (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID em falta)." };
  }

  const payload = input.templateName
    ? {
        messaging_product: "whatsapp",
        to: input.to.replace(/[^\d+]/g, ""),
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.templateLanguage || "pt_PT" },
          components: input.templateParams?.length
            ? [{ type: "body", parameters: input.templateParams.map((p) => ({ type: "text", text: p })) }]
            : undefined,
        },
      }
    : {
        messaging_product: "whatsapp",
        to: input.to.replace(/[^\d+]/g, ""),
        type: "text",
        text: { body: input.body || "" },
      };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json();
    if (!res.ok) {
      console.error("[whatsapp] Envio recusado pela Graph API:", res.status, json);
      return { ok: false, error: json?.error?.message || `HTTP ${res.status}` };
    }
    const waMessageId: string | undefined = json?.messages?.[0]?.id;
    return { ok: true, waMessageId };
  } catch (error) {
    console.error("[whatsapp] Erro de rede a enviar mensagem:", error);
    return { ok: false, error: error instanceof Error ? error.message : "erro_desconhecido" };
  }
}
