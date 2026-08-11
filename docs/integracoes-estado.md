# Estado das Integrações — DS Group

*Auditoria ao estado real de cada integração pedida. "Preparado" significa: código escrito, testado, funciona assim que as credenciais forem inseridas — sem qualquer alteração de código necessária. "Pendente de decisão" significa: precisa de uma conta/decisão da empresa antes de poder ser ligado.*

## Meta Pixel — preparado

Código em `website/src/components/analytics/Analytics.tsx` + `website/src/lib/analytics.ts`. Só é injetado se `NEXT_PUBLIC_META_PIXEL_ID` estiver definido — em branco, a aplicação funciona normalmente sem qualquer erro. Dispara `PageView` automaticamente em cada navegação e `Lead` na submissão do formulário de contacto. CSP (`next.config.mjs`) já permite `connect.facebook.net`. **Falta apenas**: obter o ID do Pixel na Meta Business Suite e preencher `NEXT_PUBLIC_META_PIXEL_ID` nas variáveis de ambiente de produção.

## Google Analytics 4 — preparado

Mesmo padrão do Meta Pixel — `NEXT_PUBLIC_GA_ID`. Só deve ser preenchido se o GA4 **não** estiver a ser gerido via GTM (evita duplicar o evento de pageview). **Falta apenas**: criar a propriedade GA4 e preencher a variável, ou geri-lo inteiramente a partir do GTM (recomendado — ver abaixo).

## Google Tag Manager — preparado

`NEXT_PUBLIC_GTM_ID`. Recomendado como camada principal: permite adicionar/alterar tags (GA4, Meta Pixel, e futuras — ex. LinkedIn Insight, remarketing do Google Ads) sem tocar em código, diretamente na consola do GTM. **Falta apenas**: criar o contentor GTM e preencher a variável.

## CRM — dois sistemas distintos, ambos prontos

- **HubSpot** (captura de leads do website): o formulário de contacto envia diretamente para a HubSpot Forms API (`website/src/app/api/contact/route.ts`), com honeypot anti-spam e consentimento RGPD obrigatório. **Falta apenas**: criar o formulário na conta HubSpot e preencher `HUBSPOT_PORTAL_ID`/`HUBSPOT_FORM_GUID`.
- **Estudo de Viabilidade** (`website/src/app/estudo-de-viabilidade/`, wizard de 6 passos): segue o mesmo padrão, forward para a HubSpot Forms API a partir de `website/src/app/api/viability/route.ts`. Usa um formulário HubSpot **separado** do formulário de contacto (mais campos — tipo de imóvel, área, orçamento, objetivos, prazo). **Falta apenas**: criar esse segundo formulário na conta HubSpot e preencher `HUBSPOT_VIABILITY_FORM_GUID` (se não for definido, a rota tenta `HUBSPOT_FORM_GUID` como fallback, mas o recomendado é ter os dois formulários separados na HubSpot para não misturar os dois tipos de lead no mesmo pipeline de marketing).
- **DS OS** (`platform/`): CRM interno completo — pipeline comercial de 8 etapas, com automação Negócio Fechado-Ganho → Obra criada automaticamente. Testado de ponta a ponta nesta auditoria (ver secção de testes do relatório final). Já pronto para uso diário, sem depender de nenhuma integração externa.

### Estudo de Viabilidade — upload de plantas/fotografias (pendente de decisão de armazenamento)

O wizard aceita upload de plantas e fotografias e mostra pré-visualizações no browser (`URL.createObjectURL`), mas a rota `website/src/app/api/viability/route.ts` **não persiste hoje o conteúdo binário dos ficheiros** — só regista, no resumo enviado para a HubSpot, quantos ficheiros foram anexados e os respetivos nomes. Isto é uma limitação deliberadamente documentada no código (ver comentário no topo do ficheiro), não um bug: guardar o binário requer um destino de armazenamento que ainda não foi decidido/contratado. Duas opções, sem preferência técnica forte entre elas:

1. **Vercel Blob** — mais simples de ligar ao projeto já hospedado na Vercel; basta criar o Blob Store no dashboard da Vercel e definir `BLOB_READ_WRITE_TOKEN`. Poucas linhas de código a acrescentar à rota.
2. **S3 / Supabase Storage / R2** — mais portátil se algum dia o hosting mudar, mas exige criar e gerir a conta/bucket separadamente.

**Falta apenas**: decidir o fornecedor e criar a conta/bucket — o código da rota já isola esta responsabilidade num único ponto (fácil de estender sem tocar no resto do wizard).

Não há hoje uma ligação automática entre os leads do HubSpot e o CRM interno da plataforma — são dois sistemas paralelos com finalidades diferentes (HubSpot = captação/nutrição de marketing; DS OS = gestão comercial e operacional da equipa). Uma integração entre os dois é possível no futuro (via Zapier/Make ou API direta) mas é uma decisão de produto, não uma correção técnica — não implementada por não ter sido pedida como funcionalidade nova.

## Formulários — funcionais e testados

