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
  connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://api.hsforms.com;
  frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.googletagmanager.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://api.hsforms.com;
  frame-ancestors 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

const nextConfig = {
  // NOTA: "output: standalone" foi deliberadamente removido daqui.
  // O website vai para produção via Vercel — a Vercel tem o próprio
  // pipeline de build otimizado para Next.js e a documentação oficial
  // recomenda NÃO usar output "standalone" nesse caso (é para
  // self-hosting via Docker/Node, cenário do website/Dockerfile,
  // mantido para a alternativa VPS mas não usado no deploy Vercel).
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
  async redirects() {
    // Dominio canonico e www.dsprojects.pt (ver NEXT_PUBLIC_SITE_URL).
    // O apex (dsprojects.pt) redireciona sempre para o www, 301 permanente,
    // para evitar conteudo duplicado aos olhos do Google e garantir que o
    // sitemap/canonical/OG batem sempre certo com o dominio realmente servido.
    // Nota: isto so tem efeito depois de ambos os dominios (apex e www)
    // estarem adicionados ao mesmo projeto Vercel -- passo manual no painel.
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "dsprojects.pt" }],
        destination: "https://www.dsprojects.pt/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
