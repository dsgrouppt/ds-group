# Build multi-stage para a plataforma DS OS. Usa o output "standalone" do
# Next.js + cópia explícita do cliente Prisma gerado (o tracing automático
# do Next.js nem sempre inclui os binários do motor do Prisma corretamente).
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Cliente Prisma gerado — cópia explícita de segurança (ver comentário acima).
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Volume para armazenamento de ficheiros — montar um volume persistente
# neste caminho no fornecedor de hosting escolhido (ver docs/manual-tecnico-operacoes.md §3.4).
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage
VOLUME ["/app/storage"]

USER nextjs
EXPOSE 3001
ENV PORT=3001

# Aplica o schema à base de dados antes de arrancar — seguro em produção
# porque "db push" é idempotente (não altera nada se o schema já estiver
# em sincronia). Alternativa mais formal: adotar "prisma migrate deploy"
# com migrações versionadas quando a equipa crescer.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
