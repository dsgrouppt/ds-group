# DS OS — Plataforma de Gestão DS Group

ERP + CRM interno para a DS Remodelações — gestão de utilizadores, CRM,
Obras, Clientes, Financeiro, Agenda, Recursos Humanos, Marketing e Tarefas
numa única plataforma. Aplicação separada do `website/` público (esta nunca
é indexada nem publicamente acessível).

## Stack técnica

- **Next.js 14** (App Router) + TypeScript.
- **Prisma + PostgreSQL** — base de dados de produção. Ver `scripts/pg-dev.mjs`
  para correr Postgres localmente sem Docker/conta externa.
- **NextAuth (Credentials Provider) + bcrypt** — autenticação por
  email/palavra-passe, sessão JWT.
- **RBAC (`src/lib/permissions.ts`)** — matriz única de permissões por
  módulo e ação (`view`/`edit`).
- **Tailwind CSS** com os tokens de marca (`brand/design-tokens.json`).
- **Server Actions** para todas as escritas.
- **Armazenamento de ficheiros** em disco (`src/lib/storage.ts`), servido
  apenas através de `/api/files/[id]` (exige sessão válida).

## Como correr localmente

```bash
npm install

# Terminal 1 — Postgres local (fica a correr, sem Docker/conta externa)
npm run db:local

# Terminal 2
npm run db:push    # cria as tabelas a partir do schema
npm run db:seed    # cria o utilizador admin (password aparece uma única vez)
npm run dev         # http://localhost:3001
```

## Permissões (RBAC)

7 perfis: `ADMIN`, `DIRECAO`, `COMERCIAL`, `GESTOR_PROJETO`, `FINANCEIRO`,
`RH`, `MARKETING`. Matriz completa em `src/lib/permissions.ts`. Gestão de
contas em `/definicoes/utilizadores` (só `ADMIN`).

## Módulos

Todos com criar, listar, editar e apagar, ligados à base de dados real:

| Módulo | Rota | Particularidades |
|---|---|---|
| Dashboard | `/` | Indicadores executivos reais (pipeline, win-rate, margem, faturação, tarefas) |
| CRM | `/crm`, `/crm/[id]` | Pipeline Comercial; Fechado-Ganho cria Obra automaticamente |
| Obras | `/obras`, `/obras/[id]` | Pipeline de Projeto; ficheiros; margem (orçamento vs. custo) |
| Clientes | `/clientes`, `/clientes/[id]` | Ficheiros (fotos, contratos, documentos) |
| Tarefas | `/tarefas`, `/tarefas/[id]` | Responsável, prioridade, estado, comentários, anexos |
| Financeiro | `/financeiro`, `/financeiro/[id]` | Faturas + pagamentos parciais |
| Agenda | `/agenda`, `/agenda/[id]` | Eventos ligados a obras |
| Recursos Humanos | `/rh`, `/rh/[id]` | Colaboradores |
| Marketing | `/marketing`, `/marketing/[id]` | Campanhas + leads por origem |
| Definições | `/definicoes/utilizadores` | Gestão de contas e perfis (admin) |

## Upload de ficheiros

`src/lib/storage.ts` guarda ficheiros em `STORAGE_DIR` (por omissão,
`./storage/uploads`). Tipos aceites: imagens, PDF, Word, Excel (máx. 25MB).
Nunca em `/public` — o download só funciona através de `/api/files/[id]`,
que verifica a sessão antes de servir o ficheiro.

**Produção sem disco persistente** (ex.: Vercel): ver `docs/producao.md` —
migrar `saveFile`/`readStoredFile`/`deleteStoredFile` para object storage
(S3, R2, Supabase Storage), sem alterar as Server Actions que os chamam.

## O que falta (por decisão, não por esquecimento)

- Perfil próprio do utilizador (trocar a sua palavra-passe sem ser admin).
- Vista de calendário visual na Agenda (hoje: lista cronológica).
- Ligação de `Employee` a `User` (conta de acesso por colaborador) via UI —
  o campo já existe no schema.
- Object storage para produção serverless (ver `docs/producao.md`).
