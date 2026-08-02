import type { Metadata } from "next";
import { siteConfig } from "./site-data";

interface BuildMetadataInput {
  title: string;
  description: string;
  path?: string; // ex.: "/portfolio"
  noIndex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path = "",
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const url = `${siteConfig.url}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: "pt_PT",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

/** JSON-LD da organização — incluído uma vez no layout raiz. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: siteConfig.name,
    description:
      "Gestão de projeto e remodelação completa de espaços residenciais e comerciais em Portugal.",
    url: siteConfig.url,
    email: siteConfig.email,
    telephone: siteConfig.phone,
    areaServed: siteConfig.locations,
    parentOrganization: {
      "@type": "Organization",
      name: "DS Group",
    },
  };
}

/** JSON-LD de serviço — incluído em cada página /servicos/[slug]. */
export function serviceJsonLd(input: { name: string; description: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: input.name,
    description: input.description,
    url: input.url,
    provider: {
      "@type": "HomeAndConstructionBusiness",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: siteConfig.locations,
  };
}

/** JSON-LD de breadcrumbs — reforça a estrutura do site nos resultados de pesquisa. */
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
