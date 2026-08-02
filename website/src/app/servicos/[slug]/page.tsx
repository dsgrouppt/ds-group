import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetail } from "@/components/sections/ServiceDetail";
import { services, getServiceBySlug, siteConfig } from "@/lib/site-data";
import { buildMetadata, serviceJsonLd, breadcrumbJsonLd } from "@/lib/seo";

interface ServicePageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export function generateMetadata({ params }: ServicePageProps): Metadata {
  const service = getServiceBySlug(params.slug);
  if (!service) return {};

  return buildMetadata({
    title: service.title,
    description: service.subtitle,
    path: `/servicos/${service.slug}`,
  });
}

export default function ServicePage({ params }: ServicePageProps) {
  const service = getServiceBySlug(params.slug);
  if (!service) notFound();

  const jsonLd = serviceJsonLd({
    name: service.title,
    description: service.subtitle,
    url: `${siteConfig.url}/servicos/${service.slug}`,
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Serviços", url: `${siteConfig.url}/#servicos` },
    { name: service.title, url: `${siteConfig.url}/servicos/${service.slug}` },
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
      <ServiceDetail service={service} />
    </>
  );
}
