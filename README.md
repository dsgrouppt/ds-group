# DS Group

Repositório central da DS Group — empresa-mãe, com a DS Projects como
primeira empresa operacional. Ver [`brand/brand-book.md`](./brand/brand-book.md)
para o posicionamento e ADN da marca antes de alterar qualquer coisa aqui.

## Estrutura

```
ds-group/
├── website/          → Website institucional (Next.js 14, App Router, TS, Tailwind)
├── landing-pages/     → Modelos de landing page para campanhas pagas
├── crm/               → Especificação técnica do CRM (schema pronto para HubSpot)
├── docs/               → Documentação estratégica e operacional
├── brand/              → Brand Book, conceitos de logótipo, tokens de marca
└── automations/         → Automações de CRM/marketing (workflows, sequências de email)
```

## Por onde começar

| Preciso de... | Ir para |
|---|---|
| Correr o website localmente | [`website/README.md`](./website/README.md) |
| Perceber o posicionamento e regras de marca | [`brand/brand-book.md`](./brand/brand-book.md) |
| Configurar o CRM (HubSpot) | [`crm/README.md`](./crm/README.md) |
| Ver o processo comercial e scripts | [`docs/sistema-comercial.md`](./docs/sistema-comercial.md) |
| Criar uma landing page de campanha | [`landing-pages/README.md`](./landing-pages/README.md) |
| Ver o plano de marketing e conteúdos | [`docs/estrategia-marketing.md`](./docs/estrategia-marketing.md) |
| Ver todas as automações previstas | [`automations/README.md`](./automations/README.md) |

## Estado do projeto (plano técnico do CTO)

- [x] **Fase 1** — Repositório GitHub, estrutura do projeto, build sem erros
- [ ] **Fase 2** — Deploy Vercel, domínio `dsprojects.pt`, HTTPS
- [ ] **Fase 3** — Cloudflare (DNS, cache, segurança)
- [ ] **Fase 4** — HubSpot Forms API em produção + teste de submissão real
- [ ] **Fase 5** — Google Tag Manager, GA4, Meta Pixel, Search Console

Cada fase é fechada com commit próprio e aprovação antes de avançar — ver
histórico de commits para o detalhe de cada uma.

## Princípio de organização

Este repositório separa deliberadamente **estratégia** (`docs/`, `brand/`)
de **implementação técnica** (`website/`, `crm/`, `automations/`,
`landing-pages/`). Antes de tomar qualquer decisão técnica nova, confirmar
que está alinhada com `docs/indice-geral-e-framework-decisao.md` — em
particular o critério: *"Esta decisão ajuda a construir uma empresa de
milhões de euros?"*
