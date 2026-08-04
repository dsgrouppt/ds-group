# DS OS — Preparação para Produção

*Relatório técnico. Cobre a migração para PostgreSQL, variáveis de
ambiente, armazenamento de ficheiros e o que falta decidir antes do
primeiro deploy real (decisões de infraestrutura, não bloqueios técnicos).*

---

## 1. Base de dados: PostgreSQL

O schema (`prisma/schema.prisma`) usa agora `provider = "postgresql"`.
Testado de ponta a ponta neste ambiente contra um Postgres real (18.4) —
não é uma mudança teórica: `db push`, seed, todas as Server Actions e o
teste de integração completo (secção 5) correram contra Postgres, não
SQLite.

**Em produção**, usar um Postgres gerido — qualquer um destes funciona sem
alteração de código, só troca de `DATABASE_URL`:

- [Neon](https://neon.tech) — serverless, tier gratuito generoso, boa opção por omissão
- [Supabase](https://supabase.com) — inclui Postgres + Storage (ver secção 3)
- Amazon RDS / Google Cloud SQL — se a empresa já usa AWS/GCP

Passos ao migrar:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/ds_os?sslmode=require" npx prisma db push
DATABASE_URL="postgresql://user:pass@host:5432/ds_os?sslmode=require" npx tsx prisma/seed.ts
```

**Desenvolvimento local sem Docker/conta externa**: `npm run db:local`
(`scripts/pg-dev.mjs`) usa `embedded-postgres` — a mesma engine Postgres,
binário portátil, corre em espaço de utilizador, sem root e sem serviço
externo. Os dados ficam em `platform/.pgdata/` (fora do controlo de
versões).

## 2. Variáveis de Ambiente

| Variável | Obrigatória | Exemplo produção |
|---|---|---|
| `DATABASE_URL` | Sim | `postgresql://user:pass@host:5432/ds_os?sslmode=require` |
| `NEXTAUTH_SECRET` | Sim | Gerar com `openssl rand -base64 32` — nunca reutilizar o valor de desenvolvimento |
| `NEXTAUTH_URL` | Sim | `https://os.dsgroup.pt` (ou domínio escolhido) |
| `STORAGE_DIR` | Não (tem omissão) | Caminho de um volume persistente — ver secção 3 |

Ver `platform/.env.example` para o ficheiro completo comentado.

## 3. Armazenamento de Ficheiros — a decisão mais importante antes do deploy

Fotografias, contratos e documentos são guardados hoje em disco local
(`src/lib/storage.ts`, pasta `storage/uploads/`), servidos apenas através
de `/api/files/[id]` (nunca em `/public`, sempre atrás de sessão válida).

**Isto funciona perfeitamente em qualquer hosting com disco persistente**
(uma VM, um servidor dedicado, Railway, Render com volume). **Não funciona
em hosting serverless** (Vercel, AWS Lambda) — o sistema de ficheiros aí é
efémero e os ficheiros desapareceriam entre pedidos.

Duas opções, a decidir antes do deploy:

1. **Hosting com disco persistente** (Railway/Render/VM) — zero alterações
   de código, `STORAGE_DIR` aponta para o volume montado.
2. **Vercel ou outro serverless** — migrar `saveFile`/`readStoredFile`/
   `deleteStoredFile` em `src/lib/storage.ts` para um object storage
   (Supabase Storage, Cloudflare R2, AWS S3). É uma mudança isolada a um
   único ficheiro — nenhuma Server Action, página ou componente muda,
   porque todos chamam só essas três funções.

Esta é uma decisão de infraestrutura/custo, não uma tarefa técnica — fica
para validação antes do deploy.

## 4. O que já está pronto para produção

- Cabeçalhos de segurança, RBAC, autenticação com sessão JWT.
- `robots: { index: false, follow: false }` no layout raiz — a plataforma
  nunca é indexada, mesmo que o domínio se torne público por engano.
- `poweredByHeader: false`.
- Rota de ficheiros protegida por sessão (nunca em `/public`).
- Validação de tipo e tamanho de ficheiro (25MB, só imagem/PDF/Word/Excel).
- Todas as escritas passam por Zod antes de tocar na base de dados.

## 5. Testes reais realizados nesta fase

Não apenas `next build` — execução real:

1. **Migração de schema**: `prisma db push` contra Postgres real, todas as
   17 tabelas confirmadas (`ActivityLog`, `Attachment`, `CalendarEvent`,
   `Client`, `Deal`, `Employee`, `Invoice`, `MarketingCampaign`, `Payment`,
   `Project`, `Tag`, `TagOnClient`, `TagOnDeal`, `TagOnProject`, `Task`,
   `TaskComment`, `User`).
2. **Seed** contra Postgres — utilizador admin criado, password gerada e
   validada.
3. **Teste de integração completo** (script dedicado, apagado no final):
   criação de utilizador e desativação; CRUD de cliente; automação
   negócio-ganho → obra; cálculo de margem (orçamento vs. custo);
   upload e associação de um ficheiro a cliente e obra; fatura com
   pagamento parcial (cálculo de valor em falta); tarefa com prioridade,
   comentário e anexo; agregações do dashboard (win-rate, leads por
   origem). Todos os asserts passaram; dados de teste removidos no fim.
4. **Build de produção**: 24 rotas compiladas sem erros (`next build`),
   incluindo as 9 páginas de detalhe novas (`crm/[id]`, `obras/[id]`,
   `agenda/[id]`, `rh/[id]`, `financeiro/[id]`, `marketing/[id]`,
   `tarefas/[id]`, `definicoes/utilizadores/[id]`).
5. **Servidor real** (`next start`) com Postgres real: login por HTTP
   (fluxo CSRF completo) confirmado; as 11 rotas autenticadas principais
   (incluindo os 2 novos módulos — Tarefas e Definições) responderam
   HTTP 200; pedido não autenticado à rota de ficheiros confirmado como
   bloqueado (redireciona para login, nunca serve o ficheiro).
6. **Segurança de dependências**: sem novas vulnerabilidades introduzidas
   pelas dependências adicionadas nesta fase (`embedded-postgres`, só
   dependência de desenvolvimento). Vulnerabilidades remanescentes
   continuam a ser as já documentadas (Next.js 16 major, decisão adiada).

## 6. Checklist antes do primeiro deploy real

- [ ] Escolher fornecedor de Postgres gerido e criar a base de dados
- [ ] Decidir hosting (disco persistente vs. serverless+object storage — ver secção 3)
- [ ] Gerar `NEXTAUTH_SECRET` novo para produção (nunca reutilizar o de dev)
- [ ] Correr `prisma db push` + `prisma/seed.ts` contra a base de produção
- [ ] Guardar a password do admin gerada pelo seed num gestor de password da empresa
- [ ] Configurar `STORAGE_DIR` (ou migrar para object storage, conforme decisão)
- [ ] Configurar domínio + HTTPS (mesmo processo já documentado para o `website/`)

## 7. Auditoria de Tech Lead (segurança, performance, código) — 2026

Auditoria completa à aplicação antes de produção, cobrindo segurança,
performance/escalabilidade, duplicação de código, estrutura de base de
dados, validação de inputs, gestão de sessões, upload de ficheiros, logs,
tratamento de erros e responsividade. Corrigido automaticamente o que
tinha correção segura dentro da arquitetura existente; o que ficou como
recomendação está listado como tal.

### Corrigido nesta auditoria

- **Cabeçalhos de segurança** (`next.config.mjs`): CSP restritivo (sem
  `unsafe-inline` em `script-src`), HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy`. Verificado no `curl -I` real (secção de testes).
- **Sessões**: tempo de vida limitado a 8h (antes sem limite explícito);
  revalidação periódica (60s) do estado `active`/`role` do utilizador
  contra a base de dados no callback `jwt` — uma conta desativada deixa
  de ter acesso dentro de 60s mesmo com um token ainda válido, sem
  esperar pelo próximo login. Limitação documentada: não corre ao nível
  do middleware/edge (Prisma não corre em runtime edge), só nas Server
  Actions/Server Components que chamam `requireUser`.
- **Rate limiting de login** (`src/lib/rate-limit.ts`): 8 tentativas por
  5 minutos por email, em memória. Limitação documentada: não é partilhado
  entre múltiplas instâncias/processos — adequado para um único servidor,
  não para deploy horizontal sem um store partilhado (Redis).
- **Logs estruturados** (`src/lib/logger.ts`): eventos JSON
  (`auth.login_success`, `auth.login_failed`, `auth.rate_limited`,
  `auth.session_revoked`) em vez de nada.
- **Índices de base de dados**: 29 índices adicionados (`@@index`) em
  todas as chaves estrangeiras e colunas usadas em filtros/ordenação nas
  11 tabelas com mais volume esperado (Deal, Project, Task, Client,
  Invoice, Payment, Attachment, TaskComment, ActivityLog, CalendarEvent,
  Employee). Testado com `prisma db push` contra Postgres real — os 29
  índices confirmados na base de dados via `pg_indexes`.
- **Paginação**: Clientes, CRM e Obras (entidades com maior crescimento
  esperado) passaram a ter paginação real (25 por página, `?page=N`).
  As restantes listagens (Tarefas, Financeiro, Agenda, RH, Marketing,
  Utilizadores) e as queries de preenchimento de `<select>` receberam um
  limite de segurança (`take`), para nenhuma consulta ficar sem limite.
- **Validação de inputs**: todos os campos de texto em todos os
  formulários (9 ficheiros `actions.ts`) passaram a ter `.max()` no Zod —
  56 limites adicionados. Antes, um campo de texto podia receber um valor
  de qualquer tamanho.
- **Upload de ficheiros**: verificação de assinatura binária
  ("magic bytes") do conteúdo real do ficheiro, além do tipo MIME
  declarado pelo browser — impede um ficheiro com extensão/tipo trocado
  (ex.: um executável disfarçado de PDF) de ser aceite.
- **Tratamento de erros**: adicionados `error.tsx`, `global-error.tsx`,
  `not-found.tsx` e `loading.tsx` — nenhum existia antes. Um erro
  inesperado agora mostra um ecrã de recuperação em vez do erro genérico
  do Next.js; confirmado com um pedido real a uma rota inexistente
  (404 com o texto correto, ver secção de testes).
- **Código duplicado**: `formatEuro`/formatação de data centralizados em
  `src/lib/format.ts`, removendo 4 implementações copiadas (dashboard,
  financeiro, financeiro/[id], obras/[id]).
- **Bug de tipos**: `requireUser()` tinha um tipo de retorno que permitia
  `role: undefined`, o que escondia um caso real (sessão revogada) atrás
  de um tipo permissivo — corrigido para redirecionar para `/login`
  também quando `role` vier vazio, com tipo de retorno explícito.

### Testado (execução real, não só build)

`npm run build` — 24 rotas compiladas sem erros. Teste HTTP completo contra
Postgres real (embedded, arrancado e parado dentro do mesmo processo de
teste): login via fluxo CSRF completo, Clientes página 1 e 2 (paginação),
CRM/Obras/Tarefas/Financeiro autenticados (200), rota de ficheiros sem
sessão (307 — bloqueada, nunca serve o ficheiro), página inexistente (404
com o boundary correto), cabeçalhos de segurança confirmados na resposta
real (`X-Frame-Options`, HSTS, CSP, `X-Content-Type-Options`).

### Recomendado, não aplicado nesta fase (risco documentado, não escondido)

- **Rate limiting partilhado**: o limitador atual é em memória — não
  sobrevive a reinício do processo nem é partilhado entre várias
  instâncias. Recomenda-se um store partilhado (Redis/Upstash) antes de
  um deploy com mais de uma instância.
- **Sessão a nível de edge**: a revogação de sessão só é verificada nas
  Server Actions/Components, não no middleware (limitação técnica do
  runtime edge, não pode chamar Prisma diretamente). Numa conta desativada,
  o utilizador continua a passar pelo middleware até tocar numa página que
  chame `requireUser()` — na prática, quase sempre a primeira página.
- **Antivírus/scanning de malware nos uploads**: a verificação de magic
  bytes impede ficheiros com tipo declarado errado, mas não substitui um
  scanner de malware real (ex.: ClamAV) — recomendado antes de aceitar
  uploads de fontes não totalmente confiáveis.

## 8. Auditoria de continuidade — véspera de produção (2026)

Segunda passagem, focada especificamente em "o que ainda impede o
primeiro uso real": tudo o que tinha correção seguindo os padrões já
estabelecidos no código foi corrigido diretamente; o resto ficou
documentado como decisão de infraestrutura (secções 1–3, inalteradas).

### Corrigido

- **Bug real de dados a desaparecer (Tarefas e Agenda)**: as duas
  páginas buscavam todos os registos numa única query ordenada
  (`status` ou `startAt` crescente) e só depois separavam "ativas" de
  "concluídas" (ou "próximas" de "anteriores") em memória, com um limite
  de segurança (`take`) aplicado à query ainda não separada. Na prática,
  isto significa que assim que o número de tarefas concluídas/canceladas
  (ou eventos passados) acumulados ultrapassasse esse limite, tarefas
  ativas e eventos futuros podiam deixar de aparecer na lista — não por
  estarem "cortados no fim", mas porque o próprio registo ativo nunca
  chegava a entrar no resultado da query. Corrigido para duas queries
  independentes (ativas/concluídas, futuras/passadas), cada uma com o
  seu próprio limite e ordenação — o mesmo padrão robusto já usado no
  Dashboard.
- **Paginação real** adicionada a RH, Financeiro, Marketing e
  Definições > Utilizadores — a recomendação deixada em aberto na
  auditoria anterior (secção 7) foi implementada, usando o mesmo
  componente `Pagination` já validado em Clientes/CRM/Obras.
- **Alteração de password pelo próprio utilizador** (`/perfil` para a
  equipa, `/portal/conta` para clientes do Portal): antes, só um ADMIN
  conseguia repor a password de alguém (em Definições, módulo a que só
  ADMIN tem acesso) — todos os outros perfis (Direção, Comercial, Gestor
  de Projeto, Financeiro, RH, Marketing) e todos os clientes do portal
  não tinham nenhuma forma de trocar a sua própria password.
- **Revogação imediata de sessão ao mudar password**: adicionado
  `passwordChangedAt` a `User` e `Client`, comparado no callback `jwt`
  contra o momento de login do token (`loginAt`, fixado uma única vez).
  Antes, repor a password de uma conta comprometida bloqueava novos
  logins mas não terminava uma sessão já aberta (só expirava
  naturalmente, até 8h depois) — agora essa sessão é revogada no ciclo
  de revalidação seguinte (até 60s), igual ao tratamento já existente
  para contas desativadas.
- **Conflito de email no Portal do Cliente**: `Client.email` não é único
  na base de dados (dois registos podem partilhar contacto de propósito).
  Isso tornava-se um problema só se dois clientes tivessem o portal
  ativo com o mesmo email ao mesmo tempo — o login deixaria de ser
  determinístico. Bloqueado na origem: ativar o portal para um cliente
  agora falha com um erro claro se outro cliente já tiver o portal ativo
  com esse mesmo email.
- **Dica de "esqueci-me da password"** adicionada às duas páginas de
  login (equipa e Portal do Cliente) — antes não havia nenhuma indicação
  do que fazer.
- `engines` adicionado a `package.json` (`node >=20 <21`), alinhado com
  o `Dockerfile` (`node:20-alpine`) e o CI (`node-version: "20"`).

### Validado

`prisma generate` e `tsc --noEmit` (projeto inteiro, zero erros) neste
ambiente; o build de produção real e `prisma db push` contra Postgres
correm automaticamente no CI a cada push a `master` (ver
`docs/integracoes-estado.md` para o histórico dessa validação).

### Ainda por decidir (infraestrutura, não código — ver secções 1–3)

Nada de novo nesta passagem — continuam a ser as três decisões de
sempre: fornecedor de Postgres, hosting (disco persistente vs. object
storage) e domínio. A checklist da secção 6 não muda.
