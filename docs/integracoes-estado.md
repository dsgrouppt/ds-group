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
- **DS OS** (`platform/`): CRM interno completo — pipeline comercial de 8 etapas, com automação Negócio Fechado-Ganho → Obra criada automaticamente. Testado de ponta a ponta nesta auditoria (ver secção de testes do relatório final). Já pronto para uso diário, sem depender de nenhuma integração externa.

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
