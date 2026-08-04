# Relatório Final — CTO DS Group

*Auditoria completa ao ecossistema (website + plataforma DS OS + infraestrutura) antes de produção. Sem novas funcionalidades — só revisão, correção e preparação para uso real. Todos os testes descritos aqui foram executados de facto (build real, servidor real, base de dados Postgres real), não são só uma checklist teórica.*

---

## 1. O que está concluído

**Código**: revisão completa de `website/` e `platform/` — zero ficheiros mortos, zero dependências não utilizadas, zero duplicações por corrigir. Eliminadas as duplicações encontradas (componente `JsonLd` partilhado em 5 páginas do website; `formatDate` consolidado; já existentes de auditorias anteriores: `formatEuro` e paginação na plataforma). Lint e verificação de tipos limpos nas duas aplicações — a plataforma nem sequer tinha configuração de lint válida até agora (`.eslintrc.json` estava em falta; corrigido).

**Website**: as 32 rotas (homepage, 6 serviços, 8 cidades, 6 artigos de blog, portefólio, FAQ, legal) testadas uma a uma com pedidos HTTP reais — todas 200, 404 correto para conteúdo inexistente. Todos os links internos da homepage verificados um a um. Schema JSON-LD (FAQPage, Service, Article) confirmado presente no HTML real após a refatoração. Formulário de contacto com validação, honeypot anti-spam e RGPD, testado (400 correto para pedido inválido). Acessibilidade confirmada: skip-link, `lang="pt-PT"`, um único `<h1>` por página, todos os campos de formulário com `label`/`htmlFor`, imagens com `alt` de reserva. Mobile: menu hamburger com bloqueio de scroll, 5 media queries. Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options) confirmados na resposta real do servidor.

**Plataforma (DS OS)**: testado o fluxo de utilização real, de ponta a ponta, contra Postgres real — 11 de 11 testes passaram: criar cliente, criar negócio, avançar negócio a Fechado-Ganho (confirma a automação que cria a obra automaticamente), calcular margem obra, criar utilizador, criar tarefa com responsável/prioridade/prazo, comentar tarefa, anexar ficheiros a cliente e obra, criar fatura com pagamento parcial (cálculo do valor em falta), confirmar as agregações do dashboard. Autenticação testada: login com sucesso e com falha, rate limiting confirmado a disparar nos logs após tentativas repetidas. Permissões (RBAC) testadas com um utilizador real de perfil Comercial: acede corretamente a CRM/Clientes/Obras/Agenda/Tarefas, é corretamente bloqueado de Financeiro/RH/Definições (ver nota na secção de riscos sobre o código HTTP desse bloqueio).

**Infraestrutura de produção**: adicionado CI para a plataforma (`ci-platform.yml`) — só o website tinha, a plataforma nunca teve verificação automática antes de cada alteração chegar ao repositório. Adicionado `GET /api/health` para monitorização externa. Adicionados scripts de backup/restauro (`pg_dump`/`pg_restore`) com confirmação explícita antes de substituir dados.

**Documentação**: `docs/manual-tecnico-operacoes.md` (instalação, deploy, SSL/domínio, variáveis de ambiente, backups, recuperação, manutenção, estrutura da base de dados) e `docs/integracoes-estado.md` (estado exato de cada integração pedida), a somar à documentação já existente (`producao.md`, `auditoria-tech-lead.md`, `plataforma-arquitetura.md`).

## 2. O que foi melhorado nesta fase

- Componente `JsonLd` partilhado (elimina duplicação em 5 páginas do website).
- `formatDate`/`formatLongDate` consolidado (website).
- `.eslintrc.json` da plataforma corrigido — o script `lint` existia mas nunca teve efeito real até agora.
- CI da plataforma criado de raiz, com um Postgres real de serviço a validar o schema em cada push.
- `GET /api/health` — não existia nenhum mecanismo de monitorização externa.
- Scripts de backup/restauro — não existiam.
- Dois documentos técnicos novos, consolidando o que antes estava disperso por vários ficheiros.

## 3. O que está pronto para produção

