# DS OS — Relatório Técnico da Arquitetura (Plataforma ERP+CRM)

*Relatório do Tech Lead. Aplicação nova, separada do website público:
`platform/`. Testada e validada em execução real (não apenas build) antes
deste relatório — ver secção 8.*

---

## 1. Decisão de arquitetura: aplicação separada

O `website/` (público, indexado, marketing) e o `platform/` (interno,
nunca indexado, ferramenta de gestão) são propositadamente duas aplicações
Next.js distintas dentro do mesmo monorepo, e não um único projeto. Razões:

1. **Superfície de ataque diferente.** O website é público por definição;
   a plataforma de gestão contém dados de clientes, faturação e negócios —
   nunca deve ser indexável nem partilhar processo/porta com o site público.
2. **Ciclos de deploy independentes.** Uma alteração no CRM não deve
   obrigar a reconstruir o site institucional, e vice-versa.
3. **Stacks de dados diferentes.** O website não tem base de dados; a
   plataforma tem uma base de dados relacional completa (Prisma).

## 2. Stack escolhida e porquê

| Decisão | Alternativas consideradas | Porquê esta |
|---|---|---|
| Next.js 14 App Router + TS | Remix, SvelteKit | Mesma stack do website — reduz curva de aprendizagge da equipa, reutiliza padrões já testados (Server Components, Server Actions) |
| Prisma + **SQLite** (dev) | Postgres/MySQL geridos | SQLite não exige nenhuma conta ou serviço externo — a base de dados funciona imediatamente, sem bloqueios de autenticação. Migração para Postgres em produção é uma troca de uma linha (`provider`) + `DATABASE_URL`, sem tocar no resto do código |
| NextAuth Credentials + bcrypt | OAuth (Google/Microsoft) | OAuth exigiria criar credenciais numa consola de terceiros (bloqueado por login/decisão da empresa sobre que fornecedor usar); Credentials funciona de imediato e fica pronto para adicionar SSO depois, sem reescrever o modelo de sessão |
| Server Actions para escrita | API REST + fetch client-side | Menos código, menos JS enviado ao browser, validação e mutação no mesmo ficheiro — mesma filosofia de performance do website |
| Tailwind + tokens de marca | Componentes de UI de terceiros (MUI, Ant) | Consistência visual total com o Brand Book da DS Group; zero dependência de um design system genérico que teria de ser "desmarcado" |

## 3. Autenticação e Permissões (RBAC)

- Login por email/palavra-passe (`next-auth`, Credentials Provider,
  sessão JWT). Palavras-passe cifradas com `bcrypt` (12 rounds).
- `src/middleware.ts` protege **todas** as rotas exceto `/login` e a API
  de autenticação — qualquer pedido não autenticado é redirecionado para
  `/login`, não para a página genérica do NextAuth.
- 7 perfis (`ADMIN`, `DIRECAO`, `COMERCIAL`, `GESTOR_PROJETO`,
  `FINANCEIRO`, `RH`, `MARKETING`), com uma matriz única de permissões
  (`src/lib/permissions.ts`) que decide, por módulo, quem vê (`view`) e
  quem edita (`edit`). A mesma matriz controla o que aparece no menu
  lateral e o que cada Server Action aceita executar — não há duas fontes
  de verdade a divergir com o tempo.
- Primeiro utilizador (`ADMIN`) criado via `npm run db:seed`, com
  palavra-passe gerada aleatoriamente e impressa uma única vez na consola
  — nunca fica hardcoded no código.

## 4. Base de Dados

Schema único (`prisma/schema.prisma`) cobrindo os 7 módulos pedidos,
alinhado deliberadamente com o desenho já aprovado em
`docs/crm-especificacao.md` e `crm/schema/*.json` (Fase anterior) — mesmos
nomes de campo, mesmas etapas de pipeline, mesmas etiquetas:

- **User** (autenticação + role)
- **Client** — Família / Investidor / Arquiteto Parceiro
- **Deal** (CRM) — Pipeline Comercial de 8 etapas (Novo Lead → Fechado)
- **Project** (Obras) — Pipeline de Projeto de 8 etapas (Handover → Pós-obra)
- **Tag** + tabelas de junção — as 6 etiquetas reais (VIP, Risco-Prazo, etc.)
- **Task** — transversal a negócios e obras
- **CalendarEvent** (Agenda)
- **Invoice** + **Payment** (Financeiro)
- **Employee** (RH)
- **MarketingCampaign** (Marketing)
- **ActivityLog** — auditoria de quem criou/alterou o quê

Nota técnica: SQLite não suporta enums nativos do Prisma — os campos
categóricos (estado, tipo, origem, etc.) são `String`, validados na
aplicação via `src/lib/enums.ts` (união de tipos TypeScript + rótulos em
português). Migrar para Postgres no futuro não obriga a alterar nada aqui.

## 5. Design System e Layout Administrativo

- Tokens de marca (`brand/design-tokens.json`) aplicados ao Tailwind da
  plataforma — preto/grafite/branco dominantes, dourado como acento restrito
  (nunca em blocos de cor, só em indicadores de estado ativo/destaque).
- Componentes reutilizáveis em `src/components/ui/`: `Button`, `Card`,
  `Badge`, `Field` (Input/Select/Textarea/Label), `Table`, `StatCard`,
  `EmptyState`, `PageHeader`.
