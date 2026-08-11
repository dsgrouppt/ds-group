import { Reveal } from "@/components/ui/Reveal";

/**
 * Antiga grelha de 4 cartões de pessoa (sem nome, sem fotografia — "[Nome]")
 * substituída em ago/2026 por uma descrição coletiva honesta. Inventar
 * nomes ou fotografias de stock para "colaboradores" que não estão
 * identificados seria enganoso (poderia inclusivamente usar a imagem de uma
 * pessoa real, não colaboradora da DS Projects, como se fosse funcionária).
 * Reintroduzir os cartões individuais quando houver nomes, cargos e
 * fotografias reais da equipa para publicar.
 */
const functions = [
  "Direção de Operações",
  "Gestão de Projeto",
  "Direção Técnica e Qualidade",
  "Comercial",
];

export function Team() {
  return (
    <section className="py-36 bg-white" id="equipa">
      <div className="container">
        <Reveal className="max-w-[50ch] mb-14">
          <div className="eyebrow">Equipa</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight">
            As pessoas que respondem pelo seu projeto.
          </h2>
        </Reveal>

        <Reveal index={1} className="max-w-[64ch]">
          <p className="text-graphite font-light leading-[1.85] text-[1.02rem]">
            Cada projeto DS Projects passa por uma equipa multidisciplinar própria, organizada em
            quatro funções centrais — cada uma com responsabilidade clara sobre uma parte do
            resultado final, coordenadas por um único gestor de projeto perante o cliente.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-7 mt-12">
          {functions.map((role, i) => (
            <Reveal key={role} index={i} delayStep={0.08}>
              <div className="border-t border-black/10 pt-5">
                <span className="text-[.78rem] text-[var(--gold-text)] tracking-wide uppercase">
                  {role}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
