# Auditoria Tech Lead — DS OS (Plataforma ERP+CRM)

*Auditoria de pré-produção cobrindo segurança, performance, escalabilidade, código duplicado, estrutura de base de dados, validação de inputs, proteção contra SQL Injection/XSS/CSRF, gestão de sessões, upload de ficheiros, logs, tratamento de erros, UX e responsividade. Tudo o que tinha correção segura dentro da arquitetura existente foi corrigido e testado contra uma instância real de PostgreSQL. Nada foi reescrito — só corrigido.*

---

## 1. Problemas encontrados

**Segurança**
- Sem cabeçalhos de segurança HTTP (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Sessão sem tempo de vida máximo explícito e sem revalidação — um utilizador desativado no painel de Utilizadores continuava com acesso total até o token expirar por si só.
- Login sem qualquer limite de tentativas — vulnerável a força bruta.
- Sem logs de eventos de autenticação (sucesso, falha, bloqueio).
- Upload de ficheiros confiava apenas no `Content-Type` declarado pelo browser — um ficheiro malicioso com extensão/tipo trocado passava a validação.

**Validação de inputs**
- Todos os campos de texto (nome, notas, título, etc.) em todos os formulários aceitavam qualquer tamanho — nenhum `.max()` no Zod em nenhum dos 9 módulos.

**Performance / Escalabilidade / Base de dados**
- Zero índices (`@@index`) em toda a base de dados — todas as chaves estrangeiras e colunas usadas em filtros (`stage`, `status`, `createdAt`, etc.) sem índice.
- Nenhuma listagem tinha paginação ou limite — Clientes, CRM, Obras e todas as restantes carregavam sempre a tabela inteira.

**Código duplicado**
- `formatEuro` reimplementado de forma idêntica em 4 ficheiros (dashboard, Financeiro, Financeiro/detalhe, Obras/detalhe).

**Tratamento de erros / UX**
- Nenhum `error.tsx`, `not-found.tsx` ou `loading.tsx` em toda a aplicação — um erro inesperado mostrava o ecrã genérico do Next.js em vez de algo tratado; uma rota inexistente idem.
- Um bug de tipos em `requireUser()` permitia que `role` fosse `undefined` sem o TypeScript acusar — sintoma de que o caso de sessão revogada não estava a ser tratado com rigor.

**Proteção CSRF/XSS/SQL Injection** — já cobertas pela arquitetura existente (ver secção "Riscos", nenhum problema novo encontrado aqui: NextAuth gere CSRF nativamente, Prisma parametriza todas as queries, React escapa todo o output por omissão).

## 2. Problemas corrigidos

- **Cabeçalhos de segurança** — CSP restritivo (sem `unsafe-inline` em scripts), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Confirmado num `curl -I` real ao servidor.
- **Sessões** — tempo de vida limitado a 8h; revalidação do estado `active`/`role` do utilizador contra a base de dados a cada 60s no callback `jwt`; uma conta desativada perde o acesso dentro de 60s.
- **Rate limiting de login** — 8 tentativas por 5 minutos por email.
- **Logs estruturados** — eventos JSON para login bem-sucedido, falhado, bloqueado por rate limit e sessão revogada.
- **Upload de ficheiros** — verificação da assinatura binária real do ficheiro ("magic bytes"), além do tipo declarado. Um PDF trocado por outro tipo de ficheiro é agora rejeitado mesmo que o `Content-Type` esteja certo.
- **Validação de inputs** — 56 limites `.max()` adicionados no Zod, cobrindo os 9 ficheiros de Server Actions.
- **29 índices de base de dados** adicionados nas tabelas Deal, Project, Task, Client, Invoice, Payment, Attachment, TaskComment, ActivityLog, CalendarEvent e Employee — testados com `prisma db push` contra Postgres real, confirmados via `pg_indexes`.
- **Paginação real** em Clientes, CRM e Obras (25 registos por página); limite de segurança nas restantes listagens e nos menus de seleção.
- **`src/lib/format.ts`** — elimina as 4 duplicações de `formatEuro`.
- **`error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`** — criados de raiz; confirmado com um pedido real a uma página inexistente (404 correto).
- **Bug de tipos corrigido** em `requireUser()` — sessão revogada volta a redirecionar corretamente para `/login`.

Tudo testado com `npm run build` (24 rotas, zero erros) e um smoke test HTTP real contra uma instância Postgres genuína: login completo (fluxo CSRF), paginação (página 1 e 2), todos os módulos autenticados, rota de ficheiros bloqueada sem sessão, 404 correto, cabeçalhos de segurança confirmados na resposta.

## 3. Melhorias recomendadas (não bloqueiam produção, mas valem a pena)

- **Rate limiting partilhado** (Redis/Upstash) antes de correr mais do que uma instância do servidor — o limitador atual é em memória, por processo.
- **Paginação real** (com UI de Anterior/Seguinte) nas restantes listagens — Tarefas, Financeiro, Agenda, RH, Marketing — hoje só têm um limite de segurança, suficiente para o volume atual mas a rever se crescerem para milhares de registos.
- **Scanner de malware** (ex.: ClamAV) nos uploads — a verificação de assinatura binária impede ficheiros com tipo trocado, mas não substitui uma análise de conteúdo malicioso real.
- Agendar a subida para **Next.js 16** com uma janela de testes de regressão dedicada (decisão já adiada conscientemente, mesma lógica aplicada ao website).

## 4. Riscos antes de produção

- **Revogação de sessão não cobre o middleware/edge** — por limitação técnica do runtime edge do Next.js (não pode chamar Prisma diretamente), uma conta desativada só perde o acesso quando toca numa página que chama `requireUser()`, não no middleware. Na prática cobre quase todos os casos, mas não é instantâneo a 100%.
- **Armazenamento de ficheiros em disco local** — funciona em qualquer hosting com disco persistente, mas não em serverless (Vercel). Decisão de infraestrutura documentada em `docs/producao.md`, a validar antes de escolher onde alojar.
- **Rate limiting em memória** — não sobrevive a reinício do processo nem escala horizontalmente sem um store partilhado.

---

Todas as alterações foram commitadas e estão nos ficheiros da pasta partilhada (`docs/producao.md`, secção 7, tem o detalhe técnico completo).
