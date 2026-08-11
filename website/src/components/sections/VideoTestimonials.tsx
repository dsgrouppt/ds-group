import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Secção de Prova Social — reescrita em ago/2026, fundindo o que antes eram
 * duas secções separadas (Vídeos e Testemunhos), ambas sem conteúdo real:
 * a de Vídeos mostrava 3 cartões com um botão de "play" que não tinha
 * nenhuma ação ao clicar (sem `embedUrl` definido), e a de Testemunhos
 * mostrava 3 cartões sem cliente associado. Duas secções seguidas a
 * comunicar "ainda não temos isto" pesava na primeira leitura da página
 * para quem nunca ouviu falar da DS Projects. Ficou uma só secção com uma
 * mensagem institucional direta — nunca com nomes, citações ou vídeos
 * fictícios atribuídos a clientes que não autorizaram a divulgação.
 * Reativar `Videos.tsx` (ainda no repositório) quando houver vídeo real do
 * processo pronto a publicar.
 */
export function VideoTestimonials() {
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
