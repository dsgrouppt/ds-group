# Checklist de Lançamento v1.0 — Website + DS OS

*Documento único de execução. Consolida os itens em aberto encontrados em `relatorio-final-cto.md`, `relatorio-segunda-ronda.md`, `producao.md` e `integracoes-estado.md` — sem repetir o detalhe técnico de cada um, só a lista de ações. Última verificação de código: 2026-08-11, `tsc`/`eslint`/`next build` limpos em `website/` e `platform/`.*

**Resumo em uma frase:** não há nenhum bloqueio de código para lançar a v1.0. Tudo o que falta abaixo é decisão de negócio, configuração de conta externa, ou preenchimento de variável de ambiente — zero linhas de código.

---

## 1. Infraestrutura (decisões primeiro, tudo o resto depende disto)

- [ ] **Domínio**: comprar/confirmar `dsprojects.pt` e apontar o DNS. Bloqueia SSL, email profissional e as URLs finais.
- [ ] **Base de dados Postgres de produção**: escolher fornecedor (Neon, Supabase, RDS ou equivalente gerido) e criar a instância. Ver comparação em `comparacao-hosting.md`.
- [ ] **Hosting da plataforma (`platform/`, DS OS)**: confirmar Railway (recomendação já dada) ou alternativa. Se optares por serverless (Vercel) em vez de Railway, o armazenamento de ficheiros em disco (`STORAGE_DIR`) tem de migrar para object storage (S3/R2/Supabase Storage) **antes** do deploy — ver `producao.md` secção 3.
- [ ] **Hosting do website (`website/`)**: Vercel (já é o alvo assumido em todo o código — CSP, redirects, `NEXT_PUBLIC_SITE_URL`).

## 2. Variáveis de ambiente a preencher em produção

**`website/`**
- [ ] `NEXT_PUBLIC_SITE_URL` — domínio final com `https://www.`
- [ ] `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_ID` — Google Tag Manager / Analytics 4
- [ ] `NEXT_PUBLIC_META_PIXEL_ID` — Meta Pixel
- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` — código do Google Search Console
- [ ] `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID` — formulário de contacto (ver secção 3)
- [ ] `HUBSPOT_VIABILITY_FORM_GUID` — formulário do Estudo de Viabilidade (formulário HubSpot separado do de contacto)

**`platform/` (DS OS)**
- [ ] `DATABASE_URL` — ligação real à base de dados escolhida na secção 1
- [ ] `NEXTAUTH_SECRET` — gerar um novo, nunca reutilizar o de desenvolvimento
- [ ] `NEXTAUTH_URL` — URL final do DS OS (ex.: `https://os.dsprojects.pt`)
- [ ] `STORAGE_DIR` — caminho do disco persistente (ou variáveis do object storage, se essa for a decisão da secção 1)
- [ ] `BACKUP_INTERNAL_TOKEN` — token para a rota interna de backup de uploads (ver `backup-runbook.md`)

## 3. Contas e integrações externas a criar

- [ ] Conta HubSpot (ou reconfirmar a existente) com **dois** formulários distintos: contacto geral e Estudo de Viabilidade — sem isto, `HUBSPOT_FORM_GUID`/`HUBSPOT_VIABILITY_FORM_GUID` não existem.
- [ ] Google Workspace — email profissional (`geral@dsprojects.pt`, etc.) — só DNS/config, sem código associado.
- [ ] Google Search Console + Google Analytics 4 + Google Tag Manager — criar as propriedades e obter os IDs da secção 2.
- [ ] Meta Business Suite — criar o Pixel e obter o ID.

## 4. Base de dados — primeiro arranque

- [ ] `npx prisma db push` contra a base de dados real (aplica o schema completo, incluindo os 3 modelos novos do CMS interno — ver `website-cms-integracao.md`, ainda não aplicados a nenhuma base de dados real).
- [ ] `npx prisma generate`
- [ ] Correr `prisma/seed.ts` — cria a conta admin inicial.
- [ ] Guardar a password gerada pelo seed num gestor de password da empresa (1Password, Bitwarden, etc.) — só aparece uma vez no ecrã.

## 5. Validação pós-deploy (repetir depois de cada decisão acima estar aplicada)

- [ ] `GET /api/health` (DS OS) responde 200.
- [ ] Login funciona com a conta admin do seed; RBAC testado com pelo menos 2 roles diferentes.
- [ ] Formulário de contacto e Estudo de Viabilidade do website chegam mesmo ao HubSpot (teste real, não só validação de formulário).
- [ ] Rodar Lighthouse (`npx lighthouse https://www.dsprojects.pt --view` ou o painel do Vercel) — não foi possível correr localmente nesta fase (binário ARM incompatível com o sandbox), por isso ainda não há número real de Performance/SEO/Acessibilidade em produção.
- [ ] Testar um restauro de backup real (procedimento em `backup-runbook.md`) pelo menos uma vez com a base de dados de produção definitiva.

## 6. Legal e comercial

- [ ] Validar juridicamente o modelo de contrato (`documentos-internos.md`) com um advogado — o documento é explicitamente um esqueleto estrutural, não uma minuta válida.

## 7. Conteúdo — só depende de ti, não de código

- [ ] Fotografar/filmar as obras seguindo `playbook-fotografia.md` e `playbook-video.md`.
- [ ] Publicar as primeiras obras via DS OS (`/marketing/website`) e exportar para o website (`website-cms-integracao.md`).
- [ ] Recolher a primeira autorização de testemunho e ativá-la em `/marketing/website/testemunhos`.

---

## O que já NÃO está nesta lista (porque já está feito e validado)

Todo o código de website e DS OS — incluindo o sistema de portefólio, galeria, estudos de caso, testemunhos, CMS interno, SEO técnico, segurança (RBAC, CSP, rate limiting, validação de inputs), CI/CD, backups e disaster recovery — está escrito, testado (build real + execução real contra Postgres) e à espera apenas da infraestrutura de produção acima. Detalhe completo em `relatorio-final-cto.md` e `relatorio-segunda-ronda.md`.

Duas notas de risco técnico conhecido, documentadas e deliberadamente adiadas (não bloqueiam o lançamento, mas convém saber que existem):
- Rate limiting de login é em memória — não sobrevive a reiniciar o processo nem funciona corretamente com mais de uma instância do servidor em simultâneo. Resolver com Redis/Upstash antes de escalar para múltiplas instâncias.
- Revogação de sessão não cobre o middleware de edge do Next.js (limitação técnica da plataforma, não um bug) — uma conta desativada perde acesso no pedido seguinte à primeira página, não instantaneamente ao nível do middleware.
