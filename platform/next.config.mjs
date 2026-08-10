/** @type {import('next').NextConfig} */

// Content-Security-Policy restritiva — esta é uma aplicação interna sem
// scripts de terceiros (sem GTM/analytics/pixels, ao contrário do
// website público). 'unsafe-inline' em style-src é necessário para as
// classes utilitárias do Tailwind injetadas em runtime pelo Next.
// 'unsafe-inline' em script-src é necessário para os scripts inline que o
// Next.js App Router injeta para transportar o payload de React Server
// Components (self.__next_f.push(...)); sem isto, o CSP bloqueia esses
// scripts, a hidratação falha (React #423) e a app fica em branco.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self' data:;
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, " ").trim();

// Bug #21 (auditoria adversarial independente, ago/2026): Server Actions no
// Next.js 14 tem um limite de corpo de pedido de 1MB por omissao, nunca
// configurado neste ficheiro. `src/lib/storage.ts` valida e anuncia um
// limite de 25MB (`MAX_SIZE_BYTES`), mas essa validacao nunca era
// alcancada para ficheiros acima de ~1MB -- o proprio Next.js rejeitava o
// pedido antes de chegar a Server Action, com um erro generico ("Body
// exceeded 1 MB limit"). Isto partia, na pratica, o caso de uso central
// do modulo Obras: fotos de obra tiradas em telemovel tipicamente pesam
// 3-10MB (mais ainda em HEIC/alta resolucao), muito acima de 1MB. Corrigido
// alinhando o limite de Server Actions com o limite ja documentado e
// validado em storage.ts.
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
