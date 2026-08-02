import type { Metadata } from "next";
import { getFaqByCategory } from "@/lib/faq-data";
import { buildMetadata, faqJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";
import { FinalCTA } from "@/components/sections/FinalCTA";

export const metadata: Metadata = buildMetadata({
  title: "Perguntas Frequentes",
  description:
    "Respostas diretas sobre processo, prazos, orçamento e garantia de uma remodelação com a DS Projects.",
  path: "/faq",
});

export default function FaqPage() {
  const grouped = getFaqByCategory();
  const jsonLd = faqJsonLd(grouped.flatMap((g) => g.items));
  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Perguntas Frequentes", url: `${siteConfig.url}/faq` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="hero inner">
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            APOIO
          </div>
          <h1>Perguntas Frequentes</h1>
          <p className="hero-sub">
            Respostas diretas às perguntas que mais recebemos — sobre processo, prazos, orçamento e garantia.
          </p>
        </div>
      </section>

      <section className="py-36 bg-white">
        <div className="container max-w-[860px] mx-auto">
          {grouped.map((group, gi) => (
            <div key={group.category} className="mb-16">
              <Reveal index={gi}>
                <h2 className="font-display font-normal text-[clamp(1.6rem,2.6vw,2.1rem)] mb-8">
                  {group.category}
                </h2>
              </Reveal>
              <div className="flex flex-col gap-8">
                {group.items.map((item, i) => (
                  <Reveal key={item.question} index={i} delayStep={0.05} className="border-b border-black/[.08] pb-8">
                    <h3 className="font-display font-normal text-[1.15rem] mb-3">{item.question}</h3>
                    <p className="text-graphite font-light leading-[1.85] text-[1rem] max-w-[62ch]">
                      {item.answer}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <FinalCTA
        heading="Ainda tem dúvidas sobre o seu projeto?"
        subtext="Fale connosco diretamente — sem compromisso, sem pressão."
      />
    </>
  );
}
