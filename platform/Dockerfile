# Build multi-stage para a plataforma DS OS. Usa o output "standalone" do
# Next.js + cópia explícita do cliente Prisma gerado (o tracing automático
# do Next.js nem sempre inclui os binários do motor do Prisma corretamente).
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
# --ignore-scripts: nesta fase so existem package.json/package-lock.json
# (ver COPY acima) — o schema do Prisma so e copiado no estagio "builder"
# (COPY . .). Sem isto, o postinstall (prisma generate) desta stage falha
# porque nao encontra prisma/schema.prisma. O "builder" ja corre
# "npx prisma generate" explicitamente depois de copiar tudo (linha 15).
RUN npm ci --ignore-scripts

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
# CLI do Prisma (devDependency) — o output "standalone" do Next.js so inclui
# as dependencies de producao, por isso "npx prisma" nao encontrava o
# pacote localmente e ia buscar a ultima versao (7.x) ao registo em cada
# arranque do container: mais lento, dependente de rede, e a v7 removeu a
# flag --skip-generate usada no CMD abaixo, o que impedia o "node server.js"
# de sequer arrancar (healthcheck falhava sempre). Copiar a versao fixa aqui
# faz o "npx prisma" resolver a local, sem tocar na rede.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Armazenamento de ficheiros — persistência via Railway Volumes, não via
# Docker VOLUME (Railway não suporta a instrução VOLUME do Dockerfile;
# volumes são configurados no painel do serviço, não em build time).
# Passo manual obrigatório no dashboard da Railway, para este serviço:
#   Settings -> Volumes -> Add Volume -> Mount Path: /app/storage
# STORAGE_DIR aponta para dentro desse mount path, garantindo que os
# uploads sobrevivem a reinícios/redeploys do container.
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage
ENV STORAGE_DIR=/app/storage/uploads

USER nextjs
EXPOSE 3001
ENV PORT=3001

# Aplica o schema à base de dados antes de arrancar — seguro em produção
# porque "db push" é idempotente (não altera nada se o schema já estiver
# em sincronia). Alternativa mais formal: adotar "prisma migrate deploy"
# com migrações versionadas quando a equipa crescer.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && node server.js"]
