import { ImageResponse } from "next/og";
import { getBlogPostBySlug } from "@/lib/blog-data";
import { OgImageLayout, OG_SIZE } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "DS Projects — Blog";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  return new ImageResponse(
    <OgImageLayout eyebrow={post?.category ?? "Blog"} title={post?.title ?? alt} />,
    { ...size }
  );
}
