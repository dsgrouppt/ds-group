import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPostBySlug, getRelatedBlogPosts } from "@/lib/blog-data";
import { getServiceBySlug } from "@/lib/site-data";
import { buildMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site-data";
import { formatLongDate } from "@/lib/utils";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { JsonLd } from "@/components/JsonLd";

interface BlogPostPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPostPageProps): Metadata {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return {};

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
  });
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const related = getRelatedBlogPosts(post.slug, 2);
  const relatedServices = (post.relatedServiceSlugs ?? [])
    .map((s) => getServiceBySlug(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const jsonLd = articleJsonLd({
    title: post.title,
    description: post.excerpt,
    url: `${siteConfig.url}/blog/${post.slug}`,
    datePublished: post.publishedAt,
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Início", url: siteConfig.url },
    { name: "Blog", url: `${siteConfig.url}/blog` },
    { name: post.title, url: `${siteConfig.url}/blog/${post.slug}` },
  ]);

  return (
    <>
      <JsonLd schemas={[jsonLd, breadcrumb]} />

      <section className="pt-[calc(var(--header-h,88px)+7rem)] pb-20 bg-white">
        <div className="container max-w-[760px] mx-auto">
          <div className="flex items-center gap-4 text-[.75rem] tracking-[.14em] uppercase text-[var(--gold-text)] mb-6">
            <span>{post.category}</span>
            <span className="text-graphite/40">·</span>
            <span className="text-graphite/60 normal-case tracking-normal">{formatLongDate(post.publishedAt)}</span>
            <span className="text-graphite/40">·</span>
            <span className="text-graphite/60 normal-case tracking-normal">{post.readTime}</span>
          </div>
          <h1 className="font-display font-normal text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.2] mb-10">
            {post.title}
          </h1>
        </div>
      </section>

      <section className="pb-32 bg-white">
        <div className="container max-w-[760px] mx-auto">
          {post.body.map((block, i) => (
            <div key={i} className="mb-10">
              {block.heading && (
                <h2 className="font-display font-normal text-[clamp(1.4rem,2.6vw,1.8rem)] mb-5 mt-2">
                  {block.heading}
                </h2>
              )}
              {block.paragraphs.map((p, pi) => (
                <p key={pi} className="text-graphite font-light leading-[1.9] text-[1.05rem] mb-5">
                  {p}
                </p>
              ))}
              {block.list && (
                <ul className="flex flex-col gap-3 mt-2">
                  {block.list.map((item, li) => (
                    <li key={li} className="text-graphite font-light leading-[1.8] text-[1.02rem] pl-6 relative">
                      <span className="absolute left-0 top-[.7em] w-[6px] h-[6px] rounded-full bg-[var(--gold-text)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="mt-16 pt-10 border-t border-black/[.08] flex flex-col gap-4">
            {relatedServices.length > 0 && (
              <p className="text-graphite font-light text-[.95rem]">
                Este tema está diretamente relacionado com{" "}
                {relatedServices.map((s, i) => (
                  <span key={s.slug}>
                    <Link href={`/servicos/${s.slug}`} className="underline hover:no-underline">
                      {s.title}
                    </Link>
                    {i < relatedServices.length - 1 ? " e " : ""}
                  </span>
                ))}
                .
              </p>
            )}
            <Link href="/faq" className="link-arrow">
              <span className="bar" /> Ver todas as Perguntas Frequentes
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-24 pb-36 bg-paper">
          <div className="container max-w-[900px] mx-auto">
            <h3 className="font-display font-normal text-[1.6rem] mb-10">Outros artigos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {related.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="service-card block h-full">
                  <div className="text-[.7rem] tracking-[.14em] uppercase text-[var(--gold-text)] mb-3">
                    {p.category}
                  </div>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                  <span className="link-arrow">
                    <span className="bar" /> Ler artigo
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <FinalCTA
        heading="Pronto para falar sobre o seu projeto?"
        subtext="Sem compromisso. Sem pressão. Só um plano claro para o seu espaço."
      />
    </>
  );
}
