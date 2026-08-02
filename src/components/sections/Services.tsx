import Link from "next/link";
import { services } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";

export function Services() {
  return (
    <section className="services bg-paper py-36" id="servicos">
      <div className="container">
        <Reveal className="max-w-[50ch] mb-20">
          <div className="eyebrow">Serviços</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight tracking-tight">
            Seis formas de gerir o seu espaço. Uma só equipa responsável.
          </h2>
        </Reveal>

        <div className="services-grid">
          {services.map((service, i) => (
            <Reveal key={service.slug} index={i} delayStep={0.06}>
              <Link href={`/servicos/${service.slug}`} className="service-card block h-full">
                <div className="service-num font-display text-gold text-[.95rem]">{service.num}</div>
                <h3>{service.title}</h3>
                <p>{service.subtitle}</p>
                <span className="link-arrow">
                  <span className="bar" /> Saber mais
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
