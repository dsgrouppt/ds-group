/** @type {import('next').NextConfig} */

// Content-Security-Policy: permite os scripts/beacons de GTM, GA4, Meta Pixel
// e a submissão do formulário à HubSpot Forms API, sem abrir a política a
// mais nada. 'unsafe-inline' em script-src é necessário para os snippets de
// arranque do GTM/GA4/Meta Pixel injetados via next/script (bootstrap
// inline padrão dessas plataformas) — se no futuro se migrar para nonces,
// remover 'unsafe-inline' de script-src.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://api.hsforms.com;
  frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.googletagmanager.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://api.hsforms.com;
  frame-ancestors 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  images: {
    // Quando existirem fotografias reais alojadas externamente (CDN, HubSpot Files, etc.),
    // adicionar aqui o(s) domínio(s) de origem. Ex.:
    // remotePatterns: [{ protocol: 'https', hostname: 'cdn.dsprojects.pt' }],
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: ContentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
