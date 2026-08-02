import { Reveal } from "@/components/ui/Reveal";

const steps = [
  { num: "01", title: "Arranque", text: "Validação final de plantas, materiais e calendário, numa reunião única com o seu gestor de projeto." },
  { num: "02", title: "Preparação", text: "Encomenda de materiais e alocação de equipas técnicas — tudo pronto antes do primeiro dia de obra." },
  { num: "03", title: "Execução", text: "Obra em curso com reporte semanal estruturado: fotos, percentagem de progresso e próximos passos, todas as sextas-feiras." },
  { num: "04", title: "Controlo de Qualidade", text: "Vistoria técnica interna antes de qualquer entrega ser apresentada ao cliente." },
  { num: "05", title: "Entrega", text: "Vistoria conjunta, resolução de reservas e dossier completo de garantias — o espaço, pronto, sem pontas soltas." },
];

export function Method() {
  return (
    <section className="py-36 bg-white" id="metodo">
      <div className="container">
        <Reveal className="max-w-[44ch] mb-20">
          <div className="eyebrow">Método</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight tracking-tight">
            Cinco fases. Um único responsável.
          </h2>
        </Reveal>

        <div className="method-list">
          {steps.map((step, i) => (
            <Reveal key={step.num} index={i} delayStep={0.08}>
              <div className="method-item">
                <div className="method-num font-display text-[var(--gold-text)] text-[1.1rem]">{step.num}</div>
                <h3>{step.title}</h3>
                <p className="text-graphite font-light max-w-[52ch] text-[.98rem] leading-[1.75]">
                  {step.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
