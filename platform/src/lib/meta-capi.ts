import crypto from "crypto";

/**
 * Cliente minimo para o Meta Conversions API (CAPI) - envia eventos
 * server-side para o mesmo pixel/dataset ja ativo no site
 * (1358248506033226), com o mesmo padrao de falha silenciosa ja usado em
 * todo o DS OS para integracoes externas (Resend, HubSpot): nunca lanca
 * excecao para quem chama, apenas regista em log e devolve {ok:false} -
 * uma integracao externa nunca pode bloquear ou reverter a criacao do
 * Lead/Negocio no DS OS.
 *
 * Arquitetura aprovada (ago/2026, "APROVACAO DE EXECUCAO - CAPI"):
 * - DS OS como servidor (o browser do visitante nunca fala diretamente
 *   com a Graph API da Meta).
 * - Pixel/dataset ativo: 1358248506033226 (o mesmo ja usado pelo Pixel de
 *   navegador no site - ver Fecho-3-Pontos-2026-08-16.md).
 * - event_id partilhado entre o Pixel (browser, website/src/lib/
 *   analytics.ts) e o CAPI (aqui) no evento "Lead", para a Meta
 *   deduplicar as duas fontes do mesmo evento real em vez de contar dois
 *   leads.
 * - Sem token de sistema de Business Portfolio disponivel (pixel de conta
 *   pessoal - ver Relatorio-Execucao-Pixel-Atribuicao-2026-08-16.md,
 *   Bloco 1: nao existe caminho self-service para gerar um token de CAPI
 *   nem para associar o pixel a um portefolio sem essa associacao). O
 *   token usado aqui e um User Access Token de longa duracao com a
 *   permissao ads_management, gerado manualmente pelo Diogo (owner do
 *   pixel e admin da ad account pessoal onde ele vive) - ver
 *   debugCapiToken() para validar as permissoes antes de confiar nele em
 *   producao. Este tipo de token expira (~60 dias) e tem de ser renovado
 *   manualmente ate o pixel ser movido para o Business Portfolio DS
 *   Group, altura em que passa a ser possivel um token de System User que
 *   nao expira.
 */

const GRAPH_API_VERSION = process.env.META_CAPI_API_VERSION || "v21.0";

export interface CapiUserData {
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
}

export interface SendCapiEventInput {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  actionSource: "website" | "system_generated" | "other";
  userData: CapiUserData;
  customData?: Record<string, unknown>;
}

export interface SendCapiEventResult {
  ok: boolean;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
}

function sha256Lower(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Normaliza telefone para hash conforme exigido pela Meta (E.164 sem
 * "+"). Numeros com 9 digitos (formato local portugues, sem indicativo)
 * assumem o indicativo +351 - e o mercado do proprio site; numeros que ja
 * trazem indicativo (mais de 9 digitos) sao mantidos como estao.
 */
function normalizePhoneForHash(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 9) return `351${digits}`;
  return digits;
}

/**
 * Deriva um valor fbc sintetico a partir do fbclid quando o cookie _fbc
 * ainda nao existe (ex.: o Pixel so grava esse cookie depois de carregar
 * na pagina - no primeiro pedido pode nao estar disponivel ainda).
 * Formato exigido pela Meta: fb.<subdomain_index>.<creation_time_ms>.<fbclid>.
 */
function synthesizeFbc(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}

function buildUserData(input: CapiUserData): Record<string, unknown> {
  const ud: Record<string, unknown> = {};
  if (input.email) ud.em = [sha256Lower(input.email)];
  if (input.phone) ud.ph = [sha256Lower(normalizePhoneForHash(input.phone))];
  if (input.clientIp) ud.client_ip_address = input.clientIp;
  if (input.userAgent) ud.client_user_agent = input.userAgent;
  if (input.fbp) ud.fbp = input.fbp;
  if (input.fbc) ud.fbc = input.fbc;
  else if (input.fbclid) ud.fbc = synthesizeFbc(input.fbclid);
  return ud;
}

/**
 * Envia um evento para o Meta Conversions API. Nunca lanca - falha
 * silenciosamente (log + {ok:false}).
 */
export async function sendCapiEvent(input: SendCapiEventInput): Promise<SendCapiEventResult> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.error(
      "[meta-capi] META_PIXEL_ID / META_CAPI_ACCESS_TOKEN nao configurados - evento nao enviado:",
      input.eventName
    );
    return { ok: false, error: "capi_nao_configurado" };
  }

  // test_event_code (opcional, via env var): usado apenas durante testes
  // manuais para o evento aparecer na aba "Testar eventos" do Events
  // Manager, lado a lado com o Pixel do browser, e confirmar visualmente a
  // deduplicacao. Deve ficar por definir em operacao normal.
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE || undefined;

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: input.actionSource,
    user_data: buildUserData(input.userData),
  };
  if (input.eventId) event.event_id = input.eventId;
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  if (input.customData) event.custom_data = input.customData;

  const body: Record<string, unknown> = { data: [event] };
  if (testEventCode) body.test_event_code = testEventCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      }
    );
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      const message =
        (json as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
      console.error(`[meta-capi] Falha ao enviar evento "${input.eventName}":`, message);
      return { ok: false, error: message };
    }
    const eventsReceived = (json as { events_received?: number }).events_received;
    const fbtraceId = (json as { fbtrace_id?: string }).fbtrace_id;
    console.log(
      `[meta-capi] Evento "${input.eventName}" enviado - events_received=${eventsReceived}, fbtrace_id=${fbtraceId}`
    );
    return { ok: true, eventsReceived, fbtraceId };
  } catch (error) {
    console.error(`[meta-capi] Erro de rede ao enviar evento "${input.eventName}":`, error);
    return { ok: false, error: error instanceof Error ? error.message : "erro_desconhecido" };
  }
}

/**
 * Verifica se o token configurado (META_CAPI_ACCESS_TOKEN) tem a
 * permissao ads_management - necessaria para enviar eventos de um pixel
 * de conta pessoal sem Business Portfolio (ver nota no topo do ficheiro).
 * Usar antes de confiar no token em producao, e para diagnosticar quando
 * a Meta comecar a rejeitar os envios (token expirado ao fim de ~60 dias).
 */
export async function debugCapiToken(): Promise<{ ok: boolean; scopes?: string[]; expiresAt?: number; error?: string }> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) return { ok: false, error: "token_nao_configurado" };
  try {
    const res = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(accessToken)}`
    );
    const json = await res.json().catch(() => ({} as Record<string, unknown>));
    const data = (json as { data?: { scopes?: string[]; expires_at?: number; error?: unknown } })?.data;
    if (!res.ok || (json as { error?: unknown })?.error || !data) {
      const message = (json as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
      return { ok: false, error: message };
    }
    const scopes = data.scopes || [];
    return { ok: scopes.includes("ads_management"), scopes, expiresAt: data.expires_at };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "erro_desconhecido" };
  }
}
