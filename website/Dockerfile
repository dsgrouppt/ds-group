# Build multi-stage — produz uma imagem final mínima usando o output
# "standalone" do Next.js (só o código e dependências realmente usadas em
# runtime, não a árvore de node_modules completa).
#
# ATENÇÃO: o deploy ativo do website é a Vercel (ver docs/comparacao-hosting.md),
# que não usa este Dockerfile e não precisa de "output: standalone" (por isso
# essa linha foi removida de next.config.mjs). Este Dockerfile fica pronto
# para a alternativa VPS/Hetzner — se vier a ser usado, repor
# `output: "standalone"` em next.config.mjs antes de construir a imagem.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GTM_ID
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_META_PIXEL_ID
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
