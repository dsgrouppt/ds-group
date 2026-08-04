import { faqItems } from "@/lib/faq-data";
import { faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/ui/Reveal";
import { LinkArrow } from "@/components/ui/LinkArrow";

/**
 * Amostra das perguntas com maior impacto na decisão (uma por categoria),
 * com link para a lista completa em /faq. O JSON-LD FAQPage aqui reflete
 * apenas as perguntas visíveis nesta secção — a página /faq tem o seu
 * próprio schema com o conjunto completo.
 */
const featuredQuestions = [
  "Vou ter um único ponto de contacto durante a obra?",
  "Como é feito o orçamento?",
  "O que acontece se a obra ultrapassar o prazo acordado?",
  "O que é entregue no final da obra?",
];

export function FaqPreview() {
  const items = featuredQuestions
    .map((q) => faqItems.find((f) => f.question === q))
    .filter((item): item is (typeof faqItems)[number] => Boolean(item));

  const jsonLd = faqJsonLd(items.map(({ question, answer }) => ({ question, answer })));

  return (
    <section className="py-36 bg-white" id="faq">
      <JsonLd schemas={[jsonLd]} />
      <div className="container grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr] gap-[6vw]">
        <Reveal>
          <div className="eyebrow">Perguntas Frequentes</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight tracking-tight mb-8 max-w-[14ch]">
            Antes de perguntar, já respondemos.
          </h2>
          <p className="text-graphite font-light leading-[1.8] text-[1rem] max-w-[42ch] mb-10">
            As dúvidas mais diretas sobre processo, prazo, orçamento e garantia — sem respostas
            genéricas.
          </p>
          <LinkArrow href="/faq" className="text-black">
            Ver todas as perguntas
          </LinkArrow>
        </Reveal>

        <div className="flex flex-col">
          {items.map((item, i) => (
            <Reveal
              key={item.question}
              index={i}
              delayStep={0.07}
              className="border-b border-black/[.08] py-8 first:pt-0 last:border-b-0"
            >
              <h3 className="font-display font-normal text-[1.12rem] mb-3">{item.question}</h3>
              <p className="text-graphite font-light leading-[1.8] text-[.96rem] max-w-[58ch]">
                {item.answer}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
