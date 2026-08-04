"use client";

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { trackCtaClick, trackLeadConversion } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

interface WizardData {
  propertyType: string;
  location: string;
  area: string;
  timeline: string;
  budgetRange: string;
  objectives: string[];
  objectivesOther: string;
  preferredDate: string;
  preferredPeriod: string;
  firstname: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

const initialData: WizardData = {
  propertyType: "",
  location: "",
  area: "",
  timeline: "",
  budgetRange: "",
  objectives: [],
  objectivesOther: "",
  preferredDate: "",
  preferredPeriod: "",
  firstname: "",
  email: "",
  phone: "",
  message: "",
  consent: false,
};

const propertyTypes = [
  { value: "apartamento", label: "Apartamento" },
  { value: "moradia", label: "Moradia" },
  { value: "comercial", label: "Espaço comercial" },
  { value: "investimento", label: "Investimento / portefólio" },
];

const timelineOptions = [
  { value: "urgente", label: "O quanto antes" },
  { value: "1-3-meses", label: "Nos próximos 1 a 3 meses" },
  { value: "3-6-meses", label: "Nos próximos 3 a 6 meses" },
  { value: "flexivel", label: "Sem urgência definida" },
];

const budgetOptions = [
  { value: "20k-30k", label: "20.000€ – 30.000€" },
  { value: "30k-75k", label: "30.000€ – 75.000€" },
  { value: "75k-150k", label: "75.000€ – 150.000€" },
  { value: "150k+", label: "150.000€ ou mais" },
  { value: "nao-sei", label: "Ainda não sei — preciso de orientação" },
];

const objectiveOptions = [
  "Remodelação completa",
  "Renovar cozinha",
  "Renovar casa(s) de banho",
  "Aumentar valor para revenda",
  "Preparar para arrendamento",
  "Melhorar eficiência energética",
  "Resolver problema estrutural ou de humidade",
  "Repensar o layout / fluxo de espaços",
];

const periodOptions = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "indiferente", label: "Indiferente" },
];

interface UploadedFile {
  file: File;
  id: string;
  previewUrl?: string;
}

const STEP_LABELS = ["O Espaço", "Âmbito e Orçamento", "Objetivos", "Documentos", "Contacto", "Resumo"];
const TOTAL_STEPS = STEP_LABELS.length;

function isImage(file: File) {
  return file.type.startsWith("image/");
}

