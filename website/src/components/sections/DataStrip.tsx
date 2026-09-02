import { services, siteConfig } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Faixa de indicadores institucionais — reescrita em ago/2026: a versão
 * anterior mostrava 4 números "—" com nota "a atualizar", o que lia como
 * uma secção por terminar. Regra aplicada a partir de agora: só entra aqui
 * o que é verificável por construção — `services.length` e
 * `siteConfig.locations.length` vêm diretamente dos mesmos ficheiros de
 * dados usados no resto do site, nunca um número digitado à parte, e os
 * dois compromissos operacionais correspondem a garantias já assumidas por
 * escrito na secção Garantias. Métricas de desempenho (projetos entregues,
 * % no prazo, avaliação de clientes) só devem entrar aqui quando houver um
 * histórico real da DS Projects para publicar — não antes.
 */
const commitments = [
  { label: "Levantamento técnico presencial", detail: "antes de qualquer orçamento" },
  { label: "Reporte semanal estruturado", detail: "em todos os projetos" },
];

export function DataStrip() {
  return (
    <section className="stats bg-black text-white py-16 border-y border-white/[.08]">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <Reveal index={0}>
            <div className="text-center px-4 border-l border-white/10 first:border-l-0">
              <b className="font-display font-normal text-[clamp(1.8rem,3vw,2.4rem)] block">
                {services.length}
              </b>
              <small className="block mt-1.5 text-[.7rem] tracking-[.1em] uppercase text-[#9a9a9c]">
                Especialidades
              </small>
            </div>
          </Reveal>
          <Reveal index={1}>
            <div className="text-center px-4 border-l border-white/10">
              <b className="font-display font-normal text-[clamp(1.8rem,3vw,2.4rem)] block">
                {siteConfig.locations.length}
              </b>
              <small className="block mt-1.5 text-[.7rem] tracking-[.1em] uppercase text-[#9a9a9c]">
                Zonas com Página Dedicada
              </small>
            </div>
          </Reveal>
          {commitments.map((c, i) => (
            <Reveal key={c.label} index={i + 2}>
              <div className="text-center px-4 border-l border-white/10 max-[979px]:border-l-0 flex flex-col justify-center h-full">
                <b className="font-display font-normal text-[1.05rem] leading-snug block">{c.label}</b>
                <small className="block mt-1.5 text-[.7rem] tracking-[.1em] uppercase text-[#9a9a9c]">
                  {c.detail}
                </small>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
