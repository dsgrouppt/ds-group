# Manual Técnico de Operações — Ecossistema DS Group

*Documento único de referência para instalação, deploy, backups, recuperação, manutenção e estrutura de base de dados. Cobre as duas aplicações do monorepo: `website/` (público) e `platform/` (DS OS, interna). Escrito para quem vier a operar isto no dia a dia — não assume conhecimento prévio do projeto.*

---

## 1. Visão geral da infraestrutura

Duas aplicações Next.js **independentes** no mesmo repositório, com ciclos de deploy separados:

| | `website/` | `platform/` (DS OS) |
|---|---|---|
| Público | Sim — indexado, marketing | Não — `robots: noindex`, ferramenta interna |
| Base de dados | Nenhuma | PostgreSQL |
| Autenticação | Nenhuma | NextAuth (email/palavra-passe) |
| Armazenamento de ficheiros | Nenhum | Disco local (`storage/uploads/`) |
| CI | `.github/workflows/ci.yml` | `.github/workflows/ci-platform.yml` |
| Health check | N/A (estático/SSG) | `GET /api/health` |

Cada uma pode ser alojada em fornecedores diferentes e implantada de forma independente — uma alteração na plataforma nunca obriga a reconstruir o site público, e vice-versa.

## 2. Instalação (ambiente de desenvolvimento)

### Website
```bash
cd website
npm install
cp .env.local.example .env.local   # preencher GTM/GA4/Meta Pixel/HubSpot — ver secção 6
npm run dev                        # http://localhost:3000
```

### Plataforma
```bash
cd platform
npm install
cp .env.example .env               # DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npm run db:local                   # Postgres local via embedded-postgres (noutro terminal, deixar a correr)
npm run db:push                    # aplica o schema
npm run db:seed                    # cria o utilizador ADMIN inicial (password impressa uma única vez)
npm run dev                        # http://localhost:3001
```

Sem Docker, sem conta externa — `embedded-postgres` corre um binário real do Postgres em espaço de utilizador. Ver `platform/scripts/pg-dev.mjs`.

## 3. Deploy — o que está pronto vs. o que depende de decisões da empresa

### 3.1. SSL e domínio

