import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Termos e Condições",
  description: "Termos e condições de utilização do website da DS Projects.",
  path: "/termos",
  noIndex: true,
});

export default function TermsPage() {
  return (
    <section className="py-40">
      <div className="container max-w-[760px]">
        <div className="eyebrow">Legal</div>
        <h1 className="font-display text-4xl mb-8">Termos e Condições</h1>
        <p className="text-graphite font-light leading-relaxed">
          Este texto é um espaço reservado. Os termos definitivos de utilização deste website
          devem ser redigidos e validados por um advogado antes de publicação, tal como indicado
          para os restantes documentos contratuais da DS Group.
        </p>
      </div>
    </section>
  );
}