- Layout administrativo (`AppShell` + `Sidebar`): barra lateral fixa em
  desktop com os módulos visíveis conforme a role da sessão, topo com nome/
  role do utilizador e saída de sessão, menu em gaveta no mobile.
- Todas as listagens vazias mostram um `EmptyState` explicativo em vez de
  uma tabela em branco — nenhuma tela "morta" sem orientação do que fazer.

## 6. Dashboard

Indicadores calculados a partir de dados reais da base (nunca inventados —
mesma regra de marca do website): negócios em aberto, obras ativas, número
de clientes, pipeline ponderado (valor × probabilidade), tarefas pendentes,
próximos eventos, faturação recebida no mês. Em ambiente vazio, mostra
"—" em vez de zero-com-aparência-de-dado-real, seguindo o mesmo princípio
usado nas estatísticas do website.

## 7. Módulos — o que está funcional agora

Todos os módulos seguintes têm listagem real (ligada à base de dados) e
formulário de criação funcional (Server Action com validação Zod,
persistência Prisma, e `revalidatePath`) — nenhum botão ou ecrã morto:

| Módulo | Criar | Listar | Automação específica |
|---|---|---|---|
| Clientes | ✅ | ✅ (+ página de detalhe com negócios/obras ligados) | — |
| CRM | ✅ | ✅ (com avanço de etapa) | Negócio → **Fechado-Ganho** cria automaticamente uma Obra (docs/crm-especificacao.md §6) |
| Obras | ✅ | ✅ (com avanço de etapa) | Etapa **Entregue** regista data de entrega |
| Financeiro | ✅ | ✅ | Estado **Paga** regista data de pagamento; indicadores de total pago/em atraso |
| Agenda | ✅ | ✅ (separada em Próximos/Anteriores) | — |
| Recursos Humanos | ✅ | ✅ | — |
| Marketing | ✅ | ✅ | Vista de leads por origem calculada em tempo real a partir dos negócios do CRM (base do indicador "ROI de marketing" do §7 da especificação) |

## 8. Testes realizados (não apenas build — execução real)

Por instrução explícita ("testa, corrige, faz build, deixa tudo sem
erros"), esta fase incluiu testes de execução real, não só `next build`:

1. **Build de produção** — compila sem erros, todas as 8 rotas do grupo
   protegido + login + acesso-negado geradas corretamente.
2. **Correção de bug encontrado durante o teste**: a página de login,
   por ser um Client Component com `useSearchParams`, estava a ser
   pré-renderizada estaticamente de forma incorreta — corrigido separando
   a página (Server Component, `dynamic = "force-dynamic"`) do formulário
   (`src/components/LoginForm.tsx`, Client Component).
2b. **Segundo bug corrigido**: o middleware redirecionava utilizadores não
   autenticados para a página genérica do NextAuth em vez do `/login`
   personalizado — corrigido configurando `pages.signIn` no `withAuth`.
3. **Servidor real arrancado** (`next start`) e testado via pedidos HTTP
   reais (`curl`), incluindo:
   - Pedido não autenticado a `/` → confirmado redirecionamento 307 para `/login`.
   - `/login` → confirmado HTML com "Entrar" e "Palavra-passe" (formulário real).
   - **Login real** com o utilizador admin gerado pelo seed (fluxo CSRF +
     credentials completo) → cookie de sessão emitido e validado.
   - Com sessão válida, pedido a `/`, `/crm`, `/obras`, `/clientes`,
     `/financeiro`, `/agenda`, `/rh`, `/marketing` → todos HTTP 200 com o
     conteúdo esperado de cada módulo.
4. **Teste de integração da automação central** (negócio ganho → obra
   criada automaticamente): script que cria um cliente e um negócio reais,
   avança o negócio para "Fechado — Ganho" através da mesma lógica do
   Server Action, confirma que a obra é criada e corretamente ligada ao
   negócio e ao cliente — todos os asserts passaram. Os dados de teste
   foram apagados no final; a base fica limpa (1 utilizador admin + 6
   etiquetas, zero registos de negócio fictícios).
5. **Segurança de dependências**: `npm audit` sinalizou vulnerabilidades
   corrigíveis sem risco — `next-auth` e `tsx` atualizados para as versões
   de patch mais recentes. As vulnerabilidades remanescentes exigem subir
   para Next.js 16 (major, breaking change) — mesma decisão documentada no
   website: não aplicado sem janela de testes de regressão dedicada.

## 9. O que fica pendente (intencionalmente, não por esquecimento)

- **Edição e remoção de registos** — hoje é possível criar e avançar
  etapa; falta o CRUD completo (editar campos, apagar). Planeado para a
  próxima iteração de cada módulo.
- **Gestão de utilizadores via interface** — hoje só via `db:seed`/Prisma
  Studio. Requer decisão de produto (quem pode criar contas de quem).
- **Deploy da plataforma** — precisa de decisão sobre alojamento (mesma
  Vercel do website, ou um servidor próprio, dado que esta aplicação tem
  estado/base de dados persistente, diferente do site estático). Esta é
  uma decisão estratégica, não uma tarefa técnica — fica para validação.
- **Migração para Postgres em produção** — o schema já está pronto para
  isso; falta só decidir o fornecedor (Neon, Supabase, RDS, etc.).

## 10. Estrutura de ficheiros (resumo)

Ver `platform/README.md` para a árvore completa de pastas e instruções de
arranque local (`npm install && npm run db:push && npm run db:seed && npm run dev`).