Não há nada para configurar em código. Em qualquer hosting moderno (Vercel, Railway, Render, Netlify), o certificado SSL é emitido e renovado automaticamente (Let's Encrypt) assim que o domínio é apontado para a plataforma de hosting via DNS. Passos que dependem da empresa:

1. **Confirmar/comprar o domínio** (ex.: `dsprojects.pt` para o site, um subdomínio como `os.dsgroup.pt` para a plataforma interna).
2. **Apontar o DNS** para o hosting escolhido (registo `CNAME` ou `A`, conforme o fornecedor indicar no painel).
3. **Aguardar propagação** — normalmente minutos a algumas horas, pode ir até 48h.
4. O SSL fica ativo automaticamente assim que a propagação estiver concluída — nenhuma ação extra.

### 3.2. Variáveis de ambiente

**Website** (`website/.env.local.example` → configurar no painel do hosting):

| Variável | Obrigatória | Nota |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sim | URL final de produção, usado no sitemap/canonical/OG |
| `NEXT_PUBLIC_GTM_ID` | Recomendado | Ver secção 6 |
| `NEXT_PUBLIC_GA_ID` | Só se não usar GTM | — |
| `NEXT_PUBLIC_META_PIXEL_ID` | Só se não usar GTM | — |
| `HUBSPOT_PORTAL_ID` / `HUBSPOT_FORM_GUID` | Sim (formulário de contacto) | Sem isto o formulário responde 500 |

**Plataforma** (`platform/.env.example` → configurar no painel do hosting):

| Variável | Obrigatória | Nota |
|---|---|---|
| `DATABASE_URL` | Sim | Postgres gerido de produção (ver secção 3.3) |
| `NEXTAUTH_SECRET` | Sim | Gerar de novo com `openssl rand -base64 32` — nunca reutilizar o de dev |
| `NEXTAUTH_URL` | Sim | URL final de produção da plataforma |
| `STORAGE_DIR` | Não (tem omissão) | Ver secção 3.4 |

### 3.3. Base de dados de produção

Escolher um fornecedor de Postgres gerido — todos funcionam sem alteração de código:

- **Neon** — serverless, tier gratuito generoso, recomendado por omissão.
- **Supabase** — inclui Postgres + Storage (útil se também se decidir migrar o armazenamento de ficheiros).
- **Amazon RDS / Google Cloud SQL** — se a empresa já tiver conta nesses ecossistemas.

```bash
DATABASE_URL="postgresql://user:pass@host:5432/ds_os?sslmode=require" npx prisma db push
DATABASE_URL="postgresql://user:pass@host:5432/ds_os?sslmode=require" npx tsx prisma/seed.ts
```

### 3.4. Armazenamento de ficheiros — decisão a validar antes do deploy

Fotografias, contratos e documentos ficam hoje em disco local, servidos só via `/api/files/[id]` (autenticado, nunca em `/public`). Funciona sem alterações em qualquer hosting com **disco persistente** (VM, servidor dedicado, Railway/Render com volume). **Não funciona em serverless** (Vercel, AWS Lambda) — nesse caso, migrar `src/lib/storage.ts` para object storage (S3, R2 ou Supabase Storage); é uma alteração isolada a um único ficheiro, nenhuma Server Action muda.

### 3.5. Backups

- A maioria dos fornecedores geridos (Neon, Supabase, RDS) já inclui backups automáticos point-in-time — confirmar a política de retenção no painel do fornecedor escolhido.
- Como camada extra, `platform/scripts/backup.sh` faz um `pg_dump` completo (formato custom, comprimido) para `platform/backups/`, com retenção automática dos últimos 14 backups locais:
  ```bash
  DATABASE_URL="postgresql://..." ./scripts/backup.sh
  ```
- Recomendação: agendar este script diariamente (cron, GitHub Actions agendado, ou o agendador do próprio hosting) e copiar o resultado para um local fora do servidor (ex.: bucket S3/R2 separado).

### 3.6. Recuperação (restore)

```bash
DATABASE_URL="postgresql://user:pass@host:5432/ds_os" ./scripts/restore.sh backups/ds-os-20260101-120000.dump
```

O script pede confirmação explícita antes de substituir dados — nunca corre em silêncio. Testar o processo de restauro pelo menos uma vez num ambiente que não seja produção, antes de precisar dele a sério.

### 3.7. Logs

- **Plataforma**: `src/lib/logger.ts` — eventos estruturados em JSON (`auth.login_success`, `auth.login_failed`, `auth.rate_limited`, `auth.session_revoked`) escritos para stdout. Qualquer hosting moderno (Vercel, Railway, Render) captura stdout automaticamente e disponibiliza-o no painel de logs — nenhuma configuração extra necessária para começar. Para retenção/pesquisa a longo prazo, considerar futuramente encaminhar para um serviço externo (ex.: Axiom, Better Stack, Datadog).
- **Website**: erros do formulário de contacto e falhas de submissão ao HubSpot são registados via `console.error` nas rotas de API — capturados da mesma forma pelo hosting.

### 3.8. Monitorização

- **Health check**: `GET /api/health` na plataforma — devolve `200 {"status":"ok","database":"connected"}` ou `503` se a base de dados estiver inacessível. Não exige autenticação (excluído do middleware). Ligar isto a um uptime monitor externo (ex.: UptimeRobot, Better Stack, Pingdom — todos têm tier gratuito) para alertas por email/SMS se a plataforma cair.
- **Erros em produção**: `error.tsx`/`global-error.tsx` já tratam falhas do lado do utilizador; para visibilidade de erros do lado do Tech Lead, recomenda-se adicionar Sentry (ou equivalente) — não incluído por defeito para não introduzir uma dependência/conta externa sem decisão da empresa, mas a integração é de baixo esforço quando decidido.
- **CI**: `ci.yml` (website) e `ci-platform.yml` (plataforma, com um Postgres real de serviço) correm lint + typecheck + build em cada push/PR — falhas aparecem no GitHub antes de chegarem a produção.

## 4. Estrutura da base de dados (plataforma)

Ver `prisma/schema.prisma` como fonte de verdade. Resumo das tabelas:

| Tabela | Finalidade |
|---|---|
| `User` | Contas e permissões (role) |
| `Client` | Clientes — Família / Investidor / Arquiteto Parceiro |
| `Deal` | CRM — pipeline comercial (8 etapas) |
| `Project` | Obras — pipeline de projeto (8 etapas) |
| `Tag` + `TagOnClient`/`TagOnDeal`/`TagOnProject` | Etiquetas transversais |
| `Task` + `TaskComment` | Tarefas, comentários |
| `CalendarEvent` | Agenda |
| `Invoice` + `Payment` | Financeiro |
| `Employee` | Recursos Humanos |
| `MarketingCampaign` | Marketing |
| `Attachment` | Ficheiros associados a Cliente/Obra/Tarefa |
| `ActivityLog` | Auditoria — quem criou/alterou o quê |

Campos categóricos (`stage`, `status`, `type`, etc.) são `String`, não enums nativos do Postgres — validação centralizada em `src/lib/enums.ts`. Decisão deliberada: mudar um valor permitido é só código de aplicação, não uma migração de schema. 29 índices (`@@index`) cobrem todas as chaves estrangeiras e colunas usadas em filtros/ordenação (ver `docs/auditoria-tech-lead.md`).

## 5. Manutenção contínua

- **Dependências**: correr `npm audit` periodicamente em ambas as apps; aplicar patches de segurança de imediato, adiar majors (ex.: Next.js 16) para uma janela de testes de regressão dedicada.
- **Migrações de schema**: qualquer alteração a `prisma/schema.prisma` deve passar por `prisma db push` (ou `prisma migrate` se se adotar um fluxo de migrações versionadas — a decidir quando a equipa crescer) contra um ambiente de teste antes de produção.
- **Rotação de `NEXTAUTH_SECRET`**: invalida todas as sessões ativas — fazer fora de horário de utilização intensa.
- **Utilizadores**: gerir via `/definicoes/utilizadores` (interface própria) — nunca diretamente na base de dados em produção.

## 6. Integrações — estado e o que falta

Ver `docs/relatorio-final-cto.md` para o estado detalhado de cada integração (Meta Pixel, GA4, GTM, CRM/HubSpot, Google Workspace).

## 7. Disaster Recovery — cenários de pior caso

A secção 3.5/3.6 cobre o backup e restauro do dia a dia (ex.: recuperar
um registo apagado por engano). Esta secção cobre cenários mais graves —
perda total de servidor, corrupção de dados, comprometimento de
credenciais. Objetivos realistas para uma empresa deste porte:

- **RPO (Recovery Point Objective — quanto se pode perder)**: até 24h,
  assumindo backups diários (secção 3.5). Se isto for pouco à medida que
  o volume de dados crescer, aumentar a frequência dos backups é só mudar
  a cadência do agendamento — nenhuma alteração de código.
- **RTO (Recovery Time Objective — quanto tempo até voltar a funcionar)**:
  1–2 horas num cenário de perda total, assumindo que os passos abaixo já
  estão escritos (estão) e que a pessoa que os executa já os leu uma vez
  antes de precisar deles a sério (recomendação: fazer um ensaio completo
  antes do lançamento, não esperar pela primeira emergência real).

### Cenário 1 — Perda total do servidor/hosting (ex.: conta suspensa, fornecedor em baixo)

1. Criar uma nova instância no fornecedor escolhido (ou noutro, se o
   problema for do próprio fornecedor).
2. Restaurar a base de dados a partir do backup mais recente
   (`scripts/restore.sh`, secção 3.6) — ou, se o fornecedor de Postgres
   for gerido (Neon/Supabase/RDS) e for esse o componente que sobreviveu,
   basta apontar o novo `DATABASE_URL`.
3. Reconfigurar as variáveis de ambiente (não se perdem se estiverem
   guardadas num gestor de segredos ou anotadas fora do servidor — nunca
   depender só do painel de uma instância que pode desaparecer).
4. Fazer deploy de novo a partir do repositório Git (a fonte de verdade
   do código nunca vive só no servidor).
5. Apontar o DNS do domínio para a nova instância.

### Cenário 2 — Corrupção ou eliminação em massa de dados

1. Parar imediatamente qualquer escrita adicional (ex.: colocar a
   aplicação em manutenção, ou revogar temporariamente o acesso).
2. Identificar o backup mais recente anterior ao incidente.
3. Restaurar para uma base de dados **nova** (nunca por cima da atual)
   com `scripts/restore.sh`, confirmar a integridade dos dados antes de
   apontar a aplicação para lá.
4. Só depois de confirmado, trocar o `DATABASE_URL` de produção.

### Cenário 3 — Credenciais comprometidas (password de admin, `NEXTAUTH_SECRET`, `DATABASE_URL`)

1. Rodar `NEXTAUTH_SECRET` imediatamente (invalida todas as sessões
   ativas — inclui a do atacante, se já lá estiver).
2. Repor a password de todos os utilizadores admin via
   `/definicoes/utilizadores` (ou diretamente na base de dados, em último
   recurso).
3. Rodar a password da base de dados junto do fornecedor gerido e
   atualizar `DATABASE_URL`.
4. Rever `ActivityLog` (auditoria interna da plataforma) para perceber o
   que foi alterado durante o período comprometido.

### O que garante que estes cenários são recuperáveis, não hipotéticos

- O código-fonte vive no GitHub, não só no servidor — perder o servidor
  nunca significa perder o código.
- Os backups (`scripts/backup.sh`) são independentes do servidor de
  aplicação — devem ser copiados para um local à parte (bucket separado,
  outro fornecedor) precisamente para sobreviverem a uma falha do
  servidor principal.
- As variáveis de ambiente de produção devem ficar guardadas num gestor
  de password da empresa (não só no painel do hosting) — é o único passo
  desta lista que depende de disciplina operacional, não de código.

---

Ver também: [`producao.md`](./producao.md) (detalhe da migração Postgres e testes realizados) e [`auditoria-tech-lead.md`](./auditoria-tech-lead.md) (auditoria de segurança/performance anterior).
