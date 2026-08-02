import type { MetadataRoute } from "next";
import { services, siteConfig } from "@/lib/site-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/portfolio`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/politica-de-privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteConfig.url}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${siteConfig.url}/servicos/${service.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...serviceRoutes];
}
