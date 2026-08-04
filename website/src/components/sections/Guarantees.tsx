import { Reveal } from "@/components/ui/Reveal";

/**
 * Garantias contratuais da DS Projects — o contraponto direto às objeções
 * mais comuns do setor (prazo que desliza, orçamento que dispara, obra
 * sem interlocutor). Cada garantia é uma promessa operacional concreta,
 * não uma alegação de marketing — todas têm correspondência direta no
 * Método (ver Method.tsx) e no processo comercial (ver docs/crm-especificacao.md).
 */
const guarantees = [
  {
    num: "01",
    title: "Prazo contratual, não estimado.",
    text: "O calendário entregue na proposta é um compromisso escrito, com penalização definida em contrato — não uma previsão otimista sujeita a revisão.",
  },
  {
    num: "02",
    title: "Orçamento fechado antes da primeira demolição.",
    text: "Nenhuma obra arranca sem levantamento técnico presencial. É esse levantamento — não uma estimativa à distância — que fecha o valor final do projeto.",
  },
  {
    num: "03",
    title: "Um único interlocutor, do início ao fim.",
    text: "O seu gestor de projeto responde por todas as especialidades técnicas envolvidas. Nunca terá de coordenar diretamente eletricista, canalizador ou carpinteiro.",
  },
  {
    num: "04",
    title: "Dossier de garantia na entrega.",
    text: "Materiais aplicados, especificações técnicas e contactos relevantes documentados e entregues consigo na vistoria final — não prometidos, entregues.",
  },
];

export function Guarantees() {
  return (
    <section className="py-36 bg-paper" id="garantias">
      <div className="container">
        <Reveal className="max-w-[50ch] mb-20">
          <div className="eyebrow">Garantias</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight tracking-tight">
            Quatro compromissos que assumimos por escrito.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
          {guarantees.map((g, i) => (
            <Reveal key={g.num} index={i} delayStep={0.08}>
              <div className="flex gap-6">
                <span className="font-display text-[var(--gold-text)] text-[1.05rem] shrink-0 pt-1">
                  {g.num}
                </span>
                <div>
                  <h3 className="font-display font-medium text-[1.3rem] leading-snug mb-3 max-w-[22ch]">
                    {g.title}
                  </h3>
                  <p className="text-graphite font-light leading-[1.8] text-[.98rem] max-w-[46ch]">
                    {g.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
