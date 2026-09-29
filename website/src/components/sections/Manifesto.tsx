import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { LinkArrow } from "@/components/ui/LinkArrow";

export function Manifesto() {
  return (
    <section className="py-36 bg-white">
      <div className="container grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-[6vw] items-center">
        <Reveal>
          <div className="eyebrow">Posicionamento</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.22] tracking-tight mb-8">
            Não vendemos remodelações.
            <br />
            Vendemos a ausência de imprevistos.
          </h2>
          <p className="text-[1.05rem] text-graphite max-w-[46ch] leading-[1.85] font-light">
            Existe para quem já passou — ou teme passar — pela gestão informal de uma obra:
            orçamentos que disparam, prazos que se arrastam, equipas que desaparecem a meio.
            Assumimos essa gestão por si, com um único interlocutor e um compromisso contratual
            de prazo e orçamento.
          </p>
          <LinkArrow href="/#metodo" className="mt-10 text-black">
            Conhecer o Método
          </LinkArrow>
        </Reveal>

        <Reveal index={1} className="relative aspect-[4/5] order-first lg:order-last">
          <PlaceholderMedia variant="light" className="absolute inset-0" />
          <div className="absolute inset-[22px] border border-gold/35 pointer-events-none z-[2]" />
        </Reveal>
      </div>
    </section>
  );
}
