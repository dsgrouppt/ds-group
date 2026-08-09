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

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
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
