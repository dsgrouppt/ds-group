import Link from "next/link";
import { getAuthorizedTestimonials } from "@/lib/testimonials-data";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";

/**
 * Secção de Prova Social. Sistema pronto para dois estados:
 *
 * 1. Sem testemunhos autorizados (estado atual): mensagem institucional
 *    direta — nunca "ainda não existem", sempre "publicado à medida que o
 *    cliente autoriza". Nunca nomes, citações ou vídeos fictícios.
 * 2. Com testemunhos autorizados (`lib/testimonials-data.ts`,
 *    `authorized: true`): grelha de cartões reais — texto, vídeo,
 *    classificação, fotografia e localização, conforme o que cada
 *    testemunho tiver preenchido.
 */
export function VideoTestimonials() {
  const items = getAuthorizedTestimonials();

  if (items.length === 0) {
    return (
      <section className="py-36 bg-black text-white" id="testemunhos">
        <div className="container">
          <Reveal className="max-w-[58ch]">
            <div className="eyebrow-dark">Prova Social</div>
            <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight mb-6">
              Publicado à medida que cada cliente autoriza.
            </h2>
            <p className="text-[#c9c9c8] font-light leading-[1.85] text-[1rem]">
              Cada projeto DS Projects envolve informação de clientes reais — moradas, valores,
              fotografias de espaços privados. Só publicamos um vídeo do processo, um testemunho ou
              um estudo de caso depois de o cliente em causa autorizar expressamente essa divulgação.
              Não publicamos conteúdo de demonstração nem atribuímos citações a clientes fictícios.
            </p>
            <p className="text-[#9a9a9c] font-light leading-[1.85] text-[.92rem] mt-5">
              Os primeiros vídeos, estudos de caso e testemunhos autorizados serão publicados aqui,
              progressivamente, à medida que os projetos em curso forem concluídos.
            </p>
            <Link href="/estudo-de-viabilidade" className="link-arrow text-white mt-9 inline-flex">
              <span className="bar" /> Quer ser um dos primeiros a partilhar o seu projeto?
            </Link>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section className="py-36 bg-black text-white" id="testemunhos">
      <div className="container">
        <Reveal className="max-w-[58ch] mb-16">
          <div className="eyebrow-dark">Prova Social</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight">
            Contado por quem viveu o processo.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((t, i) => (
            <Reveal key={t.id} index={i} delayStep={0.08}>
              <div className="testimonial-card">
                {t.kind === "video" && t.embedUrl ? (
                  <iframe
                    src={t.embedUrl}
                    title={t.clientName ?? "Testemunho"}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <PlaceholderMedia variant="dark" src={t.photo} className="absolute inset-0" />
                )}
                <div className="absolute left-6 bottom-5 right-6 z-[2]">
                  {t.rating && (
                    <div className="text-[var(--gold-text)] text-[.8rem] mb-1" aria-label={`${t.rating} de 5 estrelas`}>
                      {"★".repeat(t.rating)}
                      {"☆".repeat(5 - t.rating)}
                    </div>
                  )}
                  {t.quote && t.kind === "texto" && (
                    <p className="text-[.85rem] text-white/90 italic mb-2 leading-snug">&ldquo;{t.quote}&rdquo;</p>
                  )}
                  <b className="font-display font-medium text-[1.05rem] block">{t.clientName}</b>
                  {t.location && <span className="text-[.76rem] text-[#c9c9c8]">{t.location}</span>}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
