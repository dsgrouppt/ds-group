"use client";

/**
 * Pequena camada de abstração sobre gtag/fbq/dataLayer para não espalhar
 * `window as any` por todos os componentes. Todas as chamadas verificam a
 * existência do script antes de disparar — seguro mesmo quando GA4/Meta
 * Pixel/GTM não estão configurados (variáveis de ambiente vazias).
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function pushDataLayer(event: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

export function trackPageview(url: string): void {
  pushDataLayer({ event: "pageview", page: url });
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "PageView");
  }
}

/** Disparar quando um lead é gerado com sucesso (submissão do formulário). */
export function trackLeadConversion(formName: string): void {
  pushDataLayer({ event: "generate_lead", form_name: formName });
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "generate_lead", { form_name: formName });
  }
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", "Lead", { content_name: formName });
  }
}

/** Disparar em cliques de CTA relevantes (ex.: "Pedir Estudo de Viabilidade"). */
export function trackCtaClick(ctaLabel: string, location: string): void {
  pushDataLayer({ event: "cta_click", cta_label: ctaLabel, cta_location: location });
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "select_content", { content_type: "cta", item_id: ctaLabel });
  }
}

/**
 * Atribuição de origem (UTM/gclid/fbclid) — ago/2026.
 *
 * Captura os parâmetros de campanha e o referrer no primeiro touchpoint do
 * visitante nesta sessão de navegação (aba/separador) e guarda-os em
 * sessionStorage, para sobreviverem a navegação interna até o visitante
 * submeter o formulário — sem isto, o URL de entrada com UTMs perdia-se
 * assim que o visitante clicava para outra página do site antes de
 * converter. "Primeiro touchpoint ganha": nunca sobrescreve um valor já
 * guardado nesta sessão.
 */

const ATTRIBUTION_STORAGE_KEY = "ds_attribution";

export interface AttributionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}

/**
 * Chamar em cada mudança de rota (ver AnalyticsPageView em Analytics.tsx).
 * Não faz nada se já houver uma atribuição guardada nesta sessão, ou se a
 * página atual não trouxer nenhum sinal de origem (evita gravar ruído em
 * cada navegação interna sem contexto de campanha).
 */
export function captureAttribution(searchParams: URLSearchParams): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)) return;
  } catch {
    return; // sessionStorage indisponível (ex.: modo privado) — falha em silêncio.
  }

  const data: AttributionData = {
    utmSource: searchParams.get("utm_source") || undefined,
    utmMedium: searchParams.get("utm_medium") || undefined,
    utmCampaign: searchParams.get("utm_campaign") || undefined,
    utmTerm: searchParams.get("utm_term") || undefined,
    utmContent: searchParams.get("utm_content") || undefined,
    gclid: searchParams.get("gclid") || undefined,
    fbclid: searchParams.get("fbclid") || undefined,
    referrer: document.referrer || undefined,
  };

  const hasSignal = Object.values(data).some((v) => Boolean(v));
  if (!hasSignal) return;

  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage indisponível — o formulário continua a funcionar,
    // simplesmente sem atribuição estruturada guardada.
  }
}

/** Lê a atribuição guardada nesta sessão (objeto vazio se não houver nenhuma). */
export function getStoredAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttributionData) : {};
  } catch {
    return {};
  }
}
