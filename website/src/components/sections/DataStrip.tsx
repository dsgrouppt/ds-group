import { stats } from "@/lib/site-data";
import { formatStat } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Componente "pronto para dados reais": enquanto `value` for null em
 * lib/site-data.ts, mostra um travessão com nota explícita — nunca um
 * número inventado. Basta preencher `value` no ficheiro de dados para os
 * números reais aparecerem em toda a aplicação.
 */
export function DataStrip() {
  return (
    <section className="stats bg-black text-white py-16 border-y border-white/[.08]">
      <div className="container">
        <div className="text-center text-[.7rem] tracking-[.1em] uppercase text-[#7c7c7e] mb-10">
          Indicadores em atualização — dados reais publicados após o primeiro trimestre de operação
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} index={i}>
              <div
                className={
                  "text-center px-4 border-l border-white/10 first:border-l-0" +
                  (i === 2 ? " lg:border-l max-[979px]:border-l-0" : "")
                }
              >
                <b>{formatStat(stat.value, stat.suffix)}</b>
                <small className="block mt-1.5 text-[.7rem] tracking-[.1em] uppercase text-[#9a9a9c]">
                  {stat.label}
                </small>
                <em className="block not-italic text-[.66rem] text-[#5c5c5e] mt-2">
                  {stat.value === null ? "a atualizar" : ""}
                </em>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
