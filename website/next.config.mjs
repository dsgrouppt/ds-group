/** @type {import('next').NextConfig} */
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
        ],
      },
    ];
  },
};

export default nextConfig;
