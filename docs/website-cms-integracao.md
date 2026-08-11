# Integração DS OS → Website: CMS interno do Portefólio

**Estado:** v1 construída e validada (tsc/lint/build), ainda **não aplicada em produção** — schema Prisma novo, nada migrado, nada publicado. Ver secção 6 para os passos que faltam e exigem a tua aprovação explícita.

## 1. Porque isto existe

Pedido: "CMS interno", "Integração DS OS → Website", "Sistema de publicação", sem esperar pelas fotografias/vídeos reais. O website já tinha um sistema de conteúdo por ficheiros (`content/obras/*/obra.json`, `content/testemunhos/*/testemunho.json`, ver Fase 1) — bom para começar, mas exige editar JSON à mão e fazer commit/push a cada alteração. Este trabalho dá ao Diogo um formulário dentro do DS OS para gerir esse mesmo conteúdo, sem precisar de tocar em ficheiros ou em código.

## 2. Decisão de arquitetura mais importante: sem API pública em tempo real

Considerei duas formas de ligar o DS OS ao website:

- **A) API ao vivo**: o website, ao fazer build, chamaria uma API do DS OS (Railway) para buscar as obras/testemunhos publicados.
- **B) Exportar → importar em ficheiros** (o que foi construído): o DS OS gera um ficheiro JSON descarregável; um script no website escreve esse JSON como `content/obras/*/obra.json` / `content/testemunhos/*/testemunho.json`; o resto do fluxo é o commit/push normal.

Escolhi **B**, por três razões:

1. **Sem superfície pública nova.** A opção A obrigaria a expor um endpoint do DS OS acessível pela internet (mesmo que só de leitura), com todo o cuidado de CORS/rate-limit/segurança que isso implica numa plataforma que já guarda dados de clientes. A opção B mantém o DS OS totalmente atrás de login — a rota de exportação exige sessão de equipa autenticada, tal como qualquer outra página do DS OS.
2. **Sem novo ponto de falha no build do website.** Com a opção A, se o Railway estivesse em baixo ou lento no momento do build do Vercel, o site deixava de compilar. Com a opção B, o website nunca depende de o DS OS estar disponível.
3. **Sem token do GitHub.** Ligar automaticamente "publicar no DS OS" a "fazer commit no website" exigiria dar ao DS OS um token com permissão de escrita no repositório — exatamente o que combinámos evitar nesta conversa. A opção B mantém o commit como um passo humano.

Fica documentado como possível "v2" no fim deste ficheiro, para o caso de decidires mais tarde que a automação total vale o trade-off de segurança.

## 3. Como funciona, passo a passo

1. Em `/marketing/website` (DS OS), cria uma obra — fica sempre em **Rascunho**.
2. Preenche a narrativa completa e a lista de fotos/vídeos (caminho de ficheiro ou link de embed) na página de edição.
3. Quando estiver pronta, muda o estado para **Publicado** (botão na listagem).
4. Testemunhos: `/marketing/website/testemunhos` — criar fica sempre **"Por autorizar"**; só passa a "Autorizado" com uma ação explícita separada, depois de confirmares com o cliente.
5. Na listagem de obras aparece "Exportar conteúdo publicado (N)" — descarrega um `.json` com tudo o que está Publicado + testemunhos Autorizados.
6. No repositório do website: `node scripts/import-cms-export.mjs ~/Transferências/ds-website-export-....json` — escreve/atualiza os ficheiros em `content/`.
7. `git diff content/` para reveres o que mudou, depois commit e push como habitualmente. O Vercel publica no próximo deploy.

Nada disto contorna as barreiras já existentes contra conteúdo fictício: um testemunho só sai no export se `authorized = true`; uma obra só sai se `status = PUBLISHED`; uma foto sem `alt` não passa na validação do loader do website.

## 4. O que foi construído

**Plataforma (`platform/`)**
- `prisma/schema.prisma`: 3 modelos novos — `WebsiteCaseStudy`, `WebsiteMediaAsset`, `WebsiteTestimonial` — mais duas relações inversas adicionadas a `User` e `Project` (aditivo, nada removido/alterado nos modelos existentes). `npx prisma validate` e `npx prisma generate` confirmados a funcionar com a versão do Prisma já usada no projeto (5.20.0).
- `src/app/(app)/marketing/website/page.tsx`, `[id]/page.tsx`, `testemunhos/page.tsx`, `actions.ts`: UI de administração, reaproveitando os componentes (`Card`, `Table`, `Field`, `SubmitButton`, etc.) e o padrão de Server Actions já usados em `obras/`. RBAC: reutiliza o módulo `marketing` já existente na matriz de permissões (`ADMIN`, `DIRECAO`, `MARKETING`) — não foi criada nenhuma role nova.
- `src/app/api/marketing/website/export/route.ts`: rota autenticada (sessão de equipa + permissão `marketing.view`) que devolve o JSON de exportação.
- `src/lib/nav.ts`: uma entrada nova na barra lateral ("Site — Portefólio").

**Website (`website/`)**
- `scripts/import-cms-export.mjs`: script local, sem dependências de rede, que escreve o export nos ficheiros `content/` já validados pelo sistema existente.

## 5. O que ficou deliberadamente fora da v1

- **Upload de ficheiros.** Os campos "Caminho do ficheiro" e "Link de embed" são só texto — ainda não decidiste onde as fotos/vídeos reais vão ficar alojados (pasta pública do site, CDN, Vercel Blob, etc.), por isso não fazia sentido construir upload agora. Assim que decidires, o formulário de media é o sítio óbvio para adicionar isso.
- **Migração da base de dados.** Ver secção 6 — não corri `prisma db push` nem criei nenhuma migração contra uma base de dados real.
- **Blog no CMS.** O blog manteve-se como está (ficheiro `lib/blog-data.ts`, conteúdo já real e de boa qualidade) — trazê-lo para este mesmo sistema é uma extensão natural e pequena do que já existe aqui, se quiseres.

## 6. O que falta para isto ficar ativo — decisão tua

Nada disto tem efeito em produção enquanto não:

1. Reveres os 3 modelos novos em `prisma/schema.prisma` (secção "WEBSITE — CMS INTERNO", no fim do ficheiro).
2. Decidires como aplicar a alteração à base de dados: `npx prisma db push` (o mesmo fluxo que já usas, mas sem histórico de migrações versionado) ou adotar migrations formais primeiro — isso já estava no Roadmap Prioridade 1, ainda em pausa a teu pedido.
3. Correres `npx prisma generate` depois de aplicada.

Nenhum destes três passos foi executado como parte deste trabalho — é sempre uma alteração à base de dados de produção, e essa continua a ser sempre uma decisão e ação tuas, nunca automática.

## 7. Possível v2 (não construído, só documentado)

Se no futuro quiseres automatizar mais o passo 6-7 da secção 3 (sem exportar/importar manualmente):
- Expor a mesma query da rota de exportação como uma API protegida por um token partilhado (não um token do GitHub — um segredo simples, tipo API key, só para esta finalidade), e o website passa a buscar o conteúdo em `getStaticProps`/build-time em vez de ler `content/*.json`.
- Isso reintroduz a dependência de disponibilidade descrita na secção 2 — só valeria a pena depois de teres uma rotina de deploys estável e quiseres publicar sem esperar por um deploy manual do website a cada alteração.