export function ViabilityWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function toggleObjective(value: string) {
    setData((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(value)
        ? prev.objectives.filter((o) => o !== value)
        : [...prev.objectives, value],
    }));
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next: UploadedFile[] = Array.from(fileList).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      previewUrl: isImage(file) ? URL.createObjectURL(file) : undefined,
    }));
    setFiles((prev) => [...prev, ...next]);
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function canAdvance(current: number): boolean {
    if (current === 1) return Boolean(data.propertyType && data.location);
    if (current === 2) return Boolean(data.area && data.timeline && data.budgetRange);
    if (current === 3) return data.objectives.length > 0 || data.objectivesOther.trim().length > 0;
    if (current === 4) return true; // uploads são opcionais
    if (current === 5) return Boolean(data.firstname && data.email && data.phone && data.consent);
    return true;
  }

  function goNext() {
    if (!canAdvance(step)) {
      setErrorMessage("Preencha os campos obrigatórios antes de continuar.");
      return;
    }
    setErrorMessage(null);
    trackCtaClick(`Estudo de Viabilidade — passo ${step}`, "wizard");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setErrorMessage(null);
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canAdvance(5)) {
      setErrorMessage("Faltam dados de contacto obrigatórios.");
      setStep(5);
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    const payload = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        payload.append(key, value.join(", "));
      } else {
        payload.append(key, String(value));
      }
    });
    payload.append("fileCount", String(files.length));
    files.forEach((f) => payload.append("attachments", f.file, f.file.name));

    try {
      const res = await fetch("/api/viability", { method: "POST", body: payload });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Não foi possível enviar o pedido.");
      }
      setStatus("success");
      trackLeadConversion("Estudo de Viabilidade — Wizard");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
    }
  }

  if (status === "success") {
    return (
      <div className="wizard-success">
        <div className="eyebrow">Pedido Recebido</div>
        <h3 className="font-display text-[1.8rem] mb-4 max-w-[20ch]">
          Obrigado, {data.firstname.split(" ")[0] || ""}. O seu Estudo de Viabilidade está em análise.
        </h3>
        <p className="text-graphite font-light leading-[1.8] max-w-[52ch]">
          Um gestor de projeto sénior da DS Projects vai rever tudo o que partilhou e contactá-lo(a)
          nas próximas horas úteis para agendar a visita técnica — sem compromisso. Se anexou plantas
          ou fotografias, elas já seguem junto com o pedido para os primeiros olhares.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="wizard" noValidate>
      <div className="wizard-progress">
        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="wizard-steps-labels">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className={cn("wizard-step-label", i + 1 === step && "active", i + 1 < step && "done")}>
              <em>{String(i + 1).padStart(2, "0")}</em>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="wizard-body">
        {step === 1 && (
          <fieldset className="wizard-step">
            <legend className="eyebrow">Passo 1 — O Espaço</legend>
            <h3 className="font-display text-[1.7rem] mb-8 max-w-[24ch]">Fale-nos do imóvel.</h3>

            <div className="field mb-7">
              <label>Tipo de imóvel</label>
              <div className="wizard-pill-group">
                {propertyTypes.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={cn("wizard-pill", data.propertyType === opt.value && "active")}
                    onClick={() => update("propertyType", opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="location">Localização (concelho ou cidade)</label>
              <input
                id="location"
                type="text"
                placeholder="Ex.: Cascais, Lisboa, Porto…"
                value={data.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="wizard-step">
            <legend className="eyebrow">Passo 2 — Âmbito e Orçamento</legend>
            <h3 className="font-display text-[1.7rem] mb-8 max-w-[24ch]">Escala e horizonte do projeto.</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">
              <div className="field">
                <label htmlFor="area">Área aproximada (m²)</label>
                <input
                  id="area"
                  type="number"
                  min={1}
                  placeholder="Ex.: 120"
                  value={data.area}
                  onChange={(e) => update("area", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="timeline">Prazo pretendido para arranque</label>
                <select id="timeline" value={data.timeline} onChange={(e) => update("timeline", e.target.value)}>
                  <option value="" disabled>Selecionar</option>
                  {timelineOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Faixa de orçamento estimado</label>
              <div className="wizard-pill-group">
                {budgetOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    className={cn("wizard-pill", data.budgetRange === opt.value && "active")}
                    onClick={() => update("budgetRange", opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="wizard-step">
            <legend className="eyebrow">Passo 3 — Objetivos</legend>
            <h3 className="font-display text-[1.7rem] mb-8 max-w-[26ch]">O que quer alcançar com este projeto?</h3>

            <div className="wizard-checkbox-grid mb-7">
              {objectiveOptions.map((opt) => (
                <label key={opt} className="wizard-checkbox">
                  <input
                    type="checkbox"
                    checked={data.objectives.includes(opt)}
                    onChange={() => toggleObjective(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <div className="field">
              <label htmlFor="objectivesOther">Algo mais que devamos saber (opcional)</label>
              <textarea
                id="objectivesOther"
                rows={3}
                placeholder="Contexto adicional sobre o espaço ou o projeto…"
                value={data.objectivesOther}
                onChange={(e) => update("objectivesOther", e.target.value)}
              />
            </div>
          </fieldset>
        )}

        {step === 4 && (
          <fieldset className="wizard-step">
            <legend className="eyebrow">Passo 4 — Documentos e Calendário</legend>
            <h3 className="font-display text-[1.7rem] mb-3 max-w-[26ch]">
              Plantas e fotografias, se já as tiver.
            </h3>
            <p className="text-graphite font-light text-[.92rem] mb-7 max-w-[52ch]">
              Totalmente opcional nesta fase — mas acelera a preparação da visita técnica. Aceita
              PDF, JPG, PNG ou DWG.
            </p>

            <div
              className={cn("wizard-dropzone", dragActive && "active")}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.dwg"
                className="sr-only"
                onChange={(e: ChangeEvent<HTMLInputElement>) => addFiles(e.target.files)}
              />
              <span className="wizard-dropzone-title">Arraste ficheiros para aqui</span>
              <span className="wizard-dropzone-sub">ou clique para escolher no computador</span>
            </div>

            {files.length > 0 && (
              <ul className="wizard-file-list">
                {files.map((f) => (
                  <li key={f.id}>
                    {f.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.previewUrl} alt="" />
                    ) : (
                      <span className="wizard-file-icon">DOC</span>
                    )}
                    <span className="wizard-file-name">{f.file.name}</span>
                    <button type="button" onClick={() => removeFile(f.id)} aria-label={`Remover ${f.file.name}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-9">
              <div className="field">
                <label htmlFor="preferredDate">Data preferencial para visita técnica</label>
                <input
                  id="preferredDate"
                  type="date"
                  value={data.preferredDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => update("preferredDate", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="preferredPeriod">Período preferencial</label>
                <select
                  id="preferredPeriod"
                  value={data.preferredPeriod}
                  onChange={(e) => update("preferredPeriod", e.target.value)}
                >
                  <option value="" disabled>Selecionar</option>
                  {periodOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>
        )}

        {step === 5 && (
          <fieldset className="wizard-step">
            <legend className="eyebrow">Passo 5 — Contacto</legend>
            <h3 className="font-display text-[1.7rem] mb-8 max-w-[24ch]">Para onde enviamos a resposta?</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="field">
                <label htmlFor="firstname">Nome</label>
                <input id="firstname" type="text" autoComplete="name" value={data.firstname} onChange={(e) => update("firstname", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="phone">Telefone</label>
                <input id="phone" type="tel" autoComplete="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div className="field sm:col-span-2">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" value={data.email} onChange={(e) => update("email", e.target.value)} />
              </div>
            </div>

            <label className="flex items-start gap-3 mt-7 text-[.8rem] text-graphite font-light leading-relaxed">
              <input
                type="checkbox"
                className="mt-1"
                checked={data.consent}
                onChange={(e) => update("consent", e.target.checked)}
              />
              Autorizo o tratamento dos meus dados pela DS Projects para ser contactado(a) sobre este
              pedido, nos termos da{" "}
              <a href="/politica-de-privacidade" className="underline">Política de Privacidade</a>.
            </label>
          </fieldset>
        )}

        {step === 6 && (
          <fieldset className="wizard-step">
            <legend className="eyebrow">Passo 6 — Resumo</legend>
            <h3 className="font-display text-[1.7rem] mb-8 max-w-[24ch]">Confirme antes de enviar.</h3>

            <dl className="wizard-summary">
              <div><dt>Imóvel</dt><dd>{propertyTypes.find((p) => p.value === data.propertyType)?.label || "—"} · {data.location || "—"}</dd></div>
              <div><dt>Área</dt><dd>{data.area ? `${data.area} m²` : "—"}</dd></div>
              <div><dt>Prazo</dt><dd>{timelineOptions.find((t) => t.value === data.timeline)?.label || "—"}</dd></div>
              <div><dt>Orçamento</dt><dd>{budgetOptions.find((b) => b.value === data.budgetRange)?.label || "—"}</dd></div>
              <div><dt>Objetivos</dt><dd>{data.objectives.join(", ") || data.objectivesOther || "—"}</dd></div>
              <div><dt>Documentos</dt><dd>{files.length > 0 ? `${files.length} ficheiro(s) anexado(s)` : "Nenhum anexado"}</dd></div>
              <div><dt>Visita preferencial</dt><dd>{data.preferredDate || "A combinar"} {data.preferredPeriod ? `· ${periodOptions.find((p) => p.value === data.preferredPeriod)?.label}` : ""}</dd></div>
              <div><dt>Contacto</dt><dd>{data.firstname || "—"} · {data.phone || "—"} · {data.email || "—"}</dd></div>
            </dl>

            {status === "error" && (
              <p className="text-sm text-red-600 mt-6" role="alert">{errorMessage}</p>
            )}
          </fieldset>
        )}

        {errorMessage && step !== 6 && (
          <p className="text-sm text-red-600 mt-6" role="alert">{errorMessage}</p>
        )}
      </div>

      <div className="wizard-nav">
        {step > 1 ? (
          <button type="button" className="btn btn-light" onClick={goBack}>
            Voltar
          </button>
        ) : <span />}

        {step < TOTAL_STEPS ? (
          <button type="button" className="btn btn-dark" onClick={goNext}>
            Continuar
          </button>
        ) : (
          <button type="submit" className="btn btn-dark" disabled={status === "submitting"}>
            {status === "submitting" ? "A enviar…" : "Enviar Estudo de Viabilidade"}
          </button>
        )}
      </div>
    </form>
  );
}
