import type { MetadataRoute } from "next";
import { services, siteConfig } from "@/lib/site-data";
import { localAreas } from "@/lib/local-seo-data";
import { blogPosts } from "@/lib/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/portfolio`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/estudo-de-viabilidade`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteConfig.url}/politica-de-privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteConfig.url}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${siteConfig.url}/servicos/${service.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const localRoutes: MetadataRoute.Sitemap = localAreas.map((area) => ({
    url: `${siteConfig.url}/remodelacoes/${area.slug}`,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...serviceRoutes, ...localRoutes, ...blogRoutes];
}
