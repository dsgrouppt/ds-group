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
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
# prisma/seed.ts importa diretamente de "../src/lib/enums" (codigo fonte, nao
# compilado) e e executado via tsx/node_modules dentro do proprio container
# (ver docs: comando "npm run db:seed" no Console da Railway) — sem esta
# copia, falha com "Cannot find module '../src/lib/enums'" porque o output
# "standalone" nao inclui a pasta src/ (so o codigo ja compilado em .next/).
# O output "standalone" do Next.js so inclui, no node_modules, as
# dependencies de producao (tracing automatico) — falta o cliente Prisma
# gerado e sobretudo a CLI "prisma" em si (devDependency, so usada para
# "db push" no arranque do container) com as suas proprias dependencies
# internas (ex.: @prisma/engines). Copiar pacote a pacote e fragil — cada
# versao da CLI pode trazer novas dependencies internas de que nem sempre
# temos conhecimento antecipado. Copia-se por isso o node_modules completo
# do estagio "builder por cima do node_modules parcial do standalone: garante
# que "node node_modules/prisma/build/index.js" (ver CMD) encontra tudo o
# que precisa, sem tocar na rede no arranque do container.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

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
