import { Resend } from "resend";

/**
 * Envio de email transacional (Fase 4 — doc 05 §7.4/§6, decisão de negócio
 * de 2026-08-12: email nativo no DS OS via Resend, sem HubSpot — ver
 * histórico da missão CTO. Segue o mesmo padrão já usado no `website/`
 * para Meta Pixel/GA4 (ver docs/integracoes-estado.md): sem
 * RESEND_API_KEY definida, a aplicação funciona normalmente e as
 * notificações ficam só registadas em log — nunca um erro fatal por
 * falta de configuração. Isto permite publicar este código em produção
 * antes de a conta Resend/domínio de envio estarem prontos.
 */
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM || "DS OS <notificacoes@dsprojects.pt>";

export interface SendEmailResult {
  sent: boolean;
  reason?: string;
  id?: string;
}

export async function sendEmail(to: string | null | undefined, subject: string, html: string, text: string): Promise<SendEmailResult> {
  if (!to) {
    return { sent: false, reason: "sem_destinatario" };
  }
  if (!resendClient) {
    console.warn(`[email] RESEND_API_KEY não configurada — email "${subject}" para ${to} não foi enviado (modo simulação).`);
    return { sent: false, reason: "resend_nao_configurado" };
  }
  try {
    const result = await resendClient.emails.send({ from: FROM, to, subject, html, text });
    if (result.error) {
      console.error(`[email] Falha a enviar "${subject}" para ${to}:`, result.error);
      return { sent: false, reason: result.error.message };
    }
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error(`[email] Exceção ao enviar "${subject}" para ${to}:`, err);
    return { sent: false, reason: err instanceof Error ? err.message : "erro_desconhecido" };
  }
}
