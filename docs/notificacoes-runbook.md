# Runbook — Notificações por Email (Fase 4, doc 05 §7.4)

Última implementação: 2026-08-12. Decisão de negócio (Diogo, 2026-08-12): email nativo no DS OS via Resend, sem HubSpot — ver histórico da missão CTO para o porquê (conta HubSpot em Free, Workflows exigem Sales Hub Professional ~€85-95/utilizador/mês, e o DS OS não tinha nenhuma ligação técnica ao HubSpot mesmo para email transacional).

## 1. O que está implementado

- `src/lib/email.ts` — wrapper de envio via [Resend](https://resend.com). Opcional por variável de ambiente (`RESEND_API_KEY`) — sem ela definida, a aplicação funciona normalmente e cada tentativa de envio fica só registada em log (`[email] RESEND_API_KEY não configurada...`), nunca um erro fatal. Mesmo padrão já usado no `website/` para Meta Pixel/GA4.
- `src/lib/notifications.ts` — templates e lógica de disparo para os 7 tipos de alerta pedidos:
  - `LEAD_NOVO` — ao criar um negócio (imediato, hook em `createDeal`).
  - `PROPOSTA_ENVIADA` / `PROPOSTA_ACEITE` / `PROPOSTA_RECUSADA` — ao mudar de etapa (imediato, hook em `advanceDealStage`).
  - `SLA_RISCO` / `SLA_VIOLADO` — tarefa "Primeiro Contacto" a expirar em ≤10 min / já expirada (verificação periódica).
  - `FOLLOWUP_DUE` — tarefa de follow-up (D+1..D+21) com prazo já chegado (verificação periódica).
- Modelo `Notification` (schema.prisma) — regista cada alerta de facto enviado, usado só para idempotência (nunca duplicar o mesmo alerta). Sem relação FK a Task/Deal, deliberadamente leve.
- `POST /api/internal/notifications-check` — endpoint interno, protegido por token partilhado (`NOTIFICATIONS_INTERNAL_TOKEN`), que corre a verificação periódica (SLA + follow-up). Mesmo padrão de autenticação já usado em `/api/internal/uploads-backup` (ver `docs/backup-runbook.md`) — chamado máquina-a-máquina, nunca por um browser; `middleware.ts` já deixa `/api/internal/*` passar sem sessão.

Todas as notificações são internas (para a equipa comercial — o `assignee`/`owner` do negócio), não para o cliente final. Os 12 scripts do doc 05 §6 são citados/resumidos dentro dos emails internos como sugestão de ação, não enviados automaticamente ao cliente — essa extensão (email/WhatsApp diretamente ao cliente) fica para decisão futura, dado implicar consentimento RGPD explícito que ainda não foi definido.

## 2. Variáveis de ambiente necessárias (produção, serviço `ds-os-platform`)

| Variável | Obrigatória para | Valor |
|---|---|---|
| `RESEND_API_KEY` | Envio real de emails | Gerada na conta Resend do Diogo — ver secção 3 |
| `EMAIL_FROM` | Remetente | Ex.: `DS OS <notificacoes@dsprojects.pt>` — exige o domínio verificado na Resend |
| `NOTIFICATIONS_INTERNAL_TOKEN` | Autenticar o cron da verificação periódica | Gerado uma única vez (`openssl rand -hex 32` ou equivalente), igual em `ds-os-platform` e no novo serviço de cron (secção 4) |

Sem `RESEND_API_KEY`: a aplicação continua 100% funcional, só as notificações não são enviadas (modo simulação, registado em log).

## 3. O que falta para envio real (ação do Diogo)

1. Criar conta em [resend.com](https://resend.com) (tier gratuito cobre até 3.000 emails/mês / 100 por dia — mais do que suficiente para o volume atual).
2. Verificar um domínio de envio (ex.: `dsprojects.pt` ou um subdomínio como `mail.dsprojects.pt`) — a Resend fornece registos DNS (SPF/DKIM) para adicionar no gestor de DNS do domínio.
3. Gerar uma API Key na Resend.
4. Definir `RESEND_API_KEY` e `EMAIL_FROM` no serviço `ds-os-platform` no Railway (Settings → Variables) — pode ser feito diretamente pelo Diogo, ou fornecida ao CTO para definir via Railway.

## 4. Verificação periódica — serviço de cron dedicado

Réplica do padrão já usado no serviço `postgres` (backup diário, ver `docs/backup-runbook.md`), mas com frequência muito maior (SLA de 15 min exige verificação a cada poucos minutos, não uma vez por dia):

- Novo serviço Railway (imagem `alpine:latest`), cron a cada 5 minutos (mínimo permitido pela Railway).
- Comando: instala `curl` (imagem alpine não o inclui por omissão) e chama o endpoint interno via rede privada da Railway.
- Variável necessária nesse serviço: `NOTIFICATIONS_INTERNAL_TOKEN` (mesmo valor que em `ds-os-platform`).

## 5. Testado localmente (Postgres real, embedded-postgres)

Teste funcional ponta-a-ponta (`test-fase4.mjs`, não commitado — só local) com chamadas reais à Resend interceptadas (sem gastar quota nem exigir credenciais):

- Tarefa "Primeiro Contacto" com prazo há 20 min → `SLA_VIOLADO` gerado corretamente.
- Tarefa "Primeiro Contacto" a expirar em 5 min → `SLA_RISCO` gerado corretamente.
- Tarefa "Follow-up D+1" com prazo já passado → `FOLLOWUP_DUE` gerado corretamente.
- Tarefa "Primeiro Contacto" ainda a 1h do prazo → nenhuma notificação (correto).
- 2ª execução da verificação periódica sobre os mesmos dados → zero notificações novas (idempotência confirmada, sem duplicados).
- `notifyLeadNovo`, `notifyPropostaEnviada`, `notifyPropostaAceite`, `notifyPropostaRecusada` chamados diretamente → todos marcados como enviados, com destinatário e remetente corretos no payload enviado à API da Resend.
- Sem `RESEND_API_KEY` definida (processo à parte, arranque limpo) → `sent=false`, `reason="resend_nao_configurado"`, sem exceção.

Todos os casos passaram. `tsc --noEmit`, `next lint` e `next build` também sem erros com o código desta fase incluído.

**Ainda por fazer**: um teste ponta-a-ponta com a conta Resend real do Diogo (envio real, não interceção local) — depende da secção 3 estar concluída.

## 6. Nota sobre o `Dockerfile` — `npm install` em vez de `npm ci`

Ver comentário no próprio `Dockerfile` (stage `deps`). Resumo: o fluxo de publicação desta missão é feito via upload manual pela interface web do GitHub (sem acesso de push/git direto), o que torna impraticável publicar o `package-lock.json` inteiro (250KB+) só para refletir a dependência nova `resend`. Trocado `npm ci` por `npm install`, que resolve e atualiza o lockfile dentro da própria imagem em build time — com a mesma garantia de reprodutibilidade, porque todas as versões em `package.json` são fixas (sem `^`/`~`). Validado localmente: `npm install --ignore-scripts` a partir do `package-lock.json` antigo mais o `package.json` novo instala corretamente a versão exata pedida de `resend`.
