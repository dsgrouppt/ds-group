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
#
# "npm install" em vez de "npm ci" (Fase 4, ago/2026 — adicao da
# dependencia "resend" para notificacoes por email, doc 05 §7.4): o fluxo
# de publicacao de codigo desta missao e feito via upload manual pela
# interface web do GitHub (sem acesso de push/git direto — ver missao
# CTO), o que torna impraticavel publicar o package-lock.json inteiro
# (250KB+, uma arvore de dependencias completa) so para refletir uma linha
# nova no package.json. "npm ci" exige um lockfile exatamente em sincronia
# e falha de outra forma; "npm install" resolve e atualiza o lockfile
# dentro da propria imagem em build time sem exigir isso — com a mesma
# garantia de reprodutibilidade aqui porque TODAS as versoes em
# package.json sao fixas (sem "^"/"~"), nunca ranges, entao "npm install"
# resolve sempre exatamente as mesmas versoes que "npm ci" resolveria.
# Validado localmente (ver docs/notificacoes-runbook.md): "npm install
# --ignore-scripts" a partir do package-lock.json antigo (sem "resend")
# mais o package.json novo instala corretamente a versao exata pedida.
RUN npm install --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl su-exec
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
# uploads sobrevivem a reinicios/redeploys do container.
RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage
ENV STORAGE_DIR=/app/storage/uploads

# NOTA: nao trocamos para "USER nextjs" aqui. A Railway monta o Volume
# persistente em /app/storage DEPOIS do container arrancar, sobrepondo-se a
# este diretorio (ja criado e chown'ado acima em build time) com um volume
# novo que fica root:root. Isso causava "EACCES: permission denied, mkdir
# '/app/storage/uploads'" em todos os uploads de ficheiros em producao,
# porque o processo Node.js corria como "nextjs" e nao tinha permissao para
# criar subpastas no volume montado por root. O container arranca agora como
# root, corre docker-entrypoint.sh (que reaplica o chown ao volume JA
# montado, em cada arranque) e so depois entrega a execucao ao utilizador
# "nextjs" via su-exec -- o processo Node.js final nunca corre como root.
COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001
ENV PORT=3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Aplica o schema à base de dados antes de arrancar — seguro em produção
# porque "db push" é idempotente (não altera nada se o schema já estiver
# em sincronia). Alternativa mais formal: adotar "prisma migrate deploy"
# com migrações versionadas quando a equipa crescer.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && node server.js"]
