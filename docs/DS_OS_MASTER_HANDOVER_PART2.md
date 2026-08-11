# DS OS — MASTER HANDOVER (PARTE 2 de 3)

*(Continuação direta da Parte 1 — lê primeiro `DS_OS_MASTER_HANDOVER_PART1.md`.)*

---

## 5. Alterações estruturais — tudo o que foi alterado durante o projeto

Esta secção lista, sem omissões, as mudanças estruturais (não os bugs individuais já cobertos na Secção 4) que moldaram o estado atual do sistema, por ordem cronológica aproximada.

1. **Fundação do monorepo**: criação de `website/` e `platform/` como duas aplicações Next.js separadas dentro do mesmo repositório Git, decisão arquitetural coberta em detalhe na Secção 2.1 (Parte 1).
2. **Website — construção completa**: 32 rotas, sistema de design com tokens de marca, SEO técnico completo (sitemap, robots, JSON-LD, Open Graph), Estudo de Viabilidade (wizard de 6 passos), integração HubSpot Forms, analytics (GA4/GTM/Meta Pixel) condicionados por variável de ambiente, cabeçalhos de segurança (CSP/HSTS/X-Frame-Options).
3. **Plataforma — base de dados**: início em SQLite para desenvolvimento local, migração completa para PostgreSQL (decisão registada em `docs/producao.md`) antes de qualquer deploy real de produção — não há nenhum resquício de SQLite no schema ou no código atual.
4. **Plataforma — schema Prisma**: construção incremental das 18 tabelas, decisão deliberada de usar `String` em vez de enums nativos do Postgres para campos categóricos (ver Secção 2.4, Parte 1), adição de 32 índices numa auditoria dedicada de performance (`docs/auditoria-tech-lead.md`).
5. **Autenticação**: implementação do NextAuth com um único provider (equipa), depois extensão para dois providers distintos (`credentials` + `cliente`) quando o Portal do Cliente foi desenhado — decisão de isolamento coberta em detalhe na Secção 2.6 (Parte 1).
6. **RBAC**: construção da matriz de permissões única (`src/lib/permissions.ts`) como fonte de verdade central, usada tanto no menu lateral como no gating de Server Actions — substituindo qualquer verificação ad-hoc anterior.
7. **9 módulos funcionais**: construídos incrementalmente (Clientes → CRM → Obras → Financeiro → Agenda → RH → Marketing → Tarefas → Definições/Utilizadores), cada um seguindo o mesmo padrão de Server Component de listagem + Server Actions de mutação + Zod na fronteira.
8. **Automação Negócio→Obra**: implementação do gatilho automático (negócio avança para `FECHADO_GANHO` → cria `Project` automaticamente) — o mecanismo central de valor de negócio de toda a plataforma.
9. **Sistema de anexos/uploads**: `src/lib/storage.ts` com validação de tipo/tamanho e verificação de assinatura binária real, armazenamento fora de `/public`, servidos só via `/api/files/[id]` autenticado.
10. **Portal do Cliente**: construído como um segundo grupo de rotas (`/portal/(client)/`) com as suas próprias páginas (resumo, documentos, fotos, mensagens, cronograma, pagamentos, relatórios) e funções de leitura scoped por cliente (`src/lib/portal-data.ts`).
11. **Decisão de hosting**: análise comparativa (`docs/comparacao-hosting.md`) entre Vercel, Railway, Render e VPS, concluindo Railway para a plataforma (precisa de processo long-running + volume persistente + Postgres gerido) e Vercel para o website (estático/SSG, sem necessidade de servidor persistente).
12. **Dockerização da plataforma**: `platform/Dockerfile` multi-stage (`node:20-alpine`), build `output: "standalone"` do Next.js, `docker-entrypoint.sh` para corrigir permissões do volume montado (`root:root` → utilizador da aplicação) — necessário depois de um bug real de `EACCES` em produção (commits `88076c5`/`45f0985`).
13. **CI/CD**: dois workflows GitHub Actions isolados por `paths`, cada um corre lint + typecheck + build + (para a plataforma) testes contra um Postgres de serviço efémero.
14. **DNS e SSL**: configuração de registos em `dominios.pt`, apontando `os.dsprojects.pt` para a Railway e `www.dsprojects.pt`/`dsprojects.pt` para a Vercel, SSL automático via Let's Encrypt em ambos.
15. **Correção sistemática de bugs de segurança e integridade de dados**: as três vagas documentadas na Secção 4 — a vaga inicial (#1–#6, parcialmente reconstruída), a vaga de transações atómicas (#9–#17, commit único `de16205`), e a auditoria adversarial mais recente (#18–#24, commits `7093d54`/`45a136c`/`b238fa9`).
16. **Sistema de backups**: implementação em duas fases — primeiro só a base de dados (serviço `postgres` na Railway, cron diário com retenção diário/semanal/mensal), depois extensão para cobrir também o volume de uploads (Bug #24, esta sessão), com teste de restauro real da base de dados executado e documentado (`docs/backup-runbook.md` §7).
17. **Reposição de password de admin**: nesta sessão, a pedido explícito do proprietário do produto, via script Node/Prisma/bcrypt executado diretamente na consola da Railway contra produção — mecanismo documentado na Secção 8 desta Parte 2, para reutilização futura se necessário.

---

## 6. Integrações — estado de cada uma

| Integração | Estado real | Detalhe |
|---|---|---|
| **HubSpot** | Código pronto, credenciais por confirmar | O website envia o formulário de contacto e o Estudo de Viabilidade diretamente para a HubSpot Forms API (`src/app/api/contact/route.ts`, `src/app/api/viability/route.ts`). Depende de `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID`, `HUBSPOT_VIABILITY_FORM_GUID` estarem definidas como variáveis de ambiente reais na Vercel. Não confirmado nesta sessão especificamente se os valores em produção são os reais de uma conta HubSpot ativa ou placeholders — **primeira coisa a verificar antes de assumir que os leads estão de facto a chegar à HubSpot**. |
| **GA4** | Código pronto, depende de `NEXT_PUBLIC_GA_ID` | Só carrega se a variável estiver definida — comportamento correto (não carrega scripts de tracking sem consentimento/configuração). Confirmar no painel da Vercel. |
| **Meta Pixel** | Código pronto, depende de `NEXT_PUBLIC_META_PIXEL_ID` | Mesmo padrão do GA4. |
| **GTM (Google Tag Manager)** | Código pronto, depende de `NEXT_PUBLIC_GTM_ID` | Mesmo padrão. |
| **Emails transacionais** | **Não implementado** | Não existe nenhum envio de email a partir da plataforma (nem confirmação de login, nem notificação de nova mensagem no portal, nem convite automático de acesso ao portal). Toda a comunicação de credenciais/notificações é manual, feita pela equipa fora do sistema. Isto é uma lacuna funcional real, não um bug — ver Secção 10 (Roadmap) e Secção 11 (Dívida Técnica). |
| **Railway** | Produção ativa, 3 serviços | `ds-os-platform` (app), `ds-os-db` (Postgres 18.4), `postgres` (cron de backup diário — nome do serviço é confuso, é o cron, não a base de dados real). Ver Secção 7 para o funcionamento exato. |
| **Vercel** | Produção ativa | Aloja só `website/`. Deploy automático por push a `master` que toque `website/**`. |
| **Backups** | Cobertura completa desde esta sessão | Base de dados (`pg_dump`, diário, retenção 7d/28d/365d para diário/semanal/mensal) + uploads (`tar.gz` do volume via endpoint interno, mesma retenção) — ver `docs/backup-runbook.md`, fonte de verdade atual. Restauro da base de dados testado e confirmado; restauro dos uploads ainda **não** testado ponta-a-ponta (documentado como próximo passo, não como falha). |
| **Uploads (armazenamento de ficheiros)** | Produção ativa, volume persistente Railway | `STORAGE_DIR` no serviço `ds-os-platform`, volume `ds-os-platform-ds-os-uploads`. Sem CDN à frente (todos os downloads passam pelo processo Next.js, autenticados) — aceitável ao volume atual, um ponto a rever se o volume de tráfego de ficheiros crescer muito (ver Secção 11). |
| **Volumes Railway** | 2 volumes ativos | Um para a base de dados (`ds-os-db`, gerido automaticamente pela Railway como parte do serviço Postgres), um para uploads (`ds-os-platform-ds-os-uploads`, montado no serviço da app). |

---

## 7. Produção — como tudo funciona exatamente

### 7.1. Deploy

- **Website**: push para `master` que altere ficheiros dentro de `website/**` → Vercel deteta automaticamente (integração nativa GitHub↔Vercel, sem passo manual) → build Next.js nativo da Vercel (não usa o `website/Dockerfile`) → deploy atómico, com preview automático em cada PR antes do merge para `master`.
- **Plataforma**: push para `master` que altere ficheiros dentro de `platform/**` → Railway deteta automaticamente (integração nativa GitHub↔Railway, root directory configurado como `./platform`) → build via `platform/Dockerfile` (multi-stage: `deps` instala dependências, `builder` corre `prisma generate` + `next build` com output `standalone`, `runner` copia só o necessário para uma imagem `node:20-alpine` final e mínima) → `docker-entrypoint.sh` corrige permissões do volume montado antes de arrancar → `node server.js` (o servidor standalone gerado pelo Next.js) → healthcheck em `/api/health` decide se o deploy é promovido para servir tráfego real.
- **Não há passo manual de `prisma db push` no pipeline de deploy** — isto é feito manualmente quando o schema muda (ver Secção 9, "Migrações"), não automaticamente a cada deploy. Isto é uma decisão deliberada (evita que um deploy de código sem alterações de schema corra `db push` desnecessariamente) mas exige disciplina manual: **sempre que o schema.prisma mudar, é preciso lembrar de correr `prisma db push` contra produção antes ou imediatamente depois do deploy do código que depende dessa mudança** — ver Secção 16 (Parte 3) para uma recomendação explícita sobre isto.

### 7.2. Backup

Mecanismo real e único, fonte de verdade absoluta: `docs/backup-runbook.md` (mais atualizado do que qualquer outra menção a backups noutro documento — ver nota crítica na Secção 3.4, Parte 1).

Resumo funcional (o detalhe técnico completo, incluindo o script bash exato, está só no runbook, não duplicado aqui para não divergir no futuro):

1. Serviço Railway dedicado chamado `postgres` (não confundir com o serviço da base de dados `ds-os-db`), configurado com um **Custom Start Command** (não uma imagem/aplicação normal) que corre um script bash agendado via cron da própria Railway.
2. O script faz `pg_dump "$DATABASE_URL" -Fc -f /backups/db-<timestamp>.dump` (formato custom do `pg_dump`, comprimido, permite restauro seletivo por tabela se necessário).
3. Aplica retenção: cópias `weekly-*`/`monthly-*` nos dias certos (domingo/dia 1), `find -mtime +N -delete` para expirar diários (7 dias), semanais (28 dias), mensais (365 dias).
4. Depois do dump da base de dados, faz um pedido HTTP ao endpoint interno `/api/internal/uploads-backup` do serviço `ds-os-platform` (via rede privada `ds-os-platform.railway.internal:8080`, autenticado com `BACKUP_INTERNAL_TOKEN` partilhado), que devolve um `tar.gz` de todo o volume de uploads com `Content-Length` explícito.
5. Como a imagem `postgres:18-bookworm` não tem `curl`/`wget` instalados, o pedido HTTP é feito com **bash puro** via `/dev/tcp` (pseudo-dispositivo do bash para sockets TCP diretos) e o corpo da resposta é lido com `dd bs=$CONTENT_LENGTH count=1 iflag=fullblock` para uma cópia binária exata — evita ter de implementar um parser de `Transfer-Encoding: chunked` em bash, o que seria frágil demais para um script não supervisionado.
6. O `tar.gz` de uploads recebe a mesma política de retenção diário/semanal/mensal.
7. Os backups ficam no disco do próprio serviço `postgres` (não noutro volume separado) — ver Secção 11 (Dívida Técnica) para a recomendação de, no futuro, copiar também para armazenamento externo (S3/R2/Backblaze), já que hoje um problema no volume desse serviço específico levaria os backups junto com ele.

### 7.3. Restore

- **Base de dados**: `pg_restore` a partir de um dos ficheiros `.dump`. **Testado e confirmado nesta ou em sessão anterior** com um exercício real: restauro para um ambiente isolado, comparação de contagens de registos entre a base de dados de produção e a restaurada — resultado documentado em `docs/backup-runbook.md` §7 (secção de evidência).
- **Uploads**: `tar -xzf uploads-daily-<timestamp>.tar.gz -C <destino>` — mecanicamente simples, mas **ainda não exercitado ponta-a-ponta em produção** (nunca se restaurou de facto um `tar.gz` de uploads para verificar que os ficheiros extraídos coincidem byte-a-byte com o volume original e que a aplicação os serve corretamente depois). Documentado como o próximo passo lógico de validação, não como um problema ativo — o mecanismo de captura já está confirmado a funcionar (Bug #24), falta só o exercício de restauro espelhado ao que já foi feito para a base de dados.

### 7.4. CI

- `ci.yml` (website): dispara em push/PR que toquem `website/**`. Passos: instalar dependências, `eslint`, `tsc --noEmit`, `next build`.
- `ci-platform.yml` (plataforma): dispara em push/PR que toquem `platform/**`. Passos: instalar dependências, `prisma generate`, `eslint`, `tsc --noEmit`, `prisma db push` contra um **Postgres 16 efémero de serviço do próprio workflow** (nota de inconsistência: a produção real corre Postgres **18.4** — divergência de major version entre CI e produção, risco baixo mas real, ver Secção 11), `next build`.
- Nenhum dos dois workflows corre testes automatizados de comportamento (não há suite de testes unitários/integração no repositório) — o "teste" real de cada bug corrigido nesta e nas sessões anteriores foi feito manualmente/via scripts ad-hoc contra produção ou um ambiente equivalente, não via uma suite persistida no CI. Ver Secção 11 (Dívida Técnica) — esta é provavelmente a lacuna estrutural mais importante para resolver a médio prazo.

### 7.5. Railway — como funciona neste projeto especificamente

- Projeto `dynamic-tenderness`, ambiente único `production` (não há ambiente de staging/preview separado configurado na Railway neste momento).
- 3 serviços: `ds-os-platform` (app, id `5946ed05-7673-4c03-bedc-ed4e3abfc7be`), `ds-os-db` (Postgres 18.4, id `70f41fb3-fc55-49a6-bd00-739ee4ec0d51` — **atenção**: este é o mesmo ID que foi confundido durante a investigação desta sessão com o serviço da app, ver a nota de erro na secção "Errors and fixes" do histórico — confirmar sempre pelo nome, não assumir pelo ID de memória), `postgres` (cron de backup, nome enganoso — não é a base de dados).
- Rede privada interna: `<nome-do-serviço>.railway.internal:<porta>` — só acessível entre serviços do mesmo projeto Railway, não exposta à internet. A porta real do `ds-os-platform` na rede interna é **8080** (não a porta 3001 que o `Dockerfile` declara com `ENV PORT=3001` — a Railway sobrepõe sempre a sua própria variável `PORT` de runtime, descoberta da forma mais dura possível durante o Bug #24, com uma falha real em produção antes da correção).
- Volumes persistentes (2): base de dados (gerido automaticamente como parte do serviço Postgres) e uploads (`ds-os-platform-ds-os-uploads`, montado explicitamente no serviço da app).
- Variáveis de ambiente são geridas por serviço, na aba "Variables" de cada um — inclui `DATABASE_URL` (referência automática ao serviço `ds-os-db`), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `BACKUP_INTERNAL_TOKEN`, `STORAGE_DIR`, entre outras.
- **Consola da Railway**: permite correr comandos/scripts diretamente dentro do container em execução de um serviço — usado nesta sessão para (1) diagnosticar a ausência de `curl`/`wget` na imagem do Postgres, e (2) executar o script Node/Prisma/bcrypt de reposição de password de admin diretamente contra a base de dados de produção. É uma ferramenta poderosa e direta — usar com cuidado, é acesso root efetivo à produção.

### 7.6. Vercel — como funciona neste projeto especificamente

- Projeto Vercel ligado ao mesmo repositório GitHub, root directory configurado como `website/` (a Vercel ignora `platform/` completamente — não tenta construí-lo).
- Deploy de produção automático a cada push a `master` (com o filtro de `paths` do lado do GitHub Actions só a controlar o CI/lint, não o deploy em si — a Vercel tem o seu próprio mecanismo de detetar se algo relevante mudou dentro do `website/`).
- Preview deployments automáticos em cada Pull Request, com URL único por PR — útil para rever alterações visuais antes de fazer merge para `master`.
- SSL automático (Let's Edge/Let's Encrypt gerido pela própria Vercel) nos domínios customizados `dsprojects.pt`/`www.dsprojects.pt`, configurados na aba "Domains" do projeto Vercel, com os registos DNS correspondentes criados em `dominios.pt`.

---

## 8. Segurança

### 8.1. RBAC — a matriz de permissões completa (reproduzida na íntegra, não resumida)

Fonte: `platform/src/lib/permissions.ts`. `Action = "view" | "edit"`. Perfis: `ADMIN`, `DIRECAO`, `COMERCIAL`, `GESTOR_PROJETO`, `FINANCEIRO`, `RH`, `MARKETING`.

| Módulo | view | edit |
|---|---|---|
| `dashboard` | todos os 7 perfis | — (dashboard é só leitura, mas mesmo a leitura é filtrada por perfil dentro da própria página — ver correção do Bug #5) |
| `crm` | ADMIN, DIRECAO, COMERCIAL, MARKETING | ADMIN, DIRECAO, COMERCIAL |
| `obras` | ADMIN, DIRECAO, GESTOR_PROJETO, FINANCEIRO, COMERCIAL | ADMIN, DIRECAO, GESTOR_PROJETO |
| `clientes` | ADMIN, DIRECAO, COMERCIAL, GESTOR_PROJETO, FINANCEIRO | ADMIN, DIRECAO, COMERCIAL, GESTOR_PROJETO |
| `financeiro` | ADMIN, DIRECAO, FINANCEIRO | ADMIN, DIRECAO, FINANCEIRO |
| `agenda` | ADMIN, DIRECAO, GESTOR_PROJETO, COMERCIAL | ADMIN, DIRECAO, GESTOR_PROJETO, COMERCIAL |
| `rh` | ADMIN, DIRECAO, RH | ADMIN, DIRECAO, RH |
| `marketing` | ADMIN, DIRECAO, MARKETING | ADMIN, DIRECAO, MARKETING |
| `tarefas` | todos os 7 perfis | todos os 7 perfis |
| `definicoes` | ADMIN | ADMIN |

**Correção (12 ago 2026)**: a versão anterior desta tabela (escrita em 10 ago 2026) tinha três imprecisões
face ao `permissions.ts` real, confirmadas por leitura direta do ficheiro no GitHub nesta data:
`agenda` não é "todos os 7 perfis" — está restrita a ADMIN, DIRECAO, GESTOR_PROJETO, COMERCIAL (RH,
FINANCEIRO e MARKETING não têm acesso); `crm.view` inclui MARKETING; `obras.view` e `clientes.view`
incluem FINANCEIRO. A tabela acima já reflete o ficheiro real. Isto não é uma falha de segurança — é a
documentação que estava desalinhada do código, exatamente o cenário que a nota abaixo previne.

Nota: esta tabela é uma transcrição fiel do estado observado em `permissions.ts` durante a investigação desta sessão — em caso de qualquer dúvida futura, **o próprio ficheiro `src/lib/permissions.ts` é sempre a fonte de verdade definitiva**, nunca esta tabela (ver Secção 15).

### 8.2. OWASP — cobertura por categoria (Top 10, avaliação honesta)

- **A01 Broken Access Control**: era a categoria com mais bugs históricos reais (#5, #18, #19, e a classe inteira de isolamento de dados no Portal do Cliente). Hoje: RBAC centralizado numa única matriz, padrão obrigatório de `view`+`edit` explícito em Server Actions (após #18/#19), isolamento do Portal do Cliente confirmado nesta sessão (ver Secção 1.3, Parte 1) para as funções de leitura principais, com a exceção documentada de duas funções "frágeis mas seguras na prática" (ver mesma secção).
- **A02 Cryptographic Failures**: bcrypt 12 rounds para passwords, `NEXTAUTH_SECRET` como segredo de assinatura JWT (gerido como variável de ambiente Railway, não em código), HTTPS obrigatório em ambos os domínios de produção.
- **A03 Injection**: Prisma como ORM parametrizado em 100% do acesso a dados (nenhuma query SQL raw encontrada em nenhuma das auditorias) — risco de SQL injection estruturalmente eliminado, não apenas mitigado.
- **A04 Insecure Design**: isolamento deliberado entre sessão de equipa e sessão de cliente (Secção 2.6), `visibleToClient` opt-in por omissão `false`, nomes de ficheiro sempre gerados (nunca confiar no nome original do utilizador).
- **A05 Security Misconfiguration**: cabeçalhos de segurança confirmados em produção (CSP, HSTS, X-Frame-Options), plataforma marcada `noindex/nofollow` explicitamente.
- **A06 Vulnerable and Outdated Components**: ver Secção 11 (Dívida Técnica) — há dependências desatualizadas conhecidas, nenhuma classificada como "high" explorável sem major upgrade do Next.js.
- **A07 Identification and Authentication Failures**: rate limiting de login (8 tentativas/5min, em memória — limitação documentada em Secção 2.5, Parte 1), sessão de 8h (não 30 dias), revalidação periódica de `active`/`role`/`passwordChangedAt`.
- **A08 Software and Data Integrity Failures**: `$transaction` com isolamento `Serializable` em todas as operações multi-escrita identificadas como de risco (Bugs #9–#17).
- **A09 Security Logging and Monitoring Failures**: `src/lib/logger.ts` regista eventos estruturados (`auth.login_success`, etc.) para stdout, capturado pelos logs da Railway — não há um sistema de alertas ativo sobre esses logs (ex.: nenhum alerta automático se houver um pico de `auth.login_failed`). Ver Secção 11.
- **A10 Server-Side Request Forgery**: sem pontos de entrada que aceitem URLs arbitrários fornecidos pelo utilizador para o servidor ir buscar (a correção de Open Redirect nos Bugs #1–#3 inferidos é sobre redirecionar o *browser*, não sobre o servidor fazer pedidos — categorias OWASP distintas, ambas cobertas).

### 8.3. Middleware

`src/middleware.ts` corre em Edge Runtime, antes de qualquer Server Component/Server Action. Responsabilidades: (1) permitir sempre `/login`, `/portal/login`, `/api/auth/*`, `/api/health`, `/api/internal/*` (este último autenticado de outra forma — token partilhado, ver 8.6) sem exigir sessão; (2) para todas as outras rotas, exigir um token NextAuth válido; (3) distinguir `token.kind` — uma rota `/portal/*` exige `kind === "CLIENTE"`, qualquer outra rota do grupo `(app)` exige `kind === "STAFF"`; um token do tipo errado nunca alcança a área da outra sessão, é tratado exatamente como ausência de sessão. **Limitação conhecida**: não corre revalidação de `active`/`role` contra a base de dados (Prisma não corre em Edge Runtime) — essa revalidação só acontece no callback `jwt`, invocado a partir de `requireUser()`/`requireModuleAccess()`/`requireClient()` dentro de Server Components/Actions, com uma janela de até 60 segundos de atraso no pior caso.

### 8.4. API

A única "API" real no sentido REST tradicional é `/api/files/[id]` (download de anexos) e `/api/internal/uploads-backup` (backup interno). Tudo o resto de escrita de dados é Server Actions (ver 2.3, Parte 1), não rotas de API separadas — reduz a superfície de ataque tradicionalmente associada a APIs REST expostas (não há endpoints JSON genéricos aceitando payloads arbitrários para além destes dois casos muito específicos e já auditados).

### 8.5. Server Actions

Padrão de segurança obrigatório (repetido da Secção 3.3, Parte 1, porque é central à postura de segurança do projeto): toda a Server Action que muta dados chama primeiro `requireModuleAccess(moduleKey)` (sessão válida + `view`) e depois verifica explicitamente `can(role, moduleKey, "edit")` antes de qualquer escrita — confirmado, depois da correção dos Bugs #18/#19, como aplicado consistentemente em todos os 12 ficheiros `actions.ts` existentes.

### 8.6. Portal

Ver Secção 2.6 (Parte 1) para a arquitetura completa. Do ponto de vista de segurança especificamente: sessão de cliente nunca pode alcançar rotas `(app)` da equipa (bloqueado no middleware por `token.kind`), leitura de dados sempre filtrada por `clientId` nas funções de `portal-data.ts`, anexos só visíveis se explicitamente marcados `visibleToClient` pela equipa.

### 8.7. Sessões, JWT, Cookies

- **Sessão**: JWT (não sessão de base de dados) — `maxAge` 8 horas.
- **Cookie**: gerido pelo NextAuth (nome por omissão `next-auth.session-token` em produção com HTTPS, `__Secure-` prefixado automaticamente pelo próprio NextAuth quando `NEXTAUTH_URL` é `https://`), `httpOnly`, `secure` (só em HTTPS), `sameSite: lax` (comportamento por omissão do NextAuth v4, não sobreposto explicitamente no código — confirmar se algum dia for preciso um comportamento mais restrito).
- **Assinatura**: `NEXTAUTH_SECRET`, variável de ambiente Railway, nunca em código.
- **Revalidação periódica**: a cada 60 segundos (não a cada pedido, por razões de performance — cada revalidação é uma query à base de dados), dentro do callback `jwt`.
- **`passwordChangedAt`**: comparado contra `loginAt` fixado no token no momento do login — uma reposição de password revoga sessões já abertas com a password antiga, dentro da janela de 60s seguinte.

### 8.8. Regras para redefinir password de admin (mecanismo usado nesta sessão, documentado para reutilização)

Não existe (ainda) uma funcionalidade de "esqueci-me da password" self-service para a equipa (só para clientes existe alguma coisa parecida através da própria equipa a repor manualmente — nenhum fluxo de email automático para nenhum dos dois lados, ver Secção 6). Se for necessário repor a password de um utilizador `ADMIN` (ou qualquer outro) diretamente em produção:

1. Aceder à consola da Railway do serviço `ds-os-platform` (não `ds-os-db` — a consola de um serviço app tem acesso ao runtime Node.js e ao `PrismaClient` já configurado com a `DATABASE_URL` correta; a consola do serviço de base de dados só dá acesso a `psql`, não a Node).
2. Correr um script Node.js ad-hoc que importe `bcryptjs`, gere uma password aleatória (padrão usado: `crypto.randomBytes(9).toString('base64url')`, o mesmo padrão do `prisma/seed.ts`), calcule o hash com `bcrypt.hash(password, 12)` e atualize `User.passwordHash` (e opcionalmente `User.passwordChangedAt = new Date()` para forçar logout de qualquer sessão já aberta) via `prisma.user.update(...)`.
3. Comunicar a password gerada ao proprietário do produto — **nunca guardá-la em texto simples em lado nenhum persistente** (nem em código, nem em `docs/`, nem em commits). Este handover não repete a password gerada nesta sessão por essa mesma razão.

---

## 9. Base de Dados

### 9.1. Schema — visão geral

17 tabelas (ver lista completa na Secção 2.4, Parte 1). Cada modelo segue um padrão consistente: `id` como `cuid()`, `createdAt`/`updatedAt` (`@default(now())`/`@updatedAt`), campos categóricos como `String` validados na fronteira da aplicação (`src/lib/enums.ts` + Zod), relações explícitas com `onDelete` pensado caso a caso (ex.: `Restrict` onde apagar deveria ser bloqueado explicitamente pela aplicação antes mesmo de chegar à base de dados, `SetNull` onde um órfão é aceitável, `Cascade` onde a limpeza em cascata é o comportamento correto — ex.: apagar um `Client` deveria mesmo levar consigo `TagOnClient`).

### 9.2. Índices

32 índices `@@index` (contagem corrigida em 12 ago 2026 por contagem direta em `schema.prisma` no GitHub — a versão anterior deste documento indicava 29), todos justificados por uma auditoria dedicada de performance (`docs/auditoria-tech-lead.md`) e confirmados via `pg_indexes` contra a base de dados real de produção — cobrem todas as chaves estrangeiras (evita table scans em joins) e as colunas usadas em filtros/ordenação mais comuns nas tabelas de maior volume esperado (`Deal.stage`, `Project.stage`, `Task.status`+`Task.dueAt`, `Client.type`, `Invoice.status`, `Payment.invoiceId`, `Attachment.projectId`, `ActivityLog.createdAt`, `CalendarEvent.startAt`, `Employee.status`, entre outros — os nomes de campo aqui foram também corrigidos para bater certo com `schema.prisma`).

### 9.3. Constraints

- `Project.dealId String? @unique` — a constraint de unicidade mais importante do schema, é a que garante estruturalmente que um `Deal` nunca fica ligado a mais do que uma `Project` (ver reavaliação do Bug #12, Secção 4.3, Parte 1).
- Chaves estrangeiras (`@relation`) em todas as tabelas de junção (`TagOnClient`, `TagOnDeal`, `TagOnProject`) com `@@unique([clientId, tagId])` (e equivalentes) para impedir duplicação da mesma etiqueta no mesmo registo.
- `Client.email` **deliberadamente não é `@unique`** ao nível do schema (ver Secção 2.6, Parte 1) — a unicidade condicional (só quando o portal está ativo) é garantida na aplicação, dentro de uma `$transaction`, não na base de dados. Isto é uma decisão consciente, não um esquecimento — mas é também um ponto a vigiar: se no futuro alguém escrever um novo caminho de ativação de portal sem passar por `activateClientPortal`, a proteção desaparece. Ver Secção 11.

### 9.4. Transações

Todas as operações identificadas como "ler um estado, decidir com base nele, escrever" usam `prisma.$transaction` com `Prisma.TransactionIsolationLevel.Serializable` (não o nível por omissão `ReadCommitted`) — decisão tomada especificamente porque `ReadCommitted` não teria evitado os cenários de lost update/TOCTOU identificados nos Bugs #9–#17. Conflitos reais sob concorrência resultam no erro `P2034` do Prisma, tratado com uma mensagem clara ao utilizador em vez de um erro genérico ou (pior) uma escrita silenciosamente incorreta.

### 9.5. Migrações

**Não se usa `prisma migrate`** — usa-se `prisma db push`, que aplica o `schema.prisma` diretamente contra a base de dados, de forma idempotente, sem gerar ficheiros de migração versionados no histórico Git. Isto é uma decisão deliberada e ativa (não um esquecimento), com trade-offs claros:

- **Vantagens** (porque foi escolhido): mais rápido para iterar numa fase do projeto onde o schema ainda muda com alguma frequência; não exige resolver conflitos de migrações entre ramos de trabalho; um único comando aplica sempre o estado atual pretendido.
- **Desvantagens** (a considerar seriamente à medida que o projeto amadurece — ver Secção 10, Roadmap, e Secção 11, Dívida Técnica): não há histórico versionado e reversível de como o schema evoluiu ao longo do tempo (só o `git log` do próprio `schema.prisma` serve esse propósito, de forma menos estruturada do que migrações dedicadas); `db push` pode, em certas alterações (ex.: tornar uma coluna `NOT NULL` sem um valor por omissão para linhas existentes), falhar ou pedir confirmação explícita de perda de dados — não há um mecanismo automático de "up/down" testado como existiria com `prisma migrate`; **não há proteção automática contra alguém correr `db push` a partir de uma cópia local do schema desalinhada com o que está realmente em produção** — a disciplina de "o `schema.prisma` em `master` é sempre a verdade" tem de ser mantida manualmente.

**Recomendação explícita para quando a plataforma crescer para "centenas de clientes" reais em produção simultânea** (repetida com mais força na Secção 10, Roadmap): migrar de `db push` para `prisma migrate deploy` antes desse crescimento acontecer, não depois — mudar de estratégia de schema é muito mais barato antes de haver dados reais em grande volume e múltiplos ambientes a divergir.

---

## 10. Roadmap — o que falta

### Prioridade 1 (antes de escalar significativamente o número de clientes/utilizadores reais)

1. **Testar o restauro de uploads ponta-a-ponta** (não só a captura, já confirmada) — completar o par com o restauro de base de dados já testado.
2. **Migrar de `prisma db push` para `prisma migrate deploy`** — ver justificação completa na Secção 9.5. Fazer esta transição com poucos dados em produção é muito mais barato do que fazê-la depois.
3. **Rate limiting de login persistente** (Redis/Upstash em vez de memória do processo) — necessário assim que houver mais do que uma instância do serviço `ds-os-platform` em produção (hoje é só uma instância, por isso o rate limiting em memória ainda funciona corretamente, mas deixa de ser correto no momento em que a Railway escalar horizontalmente).
4. **Alinhar a versão do Postgres usada no CI (`postgres:16`) com a versão real de produção (`18.4`)** — risco baixo mas real de um comportamento válido em CI e inválido em produção (ou vice-versa) por diferenças entre major versions.
5. **Copiar backups para armazenamento externo ao próprio serviço Railway** (S3/R2/Backblaze) — hoje os backups vivem só no disco do serviço `postgres`; um problema nesse serviço específico levaria os backups junto com a produção que deviam proteger.

### Prioridade 2 (melhora robustez/operação, não bloqueia crescimento imediato)

6. **Implementar emails transacionais** (convite automático de acesso ao Portal do Cliente, notificação de nova mensagem, confirmação de ações importantes) — hoje é 100% manual.
7. **Suite de testes automatizados** (unitários e/ou de integração) no CI — hoje a validação de cada correção é manual/ad-hoc, funcionou até agora pela disciplina da auditoria, mas não escala indefinidamente nem protege contra regressões silenciosas em código não tocado recentemente.
8. **Sistema de alertas sobre os logs estruturados existentes** (ex.: alerta automático em picos de `auth.login_failed`, falhas de backup, erros 500) — os logs já existem (`src/lib/logger.ts`), falta só a camada de monitorização ativa em cima deles.
9. **CDN/otimização de entrega de uploads** se o volume de tráfego de ficheiros crescer — hoje todos os downloads passam pelo processo Next.js, aceitável ao volume atual.
10. **Resolver a assimetria de dois lugares em `docs/` a descreverem mecanismos de backup diferentes** (o genérico `scripts/backup.sh` vs. o real `backup-runbook.md`) — não é urgente tecnicamente, mas é uma fonte real de confusão para qualquer pessoa nova (incluindo um futuro Claude) que leia `manual-tecnico-operacoes.md` primeiro.

### Prioridade 3 (nice-to-have, sem urgência)

11. **Atualização menor da imagem Postgres da Railway** (dentro da mesma major version 18).
12. **Reconsiderar upload de ficheiros no Estudo de Viabilidade do website** — hoje só regista nomes, não persiste o binário (Vercel Blob ou equivalente seria o caminho natural).
13. **Ambiente de staging/preview dedicado na Railway** (hoje só existe `production`) — útil para testar alterações de schema/deploy sem risco direto à produção, mas o volume de tráfego atual não obriga a isto de imediato.
14. **Criar `docs/bugs-log.md` persistente** para continuar a numeração de bugs de forma centralizada e rastreável a partir de agora (ver a lacuna de #1–#4/#6 na Secção 4.1) — baixo custo, alto valor de continuidade histórica.

*(Continuação de Dívida Técnica, Melhorias Futuras, Lições Aprendidas, Estado Atual em percentagens, Fonte de Verdade, Regras para o próximo Claude, e Objetivo Futuro na Parte 3.)*

---

## 11. Dívida Técnica — tudo o que ainda existe

Esta lista sobrepõe-se parcialmente ao Roadmap (Secção 10) por desenho — dívida técnica é, por definição, trabalho futuro identificado — mas está organizada aqui por **categoria técnica**, não por prioridade de negócio, para facilitar a um novo Claude/engenheiro encontrar rapidamente tudo o que é relevante para uma área específica que esteja a mexer.

- **Schema/migrações**: ausência de `prisma migrate` versionado (Secção 9.5); `Client.email` sem constraint de unicidade condicional ao nível da base de dados, protegida só na aplicação (Secção 9.3).
- **Autorização**: as duas funções de leitura do Portal do Cliente sem verificação interna de ownership (`getProjectEvents`, `getProjectMessages`) — seguras hoje porque todos os pontos de chamada já filtram por `clientId` antes, mas frágeis a um novo ponto de chamada descuidado (Secção 1.3, Parte 1).
- **Concorrência/escala**: rate limiting de login em memória de processo, não sobrevive a reinício nem escala horizontalmente (Secção 2.5, Parte 1, e Roadmap P1 #3).
- **Observabilidade**: logs estruturados existem mas sem alertas automáticos por cima (Roadmap P2 #8).
- **Testes**: sem suite automatizada de testes unitários/integração no CI (Roadmap P2 #7) — toda a validação histórica de correções foi manual/ad-hoc contra produção ou ambientes equivalentes.
- **CI/produção — divergência de versão do Postgres**: CI usa `postgres:16`, produção usa `18.4` (Roadmap P1 #4).
- **Backups**: restauro de uploads não testado ponta-a-ponta (Roadmap P1 #1); backups guardados só no disco do próprio serviço Railway, sem cópia externa (Roadmap P1 #5).
- **Documentação**: `manual-tecnico-operacoes.md` e `producao.md` descrevem um mecanismo de backup genérico (`scripts/backup.sh`) que já não é o mecanismo real (Roadmap P2 #10); ausência de um `docs/bugs-log.md` persistente e centralizado (Roadmap P3 #14).
- **Funcionalidade incompleta, não bug**: upload de ficheiros no Estudo de Viabilidade do website não persiste binário, só metadados (Secção 1.1, Parte 1, e Roadmap P3 #12); emails transacionais inexistentes em toda a plataforma (Secção 6, e Roadmap P2 #6).
- **Dependências**: algumas dependências desatualizadas em ambos os `package.json` (website e plataforma), nenhuma classificada como vulnerabilidade "high" explorável sem um major upgrade do próprio Next.js (14 → 15/16) — um upgrade de major version do Next.js é um projeto à parte, não uma correção pontual, e deve ser tratado como tal quando for a altura certa (avaliar changelog de breaking changes do App Router/Server Actions antes de avançar).
- **Ambientes**: sem staging/preview dedicado na Railway (Roadmap P3 #13).

*(Fim da Parte 2. Continua em `DS_OS_MASTER_HANDOVER_PART3.md`.)*
