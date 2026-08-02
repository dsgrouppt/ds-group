import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";
import { Reveal } from "@/components/ui/Reveal";
import { ContactForm } from "@/components/forms/ContactForm";
import { siteConfig } from "@/lib/site-data";

interface FinalCTAProps {
  heading?: string;
  subtext?: string;
  showContactLinks?: boolean;
}

export function FinalCTA({
  heading = "Vamos começar pelo espaço que já imaginou.",
  subtext = "Sem compromisso. Sem pressão. Só um plano claro para o seu projeto.",
  showContactLinks = true,
}: FinalCTAProps) {
  return (
    <section className="final-cta relative py-40 bg-black text-white text-center overflow-hidden" id="contacto">
      <div className="absolute inset-0 opacity-20">
        <PlaceholderMedia variant="dark" className="absolute inset-0" label="" />
      </div>

      <Reveal className="container relative z-[1] max-w-[760px] mx-auto">
        <div className="eyebrow-dark justify-center flex">Comece Hoje</div>
        <h2>{heading}</h2>
        <p className="my-7 text-mist font-light text-[1.05rem]">{subtext}</p>

        {showContactLinks && (
          <div className="mb-14 text-[.85rem] text-[#a8a8a8]">
            <a href={`tel:${siteConfig.phone}`} className="text-mist border-b border-white/25">
              {siteConfig.phoneDisplay}
            </a>
            &nbsp;·&nbsp;
            <a href={`mailto:${siteConfig.email}`} className="text-mist border-b border-white/25">
              {siteConfig.email}
            </a>
          </div>
        )}
      </Reveal>

      <Reveal index={1} className="relative z-[1]">
        <ContactForm />
      </Reveal>
    </section>
  );
}
