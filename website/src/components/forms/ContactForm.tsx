"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { trackLeadConversion, getStoredAttribution } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

const budgetOptions = [
  { value: "", label: "Faixa de orçamento estimado" },
  { value: "20k-30k", label: "20.000€ – 30.000€" },
  { value: "30k-75k", label: "30.000€ – 75.000€" },
  { value: "75k-150k", label: "75.000€ – 150.000€" },
  { value: "150k+", label: "150.000€ ou mais" },
];

const projectTypeOptions = [
  { value: "", label: "Tipo de projeto" },
  { value: "residencial", label: "Habitação (apartamento ou casa)" },
  { value: "moradia", label: "Moradia" },
  { value: "comercial", label: "Espaço comercial" },
  { value: "investimento", label: "Investimento / portefólio de imóveis" },
];

export function ContactForm({ formName = "Estudo de Viabilidade" }: { formName?: string }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    // Campo-armadilha (honeypot): se estiver preenchido, é um bot — a rota
    // de API ignora o pedido silenciosamente sem chamar o HubSpot.
    const honeypot = String(data.get("website") || "");

    // Atribuição de origem guardada no primeiro touchpoint desta sessão
    // (ver captureAttribution em lib/analytics.ts) — sobrevive a navegação
    // interna entre a página de entrada (com UTMs/gclid/fbclid) e esta.
    const attribution = getStoredAttribution();

    // event_id partilhado entre o Pixel (browser, mais abaixo em
    // trackLeadConversion) e o Meta CAPI (servidor, platform/src/lib/
    // meta-capi.ts) — gerado uma única vez aqui e reenviado nos dois lados
    // do mesmo evento "Lead", para a Meta deduplicar em vez de contar duas
    // conversões (ago/2026).
    const metaEventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `lead-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const payload = {
      firstname: String(data.get("firstname") || ""),
      email: String(data.get("email") || ""),
      phone: String(data.get("phone") || ""),
      project_type: String(data.get("project_type") || ""),
      budget_range: String(data.get("budget_range") || ""),
      message: String(data.get("message") || ""),
      consent: data.get("consent") === "on",
      website: honeypot,
      pageUri: typeof window !== "undefined" ? window.location.href : pathname,
      pageName: formName,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      utmTerm: attribution.utmTerm,
      utmContent: attribution.utmContent,
      gclid: attribution.gclid,
      fbclid: attribution.fbclid,
      referrer: attribution.referrer,
      metaEventId,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Não foi possível enviar o pedido.");
      }

      setStatus("success");
      trackLeadConversion(formName, metaEventId);
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-white text-ink p-10 text-left max-w-[560px] mx-auto">
        <div className="eyebrow">Pedido Recebido</div>
        <h3 className="font-display text-2xl mb-3">Obrigado — entraremos em contacto em breve.</h3>
        <p className="text-graphite font-light text-sm leading-relaxed">
          Um gestor de projeto DS Projects vai analisar o seu pedido e ligar-lhe nas próximas horas
          úteis para agendar uma visita técnica sem compromisso.
        </p>
      </div>
    );
  }

  return (
    <form
      id="formulario-contacto"
      onSubmit={handleSubmit}
      className="bg-white text-ink p-8 sm:p-10 max-w-[560px] mx-auto text-left"
      noValidate
    >
      {/* Honeypot — invisível para pessoas, visível para bots de formulário. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Não preencher este campo</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="eyebrow">Estudo de Viabilidade</div>
      <h3 className="font-display text-2xl mb-6">Fale-nos do seu projeto</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="field">
          <label htmlFor="firstname">Nome</label>
          <input type="text" id="firstname" name="firstname" required autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefone</label>
          <input type="tel" id="phone" name="phone" required autoComplete="tel" />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="project_type">Tipo de projeto</label>
          <select id="project_type" name="project_type" required defaultValue="">
            {projectTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="budget_range">Orçamento estimado</label>
          <select id="budget_range" name="budget_range" required defaultValue="">
            {budgetOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="message">Mensagem (opcional)</label>
          <textarea id="message" name="message" rows={3} />
        </div>
      </div>

      <label className="flex items-start gap-3 mt-6 text-[.8rem] text-graphite font-light leading-relaxed">
        <input type="checkbox" name="consent" required className="mt-1" />
        Autorizo o tratamento dos meus dados pela DS Projects para ser contactado sobre este pedido,
        nos termos da{" "}
        <a href="/politica-de-privacidade" className="underline">
          Política de Privacidade
        </a>
        .
      </label>

      {status === "error" && (
        <p className="text-sm text-red-600 mt-4" role="alert">{errorMessage}</p>
      )}

      <button type="submit" className="btn btn-light mt-8 w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "A enviar…" : "Pedir Estudo de Viabilidade"}
      </button>

      <p className="text-[.72rem] text-graphite-light mt-4 leading-relaxed">
        Respondemos, tipicamente, dentro de um dia útil.
      </p>
    </form>
  );
}
