import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-data";

export const metadata: Metadata = buildMetadata({
  title: "Política de Privacidade",
  description: "Política de privacidade e tratamento de dados pessoais da DS Projects.",
  path: "/politica-de-privacidade",
  noIndex: true,
});

export default function PrivacyPolicyPage() {
  return (
    <section className="py-40">
      <div className="container max-w-[760px]">
        <div className="eyebrow">Legal</div>
        <h1 className="font-display text-4xl mb-8">Política de Privacidade</h1>
        <p className="text-graphite font-light leading-relaxed mb-4">
          Este texto é um espaço reservado. O conteúdo definitivo desta página — bases legais de
          tratamento de dados, finalidades, prazos de conservação, direitos do titular dos dados
          (acesso, retificação, apagamento, portabilidade) e contacto do responsável pelo
          tratamento — deve ser redigido e validado por um advogado especializado em proteção de
          dados (RGPD), à semelhança do que está indicado para o contrato-tipo no documento
          &ldquo;Documentos Internos e Modelos&rdquo; da DS Group.
        </p>
        <p className="text-graphite font-light leading-relaxed">
          Para questões relacionadas com o tratamento dos seus dados pessoais, contacte{" "}
          <a href={`mailto:${siteConfig.email}`} className="underline">
            {siteConfig.email}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
