# DS OS — MASTER HANDOVER (PARTE 1 de 3)

**Documento de entrega técnica completa, escrito como se um CTO estivesse a passar este projeto a outro CTO que nunca o viu.**

Data de escrita: 2026-08-10 (véspera do fim desta sessão de trabalho).
Autor: Claude (sessão de auditoria adversarial independente + handover), a pedido de Diogo Sampaio (DS Group).

**Como usar este documento**: são 3 ficheiros — esta é a Parte 1. As outras duas são `DS_OS_MASTER_HANDOVER_PART2.md` (Alterações estruturais, Integrações, Produção, Segurança, Base de Dados, Roadmap, Dívida Técnica) e `DS_OS_MASTER_HANDOVER_PART3.md` (Melhorias futuras, Lições aprendidas, Estado atual em percentagens, Fonte de verdade, Regras para o próximo Claude, Objetivo futuro). Lê os três por ordem — não são independentes, cada um assume que já leste o anterior.

**Metodologia deste documento**: tudo o que está escrito aqui foi verificado diretamente contra o código-fonte real (`git log` completo do repositório, `prisma/schema.prisma`, `src/middleware.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts`, comentários `Bug #N` no código, ficheiros de configuração reais) e contra o estado real da infraestrutura em produção (Railway, verificado via UI e via consola em execuções reais desta sessão), não reconstruído de memória da conversa. Onde a reconstrução não foi 100% possível a partir de artefactos persistentes (ver nota sobre bugs #1–#6 na Secção 4), isso é dito explicitamente — este documento não inventa detalhes para parecer mais completo do que a realidade permite.

---

## 1. Estado atual do projeto

### 1.1. Website (`website/`) — DS Projects

**Estado: em produção, publicamente acessível, sem bloqueios técnicos conhecidos.**

- **URL de produção**: `https://www.dsprojects.pt` (também responde em `dsprojects.pt`).
- **Hosting**: Vercel. Deploy automático a cada `git push` para `master` que toque em `website/**` (o monorepo usa `paths` no workflow de CI para isolar os dois deploys — ver Secção 7 na Parte 2 para detalhe do CI/CD).
- **Conteúdo**: site institucional da DS Projects (remodelações), com 32 rotas: homepage, 6 páginas de serviço (`/servicos/[slug]`), 8 páginas de SEO local por cidade (`/remodelacoes/[cidade]`), 6 artigos de blog (`/blog/[slug]`), portefólio, FAQ com schema `FAQPage`, Estudo de Viabilidade (wizard de 6 passos), política de privacidade, termos.
- **Stack**: Next.js 14.2.35 App Router, TypeScript, Tailwind CSS, `framer-motion` (animações), `sharp` (otimização de imagem, necessário para o `next/image` não cair no fallback WASM mais lento em produção).
- **Sem base de dados** — é um site estático/SSG com algumas rotas de API para formulários (`/api/contact`, `/api/viability`), que fazem forward direto para a HubSpot Forms API, sem persistência própria.
- **Analytics/Marketing**: GA4, GTM e Meta Pixel já têm o código de integração pronto (`src/components/analytics/Analytics.tsx`), só carregam se as variáveis de ambiente `NEXT_PUBLIC_GA_ID`/`NEXT_PUBLIC_GTM_ID`/`NEXT_PUBLIC_META_PIXEL_ID` estiverem definidas. Confirmar no painel da Vercel se estão de facto preenchidas em produção (ver Secção 6, Parte 2, para o estado exato de cada integração).
- **SEO técnico**: sitemap, robots.txt, JSON-LD (`FAQPage`, `Service`, `Article`), Open Graph dinâmico, canonical, `lang="pt-PT"`, acessibilidade básica (skip-link, um único `<h1>` por página, `label`/`htmlFor` em todos os campos de formulário) — tudo confirmado com pedidos HTTP reais durante as auditorias anteriores (ver `docs/auditoria-fase1-website.md`, `docs/relatorio-final-cto.md`, `docs/relatorio-segunda-ronda.md`).
- **Cabeçalhos de segurança**: CSP, HSTS, X-Frame-Options — confirmados na resposta real do servidor.
- **Formulário de contacto**: validação client+server, honeypot anti-spam, consentimento RGPD obrigatório, rate limiting.
- **Upload de ficheiros no Estudo de Viabilidade**: o wizard aceita upload de plantas/fotografias e mostra pré-visualização no browser, mas **não persiste o binário** — só regista quantos ficheiros foram anexados e os nomes, no resumo enviado para a HubSpot. Isto está documentado no próprio código como limitação deliberada (falta decidir e ligar um destino de armazenamento — Vercel Blob ou S3/R2/Supabase Storage). Não é um bug, é uma funcionalidade parcialmente implementada. Ver Secção 11 (Dívida Técnica, Parte 2).
- **Dependências**: Next.js 14.2.35 (mesma versão da plataforma), zero vulnerabilidades "high" corrigíveis sem major upgrade — as pendentes exigem Next.js 16 (ver Secção 11, Parte 2).

### 1.2. Plataforma DS OS (`platform/`) — ERP+CRM interno

**Estado: em produção, em uso real, auditada adversarialmente de forma independente e considerada GO para "centenas de clientes" (com riscos residuais documentados e aceites — ver Secção 4 e o veredito completo relatado ao utilizador em chat, resumido na Secção 14 da Parte 3).**

- **URL de produção**: `https://os.dsprojects.pt` (também acessível pelo domínio interno da Railway `ds-os-platform-production.up.railway.app`, não deve ser usado como URL principal — é o domínio de fallback do próprio Railway).
- **Hosting**: Railway, serviço `ds-os-platform` (ID `5946ed05-7673-4c03-bedc-ed4e3abfc7be`), projeto `dynamic-tenderness`, ambiente `production`. Deploy automático via GitHub (branch `master`, root directory `./platform`).
- **Base de dados**: PostgreSQL 18.4 gerido pela Railway, serviço `ds-os-db` (ID `70f41fb3-fc55-49a6-bd00-739ee4ec0d51`), imagem `ghcr.io/railwayapp-templates/postgres-ssl:18` (nota: há uma atualização menor disponível para 18.4 — não crítica, ver Secção 11, Parte 2).
- **Utilizador admin único confirmado em produção nesta sessão**: `admin@dsgroup.pt` (Diogo Sampaio, role `ADMIN`) — password reposta nesta sessão a pedido do utilizador (ver conversa; não repetida aqui por segurança, mas o mecanismo de reposição está documentado na Secção 8 da Parte 2, "Regras para redefinir password de admin").
- **7 perfis de utilizador** (`ADMIN`, `DIRECAO`, `COMERCIAL`, `GESTOR_PROJETO`, `FINANCEIRO`, `RH`, `MARKETING`), com RBAC completo — ver Secção 2.5.
- **9 módulos funcionais com CRUD completo** (criar, listar, editar, apagar, paginação real ou limite de segurança): Clientes, CRM, Obras, Financeiro, Agenda, RH, Marketing, Tarefas, Definições/Utilizadores.
- **Automação central**: um negócio (`Deal`) que avança para a etapa `FECHADO_GANHO` no CRM cria automaticamente uma Obra (`Project`) ligada ao mesmo negócio e cliente — este é o coração do fluxo de negócio da empresa (lead → negócio → obra), testado de ponta a ponta várias vezes ao longo do projeto.
- **Uploads**: fotografias, contratos, documentos — guardados em disco no volume persistente da Railway (`ds-os-platform-ds-os-uploads`, montado em `STORAGE_DIR`), nunca em `/public`, servidos só via `/api/files/[id]` atrás de sessão válida, com validação de tipo/tamanho (25MB) e verificação de assinatura binária real ("magic bytes"), não só o `Content-Type` declarado pelo browser.
- **Backups**: cobrem agora tanto a base de dados como o volume de uploads, diariamente, com retenção diário/semanal/mensal — ver Secção 7 (Parte 2) e `docs/backup-runbook.md` para o detalhe técnico completo (é o documento mais atualizado e mais fiável sobre este tópico específico, mais recente do que este handover).
- **`robots: { index: false, follow: false }`** no layout raiz — a plataforma nunca é indexada por motores de busca, mesmo que o domínio se torne público por engano.

### 1.3. Portal do Cliente (`platform/src/app/portal/`)

**Estado: implementado, em produção, testado de ponta a ponta em produção durante auditorias anteriores. Isolado da equipa interna por desenho (ver Secção 2.6).**

- **URL de produção**: `https://os.dsprojects.pt/portal/login` (mesma aplicação Next.js que a plataforma interna, área isolada `/portal/*`).
- Cada cliente tem a sua própria conta (`Client.passwordHash`/`Client.portalActive`), ativada manualmente por um membro da equipa através da ficha do cliente (Clientes → cartão "Portal do Cliente").
- **Não existe convite automático por email** — a password é definida manualmente pela equipa e comunicada ao cliente por telefone/email direto. Isto é uma limitação conhecida e documentada, não um bug (ver "Email transacional — não implementado" na Secção 6, Parte 2).
- **Módulos do portal**: resumo do projeto com timeline de fases, documentos, fotos de obra (só os marcados `visibleToClient = true` pela equipa — nunca automático), mensagens (thread por obra, contagem de não lidas), cronograma, pagamentos (mostra só `budgetAmount` contratado, nunca o `costAmount` interno da empresa), relatórios.
- **Isolamento de dados**: verificado nesta sessão (Secção 4, tarefa de auditoria RBAC/IDOR) — `getOwnedProject`, `getClientProjects`, `getClientAttachments`, `getClientInvoices` e `countUnreadMessages` verificam sempre `clientId` antes de devolver dados. Duas funções (`getProjectEvents`, `getProjectMessages`) não verificam ownership internamente, mas todos os pontos de chamada no código atual passam sempre um `project.id` já filtrado por cliente, nunca um valor não confiável de `searchParams` — classificado como "frágil mas seguro na prática", não como bug ativo, mas é um padrão a vigiar se um novo ponto de chamada for adicionado sem cuidado (ver Secção 11, Parte 2).

### 1.4. Infraestrutura — visão geral por componente

| Componente | Estado | Detalhe |
|---|---|---|
| **Railway** | Produção ativa | Projeto `dynamic-tenderness`, ambiente `production`. 3 serviços: `ds-os-platform` (app Next.js), `ds-os-db` (Postgres 18.4), `postgres` (cron de backup diário — nome do serviço é literalmente `postgres`, não confundir com o serviço da base de dados `ds-os-db`). |
| **Vercel** | Produção ativa | Aloja só o `website/`. Variáveis de ambiente (GA4/GTM/Meta/HubSpot) confirmadas ligadas numa fase anterior do projeto (task #93) — não re-verificadas nesta sessão especificamente, recomenda-se confirmação visual rápida no painel da Vercel antes de assumir. |
| **HubSpot** | Preparado, depende de credenciais reais | Formulário de contacto e Estudo de Viabilidade fazem forward para a HubSpot Forms API. Código pronto; falta confirmar que `HUBSPOT_PORTAL_ID`/`HUBSPOT_FORM_GUID`/`HUBSPOT_VIABILITY_FORM_GUID` reais estão configurados em produção (ver Secção 6, Parte 2). |
| **GitHub** | Fonte de verdade do código | Repositório `dsgrouppt/ds-group` (monorepo), branch `master` é o branch real e ativo (branch `main` remoto é órfão de uma tentativa antiga, sem histórico partilhado — não usar, não fazer merge). 51 commits no histórico completo (confirmado nesta sessão via `git fetch --unshallow`; o clone de trabalho por omissão desta sessão vinha raso, só com 22 commits — atenção a isto em sessões futuras, ver Secção 16, Parte 3). |
| **PostgreSQL** | Produção ativa | Versão 18.4, gerido pela Railway, serviço `ds-os-db`. Schema aplicado via `prisma db push` (não há migrações versionadas `prisma migrate` — decisão deliberada documentada, ver Secção 9, Parte 2). |
| **Docker** | Usado só para build/deploy da plataforma | `platform/Dockerfile` (multi-stage, `node:20-alpine`, output `standalone` do Next.js) é o que a Railway usa para construir e correr `ds-os-platform`. O `website/Dockerfile` existe mas não está a ser usado em produção (a Vercel não usa Docker, deteta e constrói projetos Next.js nativamente) — é uma alternativa preparada para um cenário de hosting diferente (VPS/Hetzner), não o caminho real de produção do website. |
| **CI/CD** | Ativo, verde | Dois workflows GitHub Actions (`ci.yml` para o website, `ci-platform.yml` para a plataforma), cada um só dispara quando ficheiros dentro do seu `paths` mudam. `ci-platform.yml` corre contra um Postgres 16 efémero de serviço (nota: **não é a mesma major version da produção, que é Postgres 18** — inconsistência de baixo risco mas real, ver Secção 11, Parte 2). |
| **DNS** | Configurado e propagado | `os.dsprojects.pt` aponta para a Railway (`ds-os-platform`); `www.dsprojects.pt`/`dsprojects.pt` apontam para a Vercel. Registos CNAME/TXT criados em `dominios.pt` (task #88). |
| **SSL** | Automático, ativo em ambos os domínios | Let's Encrypt gerido automaticamente por Railway e por Vercel — nenhuma ação manual necessária, nenhuma configuração de código. |

---

## 2. Arquitetura

### 2.1. Decisão fundacional: duas aplicações Next.js separadas, um monorepo

`website/` (público, indexado, marketing, sem base de dados) e `platform/` (interno, nunca indexado, com base de dados e autenticação) são deliberadamente duas aplicações Next.js distintas dentro do mesmo repositório Git — não uma única aplicação com rotas divididas. Razões (documentadas desde o início em `docs/plataforma-arquitetura.md` §1):

1. **Superfície de ataque diferente**: o site é público por definição; a plataforma contém dados de clientes, faturação e negócios.
2. **Ciclos de deploy independentes**: os workflows de CI usam `paths` para só disparar quando a pasta relevante muda — uma alteração no CRM não obriga a reconstruir o site institucional.
3. **Stacks de dados diferentes**: o website não tem base de dados; a plataforma tem Prisma + PostgreSQL completo.

### 2.2. Frontend

Ambas as aplicações usam **Next.js 14.2.35 App Router + TypeScript + Tailwind CSS**. Diferenças relevantes:

- **Website**: maioritariamente Server Components estáticos/SSG, com `framer-motion` para animações e `sharp` para otimização de imagem no build. Sem estado de sessão em lado nenhum.
- **Plataforma**: mistura de Server Components (a maioria das páginas de listagem/detalhe, que buscam dados diretamente via Prisma no servidor) e Client Components pontuais onde há interatividade que exige JS no browser (ex.: `LoginForm`, `ClientLoginForm` — Client Components por usarem `useSearchParams`; `SubmitButton`, que usa `useFormStatus` do React 18 para mostrar estado "a processar" em botões de submissão, evitando duplo-clique/registos duplicados em ligações lentas).
- **Design system da plataforma** (`src/components/ui/`): `Button`, `Card`, `Badge`, `Field` (Input/Select/Textarea/Label), `Table`, `StatCard`, `EmptyState`, `PageHeader` — componentes reutilizáveis, tokens de marca (`brand/design-tokens.json`) aplicados ao Tailwind (preto/grafite/branco dominantes, dourado como acento restrito, nunca em blocos de cor). Layout administrativo via `AppShell` + `Sidebar` (barra lateral fixa em desktop, gaveta em mobile, módulos visíveis conforme a `role` da sessão).
- Listagens vazias mostram sempre `EmptyState` explicativo — nunca uma tabela em branco sem contexto.

### 2.3. Backend — Server Actions, não API REST

Toda a escrita de dados na plataforma passa por **Server Actions do Next.js** (`actions.ts` dentro de cada pasta de módulo em `src/app/(app)/*/`), não por uma API REST separada com `fetch` do lado do cliente. Isto significa:

- Menos código, menos JS enviado ao browser.
- Validação (Zod) e mutação (Prisma) no mesmo ficheiro, junto à definição da rota que os usa.
- Proteção CSRF nativa do mecanismo de Server Actions do Next.js 14 (não é preciso implementar nada à parte).
- Cada Server Action que muta dados segue (depois da auditoria adversarial desta sessão, ver Secção 4) o mesmo padrão obrigatório: `requireModuleAccess(moduleKey)` (verifica sessão válida + permissão de `view` no módulo) **seguido de** uma verificação explícita `can(role, moduleKey, "edit")` antes de qualquer escrita. As únicas exceções legítimas a este padrão são ações auto-referenciais (ex.: `changeOwnPassword` em `perfil/actions.ts`, que usa `requireUser()` porque não é gated por módulo, é sempre permitido ao próprio utilizador).

Existem **12 ficheiros `actions.ts`** no total: `agenda`, `clientes`, `crm`, `definicoes/utilizadores`, `financeiro`, `marketing`, `obras`, `perfil`, `rh`, `tarefas` (todos em `src/app/(app)/`), mais `portal/(client)/conta/actions.ts` e `portal/(client)/mensagens/actions.ts` (área do cliente, autenticação separada — ver 2.6).

### 2.4. Prisma e Base de Dados

- **ORM**: Prisma 5.20.0, `@prisma/client` 5.20.0.
- **Provider**: `postgresql` (mudou de SQLite, usado só na fase inicial de desenvolvimento local antes de haver acesso a um Postgres real — ver histórico em `docs/producao.md` §1; o schema atual em produção já não tem qualquer rasto de SQLite, é Postgres desde a primeira migração real).
- **Schema único**: `platform/prisma/schema.prisma`, fonte de verdade absoluta para a estrutura de dados. 18 tabelas (contagem corrigida em 12 ago 2026 — a versão anterior deste documento somava 18 itens na lista mas escrevia "17" por erro de contagem): `User`, `Client`, `Deal`, `Project`, `Tag` + `TagOnClient`/`TagOnDeal`/`TagOnProject` (tabelas de junção), `Task`, `TaskComment`, `CalendarEvent`, `Invoice`, `Payment`, `Employee`, `MarketingCampaign`, `Attachment`, `ActivityLog`, `ClientMessage`.
- **Campos categóricos são `String`, não enums nativos do Postgres** — decisão deliberada (ver comentário no topo do schema): os valores permitidos e os rótulos em português vivem em `src/lib/enums.ts` (union types TypeScript + Zod). Razão: mudar um valor permitido de um pipeline (ex.: adicionar uma etapa nova ao CRM) é só uma alteração de código de aplicação, não uma migração de schema — mais ágil numa fase em que os pipelines ainda podem mudar por decisão de negócio, à custa de perder a validação nativa do Postgres ao nível da coluna (mitigado pela validação Zod em toda a fronteira de escrita).
- **Sem migrações versionadas** — usa-se `prisma db push` (schema aplicado diretamente, idempotente), não `prisma migrate`. Ver Secção 9 (Parte 2) para a análise completa desta decisão e quando reconsiderá-la.
- **29 índices** (`@@index`) cobrindo todas as chaves estrangeiras e colunas usadas em filtros/ordenação nas tabelas de maior volume esperado (`Deal`, `Project`, `Task`, `Client`, `Invoice`, `Payment`, `Attachment`, `TaskComment`, `ActivityLog`, `CalendarEvent`, `Employee`) — adicionados na "Auditoria Tech Lead" (ver `docs/auditoria-tech-lead.md`), confirmados via `pg_indexes` contra Postgres real.
- **`Project.dealId String? @unique`** com relação real a `Deal` — este detalhe de schema é o que torna seguro apagar um `Deal` mesmo sem envolver a operação numa transação explícita: a constraint de unicidade ao nível da base de dados já impede um estado inconsistente, independentemente da ordem de operações no código da aplicação (confirmado nesta sessão ao reavaliar hostilmente as correções de `$transaction` da fase anterior).

### 2.5. Autenticação, RBAC e Permissões (equipa interna)

- **NextAuth 4.24.15**, `CredentialsProvider` (id `"credentials"`), sessão JWT (não sessão de base de dados).
- **Password**: `bcryptjs`, 12 rounds.
- **Sessão**: `maxAge` de 8 horas (não os 30 dias por omissão do NextAuth). Revalidação periódica (a cada 60 segundos, não a cada pedido) do estado `active`/`role` do utilizador contra a base de dados, dentro do callback `jwt` de `src/lib/auth.ts` — uma conta desativada ou com `role` alterado perde acesso dentro de 60s, sem esperar o token expirar naturalmente.
- **`passwordChangedAt`** em `User` (e também em `Client`, ver 2.6): comparado contra o momento de login do token (`loginAt`, fixado uma única vez no login) — repor uma password revoga imediatamente qualquer sessão já aberta com a password antiga, no ciclo de revalidação seguinte (até 60s), não só bloqueia novos logins.
- **Rate limiting de login**: `src/lib/rate-limit.ts`, 8 tentativas por 5 minutos por email, **em memória, por processo** — não sobrevive a reinício, não é partilhado entre múltiplas instâncias. Aceitável ao volume atual (um único processo em produção), documentado como risco residual a resolver com Redis/Upstash antes de qualquer deploy horizontal com mais de uma instância.
- **7 perfis** (`ROLE` em `src/lib/enums.ts`): `ADMIN`, `DIRECAO`, `COMERCIAL`, `GESTOR_PROJETO`, `FINANCEIRO`, `RH`, `MARKETING`.
- **Matriz de permissões única**: `src/lib/permissions.ts`, `MATRIX: Record<ModuleKey, Record<Action, RoleValue[]>>`, com `Action = "view" | "edit"`. A função `can(role, moduleKey, action)` é a única fonte de verdade — usada tanto para decidir o que aparece no menu lateral (`accessibleModules`) como para gating dentro de cada Server Action. **Não há duas fontes de verdade a divergir com o tempo.**
- **10 `ModuleKey`**: `dashboard`, `crm`, `obras`, `clientes`, `financeiro`, `agenda`, `rh`, `marketing`, `tarefas`, `definicoes`. Ver a matriz completa (quem vê o quê, quem edita o quê) na Secção 8 (Segurança) da Parte 2 — reproduzida lá na íntegra, não resumida.
- **`src/middleware.ts`**: protege todas as rotas exceto `/login`, `/portal/login`, `/api/auth/*`, `/api/health` e `/api/internal/*` (autenticado por token partilhado, não por sessão — ver Bug #24 na Secção 4). Distingue explicitamente `token.kind === "STAFF"` de `token.kind === "CLIENTE"` — um token do tipo errado é tratado exatamente como nenhum token, nunca alcança a área da outra sessão.
- **Limitação conhecida e documentada**: a revalidação de sessão (conta desativada, password mudada) só corre no callback `jwt`, invocado a partir das Server Actions/Server Components via `requireUser()`/`requireModuleAccess()`/`requireClient()` — **não corre no middleware**, porque o middleware corre em Edge Runtime e o Prisma Client não corre nesse runtime. Na prática: o pior caso é uma página a redirecionar para `/login` no carregamento seguinte (até 60s de atraso), nunca exposição real de dados a uma conta já desativada — mas não é instantâneo a 100%. Ver Secção 8 (Parte 2).

### 2.6. Portal do Cliente — arquitetura de isolamento

Decisão deliberada de **não reutilizar** o sistema `ROLE`/`permissions.ts` da equipa para o Portal do Cliente, para minimizar o risco de uma alteração futura ao acesso da equipa afetar acidentalmente o acesso dos clientes (ou vice-versa). Em vez disso:

- Um **segundo `CredentialsProvider`** do mesmo NextAuth (id `"cliente"`), autenticando contra `Client.passwordHash`/`Client.portalActive`, não contra `User`.
- **Mesmo tipo de sessão JWT**, distinguido por `token.kind: "STAFF" | "CLIENTE"` — os dois providers emitem para o mesmo cookie de sessão (limitação aceite: um membro da equipa e um cliente não podem ter sessão simultânea no mesmo browser sem usar uma janela anónima separada).
- `requireUser()` e `requireClient()` (em `src/lib/session.ts` e `src/lib/client-session.ts`) verificam sempre `token.kind` e rejeitam o tipo errado — nunca confiam apenas em "existe algum token", que é o comportamento por omissão do `withAuth` do NextAuth.
- **`Attachment.visibleToClient`**: interruptor de privacidade por omissão `false` — nenhum ficheiro fica visível no portal só por existir associado a um projeto do cliente; tem de ser marcado explicitamente pela equipa.
- **`/api/files/[id]`** serve tanto sessões de equipa como de cliente, mas para uma sessão de cliente verifica, ao nível dos dados (não só na interface), que o anexo pertence a um dos seus próprios projetos **e** está marcado `visibleToClient`.
- **Conflito de email resolvido na origem**: `Client.email` não é `@unique` na base de dados (dois registos podem partilhar contacto de propósito, ex. um casal com o mesmo email mas dois registos de cliente distintos por outra razão de negócio). Isto só se torna um problema real se dois clientes tiverem o portal ativo com o mesmo email ao mesmo tempo — bloqueado na origem: `activateClientPortal` falha com um erro claro nesse cenário (esta é também a correção do Bug #14, dentro de uma `$transaction`, ver Secção 4).

### 2.7. Website — arquitetura (resumo, menos crítico para continuidade operacional)

- Sem base de dados, sem autenticação.
- Dados de conteúdo (blog, SEO local, FAQ) vivem em ficheiros TypeScript estruturados dentro de `src/lib/` (ex.: dados de blog, dados de SEO local por cidade) — não há CMS, o conteúdo é código versionado.
- Formulário de contacto e Estudo de Viabilidade fazem forward direto para a HubSpot Forms API a partir de rotas de API do próprio Next.js (`src/app/api/contact/route.ts`, `src/app/api/viability/route.ts`) — sem persistência própria, sem base de dados no meio.

---

## 3. Estrutura do projeto

### 3.1. Árvore de topo do monorepo

```
ds-group/
├── website/              Next.js público (DS Projects) — Vercel
├── platform/              Next.js interno (DS OS) — Railway
├── docs/                  Documentação técnica e estratégica (ver 3.4)
├── brand/                 Brand Book, conceitos de logótipo, design tokens
├── crm/                   Especificação técnica do CRM (JSON de propriedades/pipeline)
├── landing-pages/         Modelo reutilizável de landing page de campanha
├── automations/           Especificação de workflows/sequências de email (não implementado em código — é especificação)
├── docker-compose.yml     Stack completa (website+platform+Postgres) para cenário VPS — não é o caminho real de produção
├── render.yaml            Blueprint alternativo para Render — não é o caminho real de produção
└── .github/workflows/     ci.yml (website) + ci-platform.yml (plataforma)
```

### 3.2. Estrutura de `platform/src/`

```
platform/src/
├── app/
│   ├── (app)/                        Grupo de rotas protegido — equipa interna (token.kind === "STAFF")
│   │   ├── agenda/actions.ts + page.tsx + [id]/
│   │   ├── clientes/actions.ts + page.tsx + [id]/
│   │   ├── crm/actions.ts + page.tsx + [id]/
│   │   ├── definicoes/utilizadores/actions.ts + page.tsx + [id]/    (só ADMIN)
│   │   ├── financeiro/actions.ts + page.tsx + [id]/
│   │   ├── marketing/actions.ts + page.tsx + [id]/
│   │   ├── obras/actions.ts + page.tsx + [id]/
│   │   ├── perfil/actions.ts + page.tsx           (self-service, todos os perfis)
│   │   ├── rh/actions.ts + page.tsx + [id]/
│   │   └── tarefas/actions.ts + page.tsx + [id]/
│   ├── acesso-negado/                Página mostrada quando um perfil tenta um módulo sem "view"
│   ├── api/
│   │   ├── auth/[...nextauth]/       Rota padrão do NextAuth
│   │   ├── files/[id]/               Download de anexos, autenticado (equipa OU cliente, ver 2.6)
│   │   ├── health/                   GET /api/health — sem autenticação, para monitorização externa
│   │   └── internal/uploads-backup/  Endpoint interno para o backup diário de uploads (Bug #24, ver Secção 4)
│   ├── login/                        Login da equipa (Server Component fino + LoginForm Client Component)
│   └── portal/
│       ├── (client)/                 Grupo de rotas protegido — cliente (token.kind === "CLIENTE")
│       │   ├── conta/actions.ts + page.tsx
│       │   ├── cronograma/, documentos/, fotos/, mensagens/actions.ts + page.tsx, pagamentos/, projeto/, relatorios/
│       └── login/                    Login do cliente
├── components/
│   ├── layout/                       AppShell, Sidebar
│   ├── portal/                       Componentes específicos do Portal do Cliente
│   └── ui/                           Button, Card, Badge, Field, Table, StatCard, EmptyState, PageHeader, SubmitButton
├── lib/
│   ├── attachments-actions.ts        uploadAttachment/deleteAttachment — partilhado entre módulos (obras/tarefas/clientes)
│   ├── auth.ts                       authOptions do NextAuth — os dois providers, callbacks jwt/session
│   ├── client-session.ts             requireClient() — equivalente a session.ts, mas para o Portal
│   ├── enums.ts                      Fonte de verdade dos valores categóricos (ROLE, CLIENT_TYPE, etc.) + rótulos PT
│   ├── format.ts                     formatEuro, formatDate, formatLongDate — centralizado (elimina duplicações antigas)
│   ├── logger.ts                     Eventos JSON estruturados (auth.login_success, etc.) para stdout
│   ├── money.ts                      parseMoney/parseOptionalMoney/toCents — validação server-side de valores monetários (Bug #7, #20)
│   ├── nav.ts                        Definição do menu lateral (usa accessibleModules)
│   ├── permissions.ts                MATRIX + can() + accessibleModules() — fonte única de verdade do RBAC
│   ├── portal-data.ts                Funções de leitura scoped por cliente (getClientProjects, getOwnedProject, etc.)
│   ├── prisma.ts                     Singleton do PrismaClient
│   ├── rate-limit.ts                 consume() — limitador em memória
│   ├── session.ts                    requireUser()/requireModuleAccess() — equipa interna
│   ├── storage.ts                    saveFile/readStoredFile/deleteStoredFile + SIGNATURES (magic bytes) + validação de tipo/tamanho
│   └── url-safety.ts                 safeInternalPath() — previne Open Redirect no pós-login
├── types/                            Tipos TypeScript partilhados (ex.: extensão do tipo de sessão do NextAuth)
└── middleware.ts                     Ver 2.5/2.6
```

### 3.3. Convenções do projeto (importantes para qualquer pessoa/IA que for continuar)

1. **Comentários `Bug #N`**: sempre que uma correção de bug é feita, o código recebe um comentário explicando a causa raiz, o risco real (não hipotético) e a correção — em português, sem acentos em muitos casos (ver nota abaixo), numerados sequencialmente. Este é o mecanismo de rastreabilidade real do projeto, mais fiável do que qualquer resumo em chat. Continuar esta convenção é a forma correta de documentar futuras correções.
2. **Sem acentos em código/comentários frequentemente** — não é uma regra rígida, mas é um padrão observável em grande parte dos comentários mais recentes (provavelmente para evitar problemas de encoding em terminais/consolas usadas durante o desenvolvimento via automação). Não é crítico, mas mantém a consistência se notares o padrão.
3. **Mensagens de commit em português**, prefixo `fix(platform):`, `feat(platform):`, `fix(website):`, `docs:`, `chore:`, `refactor:` — segue convenção próxima de Conventional Commits, mas em português no corpo da mensagem.
4. **Validação sempre no servidor, nunca só no cliente** — todos os campos de formulário passam por Zod nas Server Actions antes de tocar no Prisma, independentemente de já existir validação HTML (`min`, `max`, `required`) no lado do browser. Esta é a lição mais repetida ao longo de todo o histórico de bugs (ver Secção 13, Parte 3).
5. **`$transaction` com `Prisma.TransactionIsolationLevel.Serializable`** para qualquer operação que leia um estado e decida uma escrita com base nele (ex.: somar pagamentos e decidir se marca a fatura como paga) — não `Prisma.TransactionIsolationLevel` por omissão (que seria `ReadCommitted`, insuficiente para evitar lost updates neste padrão). Ver Secção 4 (Bugs #9–#17) e Secção 9 (Parte 2).
6. **Padrão obrigatório em Server Actions que escrevem**: `requireModuleAccess(moduleKey)` seguido de `can(role, moduleKey, "edit")` explícito — nunca confiar só na verificação de `view` feita por `requireModuleAccess`. Ver Secção 4, Bugs #18/#19, para o que acontece quando este padrão não é seguido.
7. **Nunca confiar em `Content-Type` do browser para uploads** — sempre verificar assinatura binária real (`src/lib/storage.ts`, `SIGNATURES`).
8. **Nomes de ficheiro em disco são sempre gerados** (`crypto.randomUUID() + path.extname(file.name)`), nunca o nome original do utilizador — evita path traversal e colisões.

### 3.4. Documentação existente em `docs/` — o que cada ficheiro é, e qual a sua fiabilidade atual

Esta é uma tabela importante: **nem toda a documentação em `docs/` está igualmente atualizada**. Alguns ficheiros descrevem decisões de uma fase anterior do projeto que foram depois substituídas por uma escolha real diferente (ex.: os primeiros documentos falam de Neon/Supabase como base de dados candidata — a escolha real acabou por ser o Postgres gerido da própria Railway). Isto não é um erro a corrigir urgentemente — é o histórico natural de decisões de um projeto real — mas quem for continuar precisa de saber qual documento prevalece quando há conflito.

| Ficheiro | Conteúdo | Fiabilidade / estado |
|---|---|---|
| `plataforma-arquitetura.md` | Decisão de arquitetura inicial da plataforma, ainda em SQLite | **Historicamente correto, tecnicamente desatualizado** (SQLite → Postgres já aconteceu). Útil para entender o "porquê" das decisões, não para o "como" atual. |
| `producao.md` | Migração para Postgres, variáveis de ambiente, decisão de armazenamento de ficheiros | Maioritariamente correto; a secção de backup/restore (`scripts/backup.sh`/`scripts/restore.sh`) descreve um mecanismo genérico que **não é o mecanismo real usado em produção hoje** — ver nota abaixo. |
| `auditoria-tech-lead.md` | Primeira auditoria de segurança/performance completa | Correto como registo histórico do que foi encontrado e corrigido nessa fase. |
| `integracoes-estado.md` | Estado de cada integração (HubSpot, GA4, Meta Pixel, Portal do Cliente) | Maioritariamente correto — mas escrito **antes** do Portal do Cliente estar em produção real (na altura, "falta Postgres + hosting" — isso já aconteceu). Reconfirmar o essencial na Secção 6 (Parte 2) deste handover, que é mais recente. |
| `comparacao-hosting.md` | Análise Vercel vs. Railway vs. Render vs. VPS, recomendação | **Decisão já tomada e executada** (Railway para a plataforma, Vercel para o website) — este documento é agora só a justificação histórica da escolha, não uma decisão em aberto. |
| `manual-tecnico-operacoes.md` | Manual de operações — instalação, deploy, backups, DR | **Parcialmente desatualizado especificamente na secção de backups** (3.5/3.6, `scripts/backup.sh`) — ver nota crítica abaixo. O resto (estrutura de BD, variáveis de ambiente, cenários de disaster recovery) continua válido em espírito, mesmo que alguns detalhes (ex.: fornecedor de Postgres sugerido) já não reflitam a escolha final. |
| `backup-runbook.md` | **O documento mais atualizado e mais fiável sobre backups** | Escrito e testado em produção real nesta e na sessão anterior. Descreve o mecanismo REAL: serviço `postgres` na Railway, cron diário, `pg_dump` + fetch do volume de uploads via `/dev/tcp` (não `curl`, ver Bug #24). **Este documento prevalece sobre qualquer menção a backups em `producao.md` ou `manual-tecnico-operacoes.md`.** |
| `relatorio-final-cto.md`, `relatorio-segunda-ronda.md` | Relatórios de auditoria de fases anteriores (pré-Railway, pré-Portal do Cliente em produção) | Registo histórico válido do que foi encontrado/corrigido nessas fases — útil para a Secção 4 (bugs), não para o estado atual de infraestrutura. |
| `crm-especificacao.md`, `sistema-comercial.md`, `estrategia-marketing.md`, `manual-operacional.md`, `documentos-internos.md`, `indice-geral-e-framework-decisao.md` | Documentação de negócio/produto da fase de conceção inicial | Ainda a base conceptual válida dos pipelines/etiquetas/processos implementados no schema — não é sobre infraestrutura, não fica desatualizada da mesma forma. |
| `arquitetura-seo.md`, `arquitetura-website.md`, `auditoria-concorrencia-seo.md`, `auditoria-fase1-website.md` | Documentação específica do website (SEO, arquitetura, concorrência) | Válida, específica ao `website/`, não afetada pela evolução da plataforma. |

**Nota crítica sobre backups**: `manual-tecnico-operacoes.md` §3.5/3.6 e `producao.md` §6 mencionam `scripts/backup.sh` e `scripts/restore.sh` (que **ainda existem** em `platform/scripts/`, não foram apagados) como o mecanismo de backup recomendado, pensado para um cenário onde a base de dados seria Neon/Supabase/RDS geridos com backups point-in-time nativos do próprio fornecedor. **Isto não é o que está realmente a proteger a produção hoje.** O mecanismo real, testado e confirmado a funcionar em produção (incluindo um teste de restauro real com comparação de contagens de registos, e a extensão mais recente para cobrir também o volume de uploads), é o descrito em `docs/backup-runbook.md` — um serviço Railway dedicado (`postgres`, cron diário) que corre `pg_dump` diretamente. Os scripts `scripts/backup.sh`/`scripts/restore.sh` ficam como ferramentas úteis para uso manual pontual (ex.: um dump ad-hoc antes de uma alteração arriscada), não como o mecanismo agendado de proteção contínua.

---

## 4. Auditoria completa — todos os bugs encontrados

### 4.1. Nota de metodologia e honestidade sobre a numeração

Este projeto usa uma numeração sequencial de bugs (`Bug #1`, `Bug #2`, ...) que nasceu organicamente ao longo de múltiplas sessões de auditoria, **sem um ficheiro único e persistente que a centralizasse desde o início** (não existe um `BUGS.md` ou equivalente no repositório — confirmado nesta sessão com uma pesquisa exaustiva). A numeração de **Bug #7 em diante está 100% confirmada e rastreável** diretamente no código-fonte atual (comentários `Bug #N` em `src/lib/money.ts`, `src/app/(app)/*/actions.ts`, `next.config.mjs`, `src/middleware.ts`) e nas mensagens de commit correspondentes.

Os **Bugs #1 a #6 não têm essa mesma rastreabilidade direta** — não aparecem com esse número exato em nenhum comentário de código nem em nenhuma mensagem de commit sobrevivente no histórico Git atual (51 commits, verificado com `git fetch --unshallow` nesta sessão). O que existe são referências indiretas à sua existência: a tarefa de trabalho "#148 Re-validar bugs anteriormente marcados 'corrigido/verificado' (#2,#3,#4)" e "#165 Regressão: reexecutar testes dos bugs #1-#8", ambas de sessões anteriores a esta. O commit `4191096` refere-se explicitamente a "Bug #5" (dashboard expõe dados a todos os perfis). Nenhum commit refere-se explicitamente a "Bug #1", "#2", "#3", "#4" ou "#6" pelo número.

**Decisão editorial deste handover**: em vez de inventar detalhes para #1–#4 e #6 (o que seria desonesto e prejudicaria a fiabilidade de todo o resto deste documento), a Secção 4.2 lista-os como **"reconstrução por inferência"**, associando-os aos commits de segurança da mesma era que, pelo conteúdo e pela ordem cronológica, são os candidatos mais fortes — e diz isso explicitamente. A partir do Bug #7, cada entrada tem proveniência 100% direta (ficheiro + linha + commit).

**Se precisares de saber ao certo o que foram os Bugs #1–#4 e #6**: a fonte mais provável é o histórico de mensagens da conversa de chat da sessão em que foram encontrados (anterior a esta) — mas lembra-te que a Secção 15 (Parte 3) deste handover é explícita sobre isto: **o histórico do chat nunca deve ser tratado como fonte de verdade a partir de agora**. Se esta reconstrução por inferência não for suficiente, a alternativa correta não é adivinhar — é aceitar a lacuna e, se for importante, prevenir a recorrência simplesmente criando (a partir de agora) o hábito de manter um ficheiro `docs/bugs-log.md` real, persistente, atualizado a cada correção. Este handover recomenda isso explicitamente na Secção 16 (Parte 3).

### 4.2. Bugs #1–#6 — reconstrução por inferência (não 100% confirmada, ver nota acima)

| # | Candidato mais provável (por conteúdo + ordem cronológica no Git) | Commit | Ficheiro(s) |
|---|---|---|---|
| #1 (inferido) | Sanitização de `callbackUrl` para evitar Open Redirect no login — um atacante podia construir `/login?callbackUrl=https://site-falso.pt`, a vítima autentica-se legitimamente e só depois é reencaminhada para um site externo (OWASP A01/A10) | `e101949` | `src/lib/url-safety.ts` (novo), `LoginForm`, `ClientLoginForm` |
| #2 (inferido) | Uso de `safeInternalPath` no redirect pós-login em `LoginForm` (aplicação da correção acima ao formulário da equipa) | `3bd2f1f` | `src/components/LoginForm.tsx` |
| #3 (inferido) | Uso de `safeInternalPath` no redirect pós-login em `ClientLoginForm` (mesma correção, aplicada ao Portal do Cliente) | `771636f` | `src/components/ClientLoginForm.tsx` |
| #4 (inferido) | Broken access control — upload/eliminação de anexos fora do módulo autorizado (ex.: um utilizador com acesso só a Tarefas conseguia manipular anexos de Obras através do mesmo endpoint partilhado) | `eb94404` | `src/lib/attachments-actions.ts` |
| #5 (confirmado — commit refere "Bug #5" explicitamente) | Dashboard ignorava a matriz de permissões e mostrava negócios, pipeline em €, margem bruta, faturação e valores por receber a **qualquer perfil** com acesso ao dashboard, incluindo RH e Marketing (OWASP A01 — broken access control) | `4191096` | Página do dashboard (cálculo e renderização condicionados por `can()`) |
| #6 (inferido) | Permitir downloads de anexos do Portal do Cliente — antes desta correção, `/api/files/[id]` distinguia insuficientemente sessões de equipa e de cliente, bloqueando incorretamente (ou, na direção oposta, um problema de autorização a corrigir) downloads legítimos de clientes | `a52de22` | `src/app/api/files/[id]/route.ts` |

Nota adicional: a mesma era de commits inclui também `88076c5`/`45f0985` (EACCES no upload de ficheiros em produção — volume Railway montado como `root:root`, corrigido com `docker-entrypoint.sh`) e `d66e8e3`/depois revertido (`trustHost` não existe no tipo `AuthOptions` do NextAuth v4, quebrava o build — corrigido corretamente mais tarde em `a441ca7`). Estes não parecem candidatos a bugs numerados da série de segurança (são infraestrutura/deploy, não OWASP), mas são referidos aqui por completude do histórico de correções pré-#7.

### 4.3. Bugs #7 a #24 — confirmados diretamente no código e nos commits

**Bug #7 — HIGH — Validação server-side de valores monetários em falta**
- **Causa raiz**: `Invoice.amount`, `Payment.amount`, `Deal.amount`, `Project.budgetAmount`/`costAmount` eram convertidos com `Number(string)` sem qualquer validação no servidor — a única barreira era o atributo HTML `min="0"` do `<input>`, trivialmente contornável com um pedido direto à Server Action.
- **Impacto real**: qualquer utilizador autenticado com acesso de edição ao módulo podia gravar valores negativos, `NaN` ou astronomicamente grandes, corrompendo totais de faturação e comparações como `totalPaid >= invoice.amount`.
- **Ficheiros**: `src/lib/money.ts` (novo — `parseMoney`), `financeiro/actions.ts`, `crm/actions.ts`, `obras/actions.ts`.
- **Commits**: `b530919` (cria `money.ts`), `38f84d5`, `f1266e5`, `316a030` (aplica em cada módulo).
- **Validação**: `tsc`/`eslint` limpos.
- **Estado**: corrigido e em produção. Reaberto parcialmente pelo Bug #20 (ver abaixo) e pelo Bug #23 (marketing esquecido).

**Bug #8 — MEDIUM/funcional — `deleteProject` não bloqueava obra com tarefas/eventos associados**
- **Causa raiz**: apagar uma `Project` com `Task`/`CalendarEvent` associados era permitido silenciosamente; o Prisma limpava o `projectId` dessas linhas (`onDelete` implícito = `SetNull`), deixando órfãos sem obra visível na UI. Inconsistente com o guard já existente para `Invoice`.
- **Impacto**: perda silenciosa de contexto (tarefas/eventos ficavam "soltos", sem indicação de a que obra pertenciam antes).
- **Ficheiro**: `obras/actions.ts`.
- **Commit**: `45be30b`.
- **Estado**: corrigido — `deleteProject` agora bloqueia com mensagem clara, tal como já acontecia com faturas.

**Bug #9 — CRITICAL — `registerPayment` sem transação atómica**
- **Causa raiz**: a função fazia `payment.create`, depois lia `invoice.payments` para somar o total pago, e só então decidia se marcava a fatura como "PAGA" — três operações distintas, nenhuma protegida por transação.
- **Impacto real**: (1) crash a meio deixava um `Payment` criado mas a `Invoice` nunca atualizada para "PAGA"; (2) dois pagamentos registados em concorrência (ex.: dois membros da equipa a processar o mesmo cliente ao mesmo tempo) podiam produzir uma leitura desatualizada do total, deixando a fatura presa em "EMITIDA" apesar de totalmente paga.
- **Ficheiro**: `financeiro/actions.ts`.
- **Commit**: `de16205` (parte do lote "Fase C P2 — converter operações multi-escrita para `prisma.$transaction`").
- **Correção**: `$transaction` com isolamento `Serializable`; conflitos reais resultam em erro `P2034`, tratado com mensagem clara ao utilizador ("outro pagamento foi registado em simultâneo, recarregue").
- **Estado**: corrigido, testado com um script de concorrência real em produção (dois pagamentos simultâneos disparados de propósito) — PASSOU.

**Bug #10 — CRITICAL — `updateInvoice` com lost update**
- **Causa raiz**: `findUnique` + `update`, sem transação — uma edição de fatura (ex.: mudar o `dueDate`) podia sobrepor-se a um pagamento registado em paralelo por `registerPayment`, revertendo silenciosamente o estado "PAGA" de volta para "EMITIDA" enquanto o `Payment` (e o dinheiro recebido) continuava registado mas invisível na fatura.
- **Ficheiro**: `financeiro/actions.ts`.
- **Commit**: `de16205`.
- **Correção**: `$transaction` com isolamento `Serializable`, mesmo tratamento de `P2034`.
- **Estado**: corrigido.

**Bug #11 — CRITICAL — `advanceDealStage` sem transação na automação central**
- **Causa raiz**: `deal.update(stage)` + criação automática de `Project` (a automação "Fechado-Ganho → Obra", o coração do fluxo de negócio da empresa) não estavam dentro da mesma transação.
- **Impacto real**: um crash entre as duas operações podia deixar um negócio marcado como "Fechado-Ganho" **sem nunca gerar a obra correspondente** — a pior falha possível deste sistema específico, porque é invisível até alguém procurar pela obra e não a encontrar.
- **Ficheiro**: `crm/actions.ts`.
- **Commit**: `de16205`.
- **Estado**: corrigido com `$transaction`.

**Bug #12 — MEDIUM — `deleteDeal`, TOCTOU no guard "não apagar negócio com obra"**
- **Causa raiz**: a verificação "este negócio já tem uma obra ligada, não pode ser apagado" e o `delete` em si não estavam atomicamente ligados.
- **Ficheiro**: `crm/actions.ts`.
- **Commit**: `de16205`.
- **Nota de reavaliação nesta sessão (auditoria adversarial)**: ao investigar hostilmente esta correção, confirmou-se que `Project.dealId String? @unique` com uma relação real a `Deal` no schema já impede corrupção real ao nível da base de dados, **independentemente** do timing da transação na aplicação — a constraint de unicidade é a última linha de defesa, e já era suficiente sozinha. A correção com `$transaction` continua correta e é boa prática (fecha a janela de erro visível ao utilizador, não só a corrupção de dados), mas não era, tecnicamente, a única coisa a impedir um estado inconsistente.
- **Estado**: corrigido, e adicionalmente confirmado como estruturalmente seguro mesmo sem a correção, por constraint de schema.

**Bug #13 — MEDIUM — `deleteClient`, mesma classe de TOCTOU**
- **Causa raiz**: mesma classe do Bug #12, mas para negócios/obras associados a um cliente.
- **Ficheiro**: `clientes/actions.ts`.
- **Commit**: `de16205`.
- **Estado**: corrigido.

**Bug #14 — HIGH — `activateClientPortal`, TOCTOU no guard de email duplicado**
- **Causa raiz**: `Client.email` não é `@unique` no schema (por desenho — dois registos podem partilhar contacto). A verificação "nenhum outro cliente já tem o portal ativo com este email" e a ativação em si não estavam atomicamente ligadas.
- **Impacto real**: duas ativações concorrentes (ex.: dois membros da equipa a ativar o portal para dois clientes com o mesmo email, ao mesmo tempo) podiam produzir dois clientes com portal ativo e o mesmo email de login — tornando o login não-determinístico (qual dos dois entra?).
- **Ficheiro**: `clientes/actions.ts`.
- **Commit**: `de16205`.
- **Estado**: corrigido com `$transaction` + guard atómico.

**Bug #15 — HIGH — `deleteProject`, contagens fora da transação**
- **Causa raiz**: as contagens de faturas/tarefas/eventos associados (usadas para decidir se o guard "não apagar obra com dados associados" — o próprio Bug #8 — deve bloquear) corriam fora da transação do `delete`.
- **Ficheiro**: `obras/actions.ts`.
- **Commit**: `de16205`.
- **Estado**: corrigido.

**Bug #16 — MEDIUM — `uploadAttachment`, ficheiro órfão em disco**
- **Causa raiz**: o ficheiro era escrito em disco antes do registo correspondente ser criado na base de dados — se a escrita na BD falhasse depois do ficheiro já estar em disco, o ficheiro ficava órfão (ocupando espaço, sem nenhum registo a apontar para ele).
- **Ficheiro**: `src/lib/attachments-actions.ts`.
- **Commit**: `de16205`.
- **Estado**: corrigido — cleanup compensatório automático se a transação da base de dados falhar depois do ficheiro já ter sido escrito.

**Bug #17 — MEDIUM — `deleteAttachment`, ordem invertida entre disco e base de dados**
- **Causa raiz**: a ordem original apagava primeiro o ficheiro em disco, só depois o registo na base de dados — criando uma janela onde o registo na BD ainda existia mas apontava para um ficheiro já inexistente (referência partida, visível a qualquer pedido nesse intervalo).
- **Ficheiro**: `src/lib/attachments-actions.ts`.
- **Commit**: `de16205`.
- **Estado**: corrigido — ordem invertida (apaga-se primeiro o registo na BD, só depois o ficheiro em disco), eliminando a janela de referências partidas.

*(Os Bugs #9 a #17 foram todos corrigidos no mesmo commit `de16205`, "Fase C P2: converter operações multi-escrita para prisma.$transaction" — uma auditoria dedicada especificamente a identificar Server Actions com múltiplas escritas relacionadas não protegidas por transação, pedida explicitamente pelo utilizador numa sessão anterior a esta.)*

**Bug #18 — ALTO — RBAC estrutural em falta em `definicoes/utilizadores/actions.ts`**
- **Causa raiz**: `createUser`, `updateUser` e `resetPassword` chamavam `requireModuleAccess("definicoes")` (que verifica só "view") mas nunca verificavam explicitamente `can(role, "definicoes", "edit")` antes de escrever — quebra do padrão obrigatório (ver Secção 3.3, convenção #6) seguido em todo o resto do código.
- **Impacto real, e porque é "estrutural" e não "coincidência inofensiva"**: na matriz de permissões atual, `definicoes.view` e `definicoes.edit` têm exatamente a mesma lista de perfis (só `ADMIN`) — por isso, hoje, esta falha não é explorável na prática. Mas é uma falha estrutural: se um dia um novo perfil (ex.: "Assistente Administrativo") ganhar `view` em `definicoes` sem ganhar `edit` (um cenário de negócio perfeitamente plausível — "pode ver a lista de utilizadores mas não pode criar/editar"), essa alteração passaria a permitir, sem intenção, que esse perfil criasse utilizadores, alterasse roles e repusesse passwords de qualquer conta — o módulo mais sensível de toda a plataforma.
- **Ficheiro**: `src/app/(app)/definicoes/utilizadores/actions.ts`.
- **Commit**: `7093d54` (auditoria adversarial independente).
- **Validação**: `tsc --noEmit` limpo, `eslint --max-warnings=0` limpo, `next build` 28/28 rotas.
- **Estado**: corrigido, deploy confirmado em produção.

**Bug #19 — ALTO (mesma classe do #18) — `addComment` em `tarefas/actions.ts`**
- **Causa raiz**: mesmo padrão do Bug #18 — verificava só `view` de `tarefas`, não `edit`, antes de permitir comentar uma tarefa.
- **Nota**: na matriz atual, `tarefas.view === tarefas.edit` (mesma lista de perfis), por isso também inofensivo hoje — corrigido por consistência estrutural, mesma lógica do #18.
- **Ficheiro**: `src/app/(app)/tarefas/actions.ts`.
- **Commit**: `7093d54`.
- **Estado**: corrigido.

**Bug #20 — ALTO — Erro de precisão de vírgula flutuante em comparações financeiras**
- **Causa raiz**: mesmo depois do Bug #7, `parseMoney` devolvia o número tal como escrito, sem arredondar a cêntimos. Combinado com `amount: Float` no schema (IEEE-754 double, tal como o `number` do JavaScript), isto produz erros de representação clássicos: uma fatura de 1.74€ paga em três prestações iguais de 0.58€ soma matematicamente 1.74, mas em ponto flutuante dá `1.7399999999999998` — e `totalPaid >= invoice.amount` em `registerPayment` falhava silenciosamente, deixando uma fatura integralmente paga presa em "EMITIDA" para sempre.
- **Porque não é um caso extremo**: pagamentos faseados (sinal + reforços + saldo) são o fluxo normal de uma obra de remodelação, não uma exceção rara.
- **Ficheiros**: `src/lib/money.ts` (`parseMoney` passa a arredondar sempre a 2 casas decimais; nova função `toCents`), `financeiro/actions.ts` (`registerPayment` compara `toCents(totalPaid) >= toCents(invoice.amount)`, inteiros, não floats).
- **Commit**: `7093d54`.
- **Validação**: reproduzido e provado corrigido com um script Node.js dedicado (`1.74` vs. `0.58 × 3`) antes e depois da correção, nesta sessão.
- **Estado**: corrigido, em produção.

**Bug #21 — ALTO — Limite de corpo de Server Actions nunca configurado**
- **Causa raiz**: Server Actions do Next.js 14 têm um limite de 1MB por omissão, nunca configurado em `next.config.mjs`. `src/lib/storage.ts` valida e anuncia um limite de 25MB, mas essa validação nunca era alcançada para ficheiros acima de ~1MB — o próprio Next.js rejeitava o pedido antes de chegar à Server Action, com um erro genérico.
- **Impacto real**: partia o caso de uso central do módulo Obras — fotos de obra tiradas em telemóvel tipicamente pesam 3–10MB (mais em HEIC/alta resolução).
- **Ficheiro**: `platform/next.config.mjs`.
- **Commit**: `7093d54`.
- **Estado**: corrigido (`experimental.serverActions.bodySizeLimit: "25mb"`).

**Bug #22 — MÉDIO/funcional — `createProject` perdia `costAmount` silenciosamente**
- **Causa raiz**: `createProject` nunca lia `costAmount` do `formData` no `ProjectSchema.safeParse(...)` — ao contrário de `updateProject`, que já o tinha. Descoberto por comparação lado-a-lado dos dois campos de formulário.
- **Impacto**: o custo interno de uma obra (usado para calcular margem, orçamento vs. custo) era sempre perdido no momento da criação, só podia ser preenchido depois via edição — uma perda de dados silenciosa, sem qualquer erro visível.
- **Ficheiro**: `src/app/(app)/obras/actions.ts`.
- **Commit**: `7093d54`.
- **Estado**: corrigido.

**Bug #23 — MÉDIO — `marketing/actions.ts` sem a validação do Bug #7**
- **Causa raiz**: `createCampaign`/`updateCampaign` usavam `Number(data.budget)` diretamente em vez de `parseOptionalMoney` — o único campo monetário de toda a plataforma que tinha ficado esquecido na correção do Bug #7, permitindo `NaN`/negativos gravados sem erro.
- **Ficheiro**: `src/app/(app)/marketing/actions.ts`.
- **Commit**: `7093d54`.
- **Estado**: corrigido.

**Bug #24 — ALTO — Backup diário não cobria o volume de uploads (continuidade de negócio)**
- **Causa raiz**: o backup diário (serviço `postgres` na Railway) cobria só a base de dados via `pg_dump`. Os ficheiros anexados (contratos assinados, fotos de obra, documentos) vivem num volume Railway diferente, montado em `STORAGE_DIR` dentro do serviço `ds-os-platform`, que nunca teve qualquer cobertura de backup — a funcionalidade nativa "Backups" da Railway só está disponível no plano Pro, que esta conta não tem (confirmado via UI durante esta sessão).
- **Impacto real**: perda ou corrupção deste volume apagaria permanentemente todos os contratos e fotos de obra de todos os clientes, sem via de recuperação — o dump da base de dados manteria os registos `Attachment`, mas todos a apontar para ficheiros inexistentes. Para uma plataforma pensada para "centenas de clientes", classificado como lacuna crítica de continuidade de negócio.
- **Ficheiros**: `src/app/api/internal/uploads-backup/route.ts` (novo endpoint, protegido por `BACKUP_INTERNAL_TOKEN`), `src/middleware.ts` (exceção para `/api/internal/*`), Custom Start Command do serviço `postgres` na Railway (script bash estendido).
- **Commits**: `7093d54` (endpoint inicial, streaming sem `Content-Length`), `45a136c` (correção: buffering para ficheiro temporário + `Content-Length` explícito, porque a imagem `postgres:18-bookworm` não tem `curl` nem `wget` — o fetch teve de ser reescrito em bash puro via `/dev/tcp`, que exige tamanho exato para um `dd` binário seguro sem parser de chunked encoding), `b238fa9` (documentação — `docs/backup-runbook.md`).
- **Descoberta adicional durante a implementação**: a porta interna real do serviço `ds-os-platform` na rede privada da Railway é **8080**, não 3001 como o `Dockerfile` (`ENV PORT=3001`) sugeria — a Railway injeta a sua própria variável `PORT` em runtime, que tem precedência sobre o `ENV` do Dockerfile. Descoberto por uma primeira tentativa real falhada (`Connection refused` na porta 3001), corrigido depois de confirmar a porta certa em Settings → Networking do serviço.
- **Validação**: lógica de download binário via `/dev/tcp` + `dd` testada localmente byte-a-byte (`md5sum` idêntico) incluindo os casos de falha (token inválido, resposta sem `Content-Length`), antes de aplicar em produção. Execução real em produção confirmada nos logs: `[backup] uploads status: HTTP/1.1 200 OK`, `[backup] Created /backups/uploads-daily-20260810-202911.tar.gz (40K)`, `[backup] Retention (uploads) applied.`
- **Estado**: corrigido, em produção, confirmado a funcionar com uma execução real (não simulada). Limitação residual documentada: o **restauro** dos uploads (ao contrário do restauro da base de dados) ainda não foi testado ponta-a-ponta com um exercício real — ver Secção 11 (Parte 2, Dívida Técnica) e `docs/backup-runbook.md` §6.

### 4.4. Resumo por severidade (Bugs #7–#24, os totalmente rastreáveis)

- **CRITICAL**: #9, #10, #11 (3) — todos em `financeiro/actions.ts` e `crm/actions.ts`, todos corrigidos com `$transaction` Serializable.
- **ALTO**: #14, #15, #18, #19, #20, #21, #24 (7).
- **MÉDIO**: #8, #12, #13, #16, #17, #22, #23 (7).
- **Total confirmado e corrigido**: 17 bugs com proveniência direta (#7–#24, excluindo nenhum), mais 6 candidatos inferidos (#1–#6) de uma era anterior sem numeração persistida em código/commit.

**Todos os bugs desta lista estão corrigidos e em produção.** Não há nenhum bug conhecido, de qualquer severidade rastreável, por corrigir no momento da escrita deste documento. Isto não significa que não existam mais bugs por descobrir — significa que a auditoria adversarial mais recente (Secção 4, e o veredito relatado ao utilizador, resumido na Parte 3) não encontrou mais nenhum depois de procurar ativamente.

---

*(Fim da Parte 1. Continua em `DS_OS_MASTER_HANDOVER_PART2.md`.)*
