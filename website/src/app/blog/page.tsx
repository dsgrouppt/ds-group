import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/blog-data";
import { buildMetadata } from "@/lib/seo";
import { formatLongDate } from "@/lib/utils";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description:
    "Guias diretos sobre remodelação, gestão de obra e investimento imobiliário — escritos pela equipa DS Projects.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const sorted = [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <>
      <section className="hero inner">
        <div className="container hero-content">
          <div className="hero-eyebrow text-[.75rem] tracking-[.32em] uppercase text-mist/85 mb-6">
            RECURSOS
          </div>
          <h1>Blog</h1>
          <p className="hero-sub">
            Guias diretos sobre remodelação, gestão de obra e investimento imobiliário — sem promessas vagas.
          </p>
        </div>
      </section>

      <section className="py-36 bg-white">
        <div className="container max-w-[900px] mx-auto">
          <div className="flex flex-col gap-14">
            {sorted.map((post, i) => (
              <Reveal key={post.slug} index={i} delayStep={0.06} className="border-b border-black/[.08] pb-14">
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="flex items-center gap-4 text-[.75rem] tracking-[.14em] uppercase text-[var(--gold-text)] mb-4">
                    <span>{post.category}</span>
                    <span className="text-graphite/40">·</span>
                    <span className="text-graphite/60 normal-case tracking-normal">{formatLongDate(post.publishedAt)}</span>
                    <span className="text-graphite/40">·</span>
                    <span className="text-graphite/60 normal-case tracking-normal">{post.readTime}</span>
                  </div>
                  <h2 className="font-display font-normal text-[clamp(1.4rem,2.6vw,1.9rem)] leading-[1.3] mb-4 group-hover:opacity-70 transition-opacity">
                    {post.title}
                  </h2>
                  <p className="text-graphite font-light leading-[1.85] text-[1rem] max-w-[62ch] mb-5">
                    {post.excerpt}
                  </p>
                  <span className="link-arrow">
                    <span className="bar" /> Ler artigo
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
