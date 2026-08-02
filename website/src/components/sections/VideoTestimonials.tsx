import { videoTestimonials } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";

export function VideoTestimonials() {
  return (
    <section className="py-36 bg-black text-white" id="testemunhos">
      <div className="container">
        <Reveal className="max-w-[50ch] mb-16">
          <div className="eyebrow-dark">Testemunhos</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight">
            Contado por quem viveu o processo.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoTestimonials.map((t, i) => (
            <Reveal key={t.id} index={i} delayStep={0.08}>
              <div className="testimonial-card">
                {t.embedUrl ? (
                  <iframe
                    src={t.embedUrl}
                    title={t.clientName ?? "Testemunho"}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <PlaceholderMedia
                      variant="dark"
                      className="absolute inset-0"
                      label="Testemunho em vídeo — a inserir"
                    />
                    <div className="play-btn">
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-white ml-[3px]" aria-hidden="true" focusable="false">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="absolute left-6 bottom-5 right-6 z-[2]">
                      <b className="font-display font-medium text-[1.05rem] block">
                        {t.clientName ?? "[Nome do Cliente]"}
                      </b>
                      <span className="text-[.76rem] text-[#c9c9c8]">{t.context}</span>
                    </div>
                  </>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