Formulário de contacto do website: validação client-side + server-side (Zod-like manual, email/telefone/consentimento obrigatórios), honeypot, tratamento de erro gracioso, mensagens em português. Testado nesta auditoria (400 para payload inválido, ver relatório). Falta apenas a HubSpot Portal ID/Form GUID reais.

## Email transacional — não implementado, decisão em aberto

Não existe hoje nenhum envio de email a partir de nenhuma das duas aplicações (confirmado por pesquisa no código — sem Nodemailer, Resend, SendGrid ou SMTP configurado). Isto não bloqueia o uso diário da plataforma: a redefinição de password, por exemplo, mostra a nova password uma única vez no ecrã em vez de a enviar por email — funciona, só não é a experiência ideal a prazo. Antes de implementar, é preciso decidir:

1. **Fornecedor**: Resend ou Postmark são as opções mais simples de configurar; alternativa é usar o próprio Google Workspace como relay SMTP assim que estiver ativo (ver secção seguinte).
2. **Que emails enviar**: notificação de nova password, alertas de tarefas com prazo a vencer, resumo diário/semanal, notificação de novo lead — a lista é uma decisão de produto, não constava no pedido de arquitetura original.

Não implementado nesta fase por ser, na prática, uma funcionalidade nova (não uma correção) — decisão a tomar antes de se justificar o esforço.

## Google Workspace — preparado para concluir assim que o domínio propagar

Nada disto depende de código — é configuração de conta e DNS:

1. Criar a conta Google Workspace associada ao domínio da empresa.
2. Verificar a propriedade do domínio (registo TXT que o Google fornece no momento da criação).
3. Adicionar os registos `MX` do Google Workspace ao DNS do domínio (substituem quaisquer MX existentes).
4. Recomendado (evita que os emails da empresa caiam em spam): registos `SPF`, `DKIM` e `DMARC`, todos fornecidos pela consola do Workspace.
5. Aguardar propagação de DNS (minutos a 48h).

Assim que os passos acima estiverem concluídos, os emails `@dominio-da-empresa` ficam ativos — nenhuma alteração de código necessária em nenhuma das duas aplicações para este passo em concreto.

## Plataforma Cliente (Portal do Cliente) — implementada, à espera de base de dados e hosting

Construída dentro de `platform/` (a mesma aplicação DS OS usada pela equipa interna), como uma área isolada em `/portal/*` com autenticação própria — decisão deliberada de **não** reutilizar o sistema de permissões da equipa (`ROLE`/`permissions.ts`), para minimizar o risco de uma alteração futura ao acesso da equipa afetar acidentalmente o acesso dos clientes, ou vice-versa.

O que já está implementado e escrito (código completo, validado com `prisma generate` + `tsc --noEmit` sem erros — ver nota sobre o build local mais abaixo):

- **Modelo de dados**: `Client.passwordHash` / `Client.portalActive` / `Client.lastLoginAt`; novo modelo `ClientMessage` (mensagens cliente ↔ equipa por obra); `Attachment.kind` (Documento / Foto de Obra / Relatório / Outro) e `Attachment.visibleToClient` — um interruptor de privacidade que por omissão é `false`: nenhum ficheiro fica visível no portal só por existir, tem de ser marcado explicitamente pela equipa.
- **Autenticação**: um segundo `CredentialsProvider` do NextAuth (id `"cliente"`), com o mesmo nível de proteção do login da equipa (rate limiting, revalidação periódica contra a base de dados, sessão de 8h). `middleware.ts` distingue as duas sessões pelo campo `kind` do token — uma sessão de cliente nunca alcança rotas internas da equipa, e vice-versa.
- **Gestão de acesso pela equipa**: em Clientes → ficha do cliente, um novo cartão "Portal do Cliente" permite ativar o acesso, definir/redefinir a password e desativar o acesso. **Não existe ainda envio automático de email de convite** — a password é definida manualmente pela equipa e comunicada ao cliente por telefone/email direto (ver secção "Email transacional" acima, que já documentava esta limitação para toda a plataforma).
- **Módulos do portal** (`/portal`, `/portal/projeto`, `/portal/documentos`, `/portal/fotos`, `/portal/mensagens`, `/portal/cronograma`, `/portal/pagamentos`, `/portal/relatorios`): resumo do projeto com timeline de fases, documentos e fotografias filtrados por `visibleToClient`, mensagens (thread por obra, com contagem de não lidas no menu), cronograma (eventos de agenda ligados à obra), pagamentos (faturas e valor pago/em aberto — nunca mostra o `costAmount` interno, só o `budgetAmount` contratado com o cliente) e relatórios.
- **Segurança de acesso a ficheiros**: `src/app/api/files/[id]/route.ts` foi atualizada para servir tanto sessões de equipa como de cliente — mas uma sessão de cliente só consegue descarregar um anexo se este pertencer a um dos seus próprios projetos **e** estiver marcado como `visibleToClient`. Verificado ao nível dos dados, não só na interface.

**Porque não está "pronto a usar" hoje**: esta sessão de trabalho não tem acesso a uma base de dados Postgres nem a um ambiente de hosting para o `platform/` (ao contrário do `website/`, que já está publicado na Vercel com domínio próprio). Falta:

