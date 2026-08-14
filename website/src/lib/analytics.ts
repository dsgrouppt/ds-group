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