- **Website**: sim, sem bloqueios técnicos. Falta só preencher as variáveis de ambiente de integração (ver secção 4) e apontar o domínio.
- **Plataforma (DS OS)**: sim, para uso diário imediato pela equipa, assim que houver uma base de dados Postgres de produção e as variáveis de ambiente configuradas. Todos os módulos (Clientes, CRM, Obras, Financeiro, Agenda, RH, Marketing, Tarefas, Definições/Utilizadores) têm CRUD completo, permissões testadas, upload de ficheiros validado (tipo + assinatura binária real, não só a extensão), e um dashboard com métricas reais.
- **Segurança**: cabeçalhos completos, sessões com expiração e revalidação, rate limiting no login, logs estruturados, validação de todos os inputs — auditado nesta fase e na fase anterior (`docs/auditoria-tech-lead.md`).

## 4. O que depende apenas da propagação do domínio

Nada disto exige mais trabalho de código — é só tempo de espera pelo DNS:

- **SSL**: automático assim que o domínio for apontado para o hosting escolhido (Let's Encrypt gerido pelo próprio fornecedor).
- **Google Workspace** (email `@dominio-da-empresa`): criar a conta, adicionar os registos MX/SPF/DKIM/DMARC fornecidos pelo Google, aguardar propagação (minutos a 48h). Nenhuma alteração de código em nenhuma das duas aplicações.
- **URLs finais** (`NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`) — só precisam de ser atualizadas com o domínio real quando este estiver decidido.

## 5. O que falta para a empresa começar a trabalhar diariamente na plataforma

1. **Escolher e criar a base de dados de produção** (Neon, Supabase ou RDS — qualquer um funciona sem alteração de código).
2. **Escolher o hosting** para as duas aplicações — decisão importante: se for serverless (Vercel), o armazenamento de ficheiros da plataforma precisa de migrar para object storage (S3/R2/Supabase Storage) antes do lançamento, porque disco local não persiste em serverless; se for um hosting com disco persistente (Railway, Render, VM), não é preciso mudar nada.
3. **Preencher as variáveis de ambiente de produção** em ambas as aplicações (`NEXTAUTH_SECRET` novo, `DATABASE_URL` real, IDs de GTM/GA4/Meta Pixel, `HUBSPOT_PORTAL_ID`/`HUBSPOT_FORM_GUID`).
4. **Correr o seed inicial** (`prisma/seed.ts`) contra a base de produção e guardar a password do admin gerada num gestor de password da empresa.
5. **Comprar/confirmar o domínio** e apontar o DNS.
6. Decisão de produto em aberto, não bloqueadora: envio de email transacional (notificações, redefinição de password por email em vez de mostrada uma vez no ecrã) — funciona sem isto, mas é uma melhoria de experiência a considerar depois do lançamento.

Depois destes passos, a equipa pode começar a usar a plataforma no próprio dia em que o domínio ficar ativo — não há nenhum trabalho de desenvolvimento pendente.

## Nota de transparência — achado da auditoria de testes

Ao testar o bloqueio de acesso por perfil (ex.: um Comercial a tentar abrir Financeiro), confirmámos que o bloqueio **funciona corretamente** — o utilizador nunca vê dados financeiros. Encontrámos, no entanto, uma particularidade técnica: a resposta HTTP nesse bloqueio específico (redirecionamento de página, não o do login) chega com código 200 e uma instrução de redirecionamento automático embutida na própria página, em vez de um código 307 direto — consequência do streaming introduzido pelos ecrãs de carregamento (`loading.tsx`) adicionados na auditoria anterior. Confirmámos, byte a byte, que o conteúdo protegido nunca é enviado nesse cenário — só o ecrã de carregamento e a instrução de redirecionamento. Um browser normal (ou qualquer utilizador real) nunca chega a ver o conteúdo bloqueado; o efeito só é visível para ferramentas automáticas que leem apenas o código HTTP sem processar a página (ex.: alguns scripts de monitorização). Corrigir isto por completo exigiria alterar a estrutura de carregamento da aplicação, o que vai contra a instrução explícita de não alterar a arquitetura existente nesta fase — fica documentado como melhoria recomendada, não como risco de segurança.