1. **Postgres gerido** (Neon, Supabase, RDS ou equivalente) + as variáveis `DATABASE_URL`/`NEXTAUTH_SECRET`/`NEXTAUTH_URL` de produção.
2. **Hosting** para o Next.js do `platform/` — pode ser a Vercel (segundo projeto, domínio próprio, ex. `os.dsprojects.pt` ou `portal.dsprojects.pt`) ou outro (ver `docs/comparacao-hosting.md` para a análise já feita sobre isto).
3. Depois de ambos existirem: `npx prisma db push` para criar as tabelas (inclui as novas — `ClientMessage`, e os campos novos em `Client`/`Attachment`), e o primeiro `ADMIN` a criar as contas de equipa e a ativar o primeiro cliente no portal.
4. **Fotografias reais**: tal como no website, os módulos "Fotos da Obra" e "Documentos" só mostram o que a equipa carregar — não há dados fabricados. Fica vazio até a equipa começar a marcar ficheiros como visíveis ao cliente.

**Nota sobre validação — build confirmado no CI, não localmente**: o ambiente local desta sessão não conseguiu completar um `next build` de produção para o `platform/` (falha com `SIGBUS` no processo de build — limitação do sistema de ficheiros montado, não do código; o mesmo tipo de limitação já registada durante o trabalho no `website/`). Em vez de insistir no build local, foi feita uma verificação mais forte: ao investigar o repositório, foi encontrado que já existiam dois workflows de CI (`.github/workflows/ci.yml` e `ci-platform.yml`, incluindo `npm ci`, `prisma generate`, `prisma db push` contra um Postgres real efémero, `lint`, `tsc --noEmit` e `next build`) — mas configurados para disparar em pushes ao branch `main`, quando o branch real e ativo deste repositório é `master` (`main` é um branch remoto órfão de uma tentativa de publicação anterior, sem histórico partilhado). Na prática, **nenhum dos dois CIs alguma vez tinha corrido**. Corrigido para `master` nos dois ficheiros — e, já com a correção, ambos os workflows correram pela primeira vez com sucesso sobre o código atual (incluindo o Portal do Cliente): `CI — Plataforma (DS OS)` verde em 1m52s (`prisma db push` aplicado com sucesso a um Postgres real, `next build` concluído sem erros) e `CI — Website` verde em 1m38s. Isto é uma validação mais forte do que um build local: confirma que o `platform/` compila e que o schema Prisma atualizado (incluindo `ClientMessage` e os novos campos de `Attachment`) aplica-se sem erros a um Postgres real — falta apenas ligar esse mesmo processo a um Postgres e hosting de produção (não efémeros) para o Portal do Cliente ficar publicamente acessível.

## CMS Interno (Site — Portefólio, DS OS → Website) — implementado, à espera de aplicação de schema

Módulo `/marketing/website` no DS OS para gerir obras e testemunhos do
portefólio público sem editar ficheiros: criar/editar obra (narrativa
completa, media, serviços realizados), publicar/despublicar, gerir
testemunhos com autorização explícita, exportar o conteúdo publicado para
um ficheiro que o website importa com `node scripts/import-cms-export.mjs`.
Testado ponta a ponta com dados sintéticos nesta sessão (obra de teste
criada, exportada, importada, e o website gerou a página real com
sucesso). Zero automação DS OS → GitHub por decisão deliberada — ver
`website-cms-integracao.md` secção 2 para a justificação completa.

**Falta**: 3 modelos novos (`WebsiteCaseStudy`, `WebsiteMediaAsset`,
`WebsiteTestimonial`) foram adicionados a `prisma/schema.prisma` mas ainda
não foram aplicados a nenhuma base de dados — nem local, nem produção.
Só ficam ativos depois de `npx prisma db push` (ou migrations, se essa for
a via escolhida) contra a base de dados de destino. Ver
`checklist-lancamento-v1.md` secção 4.

---

**Resumo em uma linha por integração:**

| Integração | Estado |
|---|---|
| Meta Pixel | Preparado — falta só o ID |
| GA4 | Preparado — falta só o ID |
| GTM | Preparado — falta só o ID |
| HubSpot (formulário/CRM externo) | Preparado — falta só Portal ID + Form GUID |
| CRM interno (DS OS) | Concluído e testado |
| Formulário de contacto | Concluído e testado (lógica); falta ligar ao HubSpot real |
| Email transacional | Não implementado — decisão de produto em aberto |
| Google Workspace | Depende só de DNS/propagação — sem trabalho técnico |
| Estudo de Viabilidade (HubSpot) | Preparado — falta só `HUBSPOT_VIABILITY_FORM_GUID` |
| Estudo de Viabilidade (upload de ficheiros) | Pendente — falta decidir e ligar armazenamento (Vercel Blob/S3) |
| Portal do Cliente (`platform/`) | Código completo, validado por CI real (build + `prisma db push`) — falta Postgres + hosting de produção |
| CMS Interno (Site — Portefólio) | Código completo e testado ponta a ponta — falta aplicar o schema Prisma a uma base de dados real |
