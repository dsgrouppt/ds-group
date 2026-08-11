import { ImageResponse } from "next/og";
import { getServiceBySlug } from "@/lib/site-data";
import { OgImageLayout, OG_SIZE } from "@/lib/og-image";

export const runtime = "edge";
export const alt = "DS Projects — Serviços";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const service = getServiceBySlug(params.slug);
  return new ImageResponse(
    <OgImageLayout eyebrow="Serviços" title={service?.title ?? alt} />,
    { ...size }
  );
}
