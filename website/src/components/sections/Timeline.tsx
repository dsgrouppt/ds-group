import { timelineSteps } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";

export function Timeline() {
  return (
    <section className="py-36 bg-paper" id="cronologia">
      <div className="container">
        <Reveal className="max-w-[54ch] mb-6">
          <div className="eyebrow">Cronologia</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight">
            Uma obra DS, semana a semana.
          </h2>
        </Reveal>
        <Reveal index={1}>
          <p className="text-[.78rem] text-graphite-light italic max-w-[60ch] mb-20">
            Exemplo ilustrativo de um projeto de remodelação completa de apartamento. O cronograma
            real de cada projeto é definido em proposta e acompanhado na Área do Cliente.
          </p>
        </Reveal>

        <div className="timeline">
          {timelineSteps.map((step, i) => (
            <Reveal key={step.time} index={i} delayStep={0.08} className="timeline-step">
              <div className="timeline-dot" />
              <time>{step.time}</time>
              <h4>{step.title}</h4>
              <p className="text-[.86rem] text-graphite font-light leading-relaxed">
                {step.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
