import { videos } from "@/lib/site-data";
import { Reveal } from "@/components/ui/Reveal";
import { PlaceholderMedia } from "@/components/ui/PlaceholderMedia";

/**
 * Grelha de vídeos reais. Quando existir vídeo, definir `embedUrl` em
 * lib/site-data.ts (YouTube/Vimeo) — este componente troca automaticamente
 * o placeholder por um <iframe> responsivo.
 */
export function Videos() {
  return (
    <section className="py-36 bg-ink text-white" id="videos">
      <div className="container">
        <Reveal className="max-w-[50ch] mb-16">
          <div className="eyebrow-dark">Vídeos</div>
          <h2 className="font-display font-normal text-[clamp(1.9rem,3.4vw,3rem)] leading-tight text-white">
            O processo, filmado do princípio ao fim.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, i) => (
            <Reveal key={video.id} index={i} delayStep={0.08}>
              <div className="video-card">
                {video.embedUrl ? (
                  <iframe
                    src={video.embedUrl}
                    title={video.title}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <PlaceholderMedia
                      variant="dark"
                      className="absolute inset-0"
                      label="Vídeo real DS — a inserir"
                    />
                    <div className="play-btn">
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-white ml-[3px]" aria-hidden="true" focusable="false">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="absolute left-6 bottom-5 z-[2] text-sm text-mist">
                      {video.title}
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
