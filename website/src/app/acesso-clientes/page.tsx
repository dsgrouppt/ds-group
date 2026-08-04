import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-data";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = buildMetadata({
  title: "Acesso Clientes",
  description:
    "Portal de acompanhamento de obra da DS Projects — cronograma, documentos, fotos de evolução e pagamentos, num único lugar.",
  path: "/acesso-clientes",
  noIndex: true,
});

const modules = [
  { title: "Cronograma", text: "Fase atual da obra e próximos marcos, sempre atualizados." },
  { title: "Documentos", text: "Contrato, orçamento, plantas e dossier de garantia num único lugar." },
  { title: "Evolução da Obra", text: "Fotografias organizadas por semana de reporte." },
  { title: "Pagamentos", text: "Estado de faturação e histórico de pagamentos do projeto." },
  { title: "Mensagens", text: "Canal direto com o seu gestor de projeto, com histórico completo." },
  { title: "Relatórios", text: "Reporte semanal estruturado, disponível para consulta a qualquer momento." },
];

export default function ClientAccessPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Acesso Clientes", url: `${siteConfig.url}/acesso-clientes` },
  ]);

  return (
    <>
      <JsonLd schemas={[breadcrumb]} />

      <section className="hero inner">
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            PORTAL DE CLIENTE
          </div>
          <h1>O seu projeto, sempre visível.</h1>
          <p className="hero-sub">
            Cronograma, documentos, fotos de evolução e pagamentos — o mesmo rigor de reporte que
            aplicamos em obra, disponível a qualquer hora.
          </p>
        </div>
      </section>

      <section className="py-36 bg-white">
        <div className="container">
          <Reveal className="max-w-[56ch] mb-16">
            <div className="eyebrow">Em finalização</div>
            <h2 className="font-display font-normal text-[clamp(1.7rem,3vw,2.4rem)] leading-tight tracking-tight mb-6">
              O portal está a ser preparado para os primeiros clientes.
            </h2>
            <p className="text-graphite font-light leading-[1.85] text-[1rem]">
              Todos os projetos ativos da DS Projects têm, desde já, acesso ao mesmo nível de reporte
              através do seu gestor de projeto. O acesso direto por login está em fase final de
              preparação — os clientes com obra em curso recebem as credenciais diretamente do seu
              gestor assim que disponível.
            </p>
          </Reveal>

          <div className="services-grid mb-16">
            {modules.map((m) => (
              <div key={m.title} className="service-card">
                <h3>{m.title}</h3>
                <p>{m.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-6 items-center">
            <Link href="/estudo-de-viabilidade" className="btn btn-light">
              Ainda não é cliente? Pedir Estudo de Viabilidade
            </Link>
            <a href={`mailto:${siteConfig.email}`} className="link-arrow text-black">
              <span className="bar" /> É cliente e precisa de acesso? Contacte o seu gestor
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
