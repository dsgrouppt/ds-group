# Automações — DS Group / DS Projects

| Ficheiro | Conteúdo |
|---|---|
| [`workflows.json`](./workflows.json) | Lista de automações a configurar no CRM (gatilho → ação), com estado atual de cada uma |
| [`email-sequences/lead-nurture.md`](./email-sequences/lead-nurture.md) | Sequência de nutrição para leads qualificados sem visita agendada |
| [`email-sequences/post-project-referral.md`](./email-sequences/post-project-referral.md) | Sequência pós-entrega: testemunho, referência, relação a longo prazo |

## Estado atual

Nenhuma automação está ainda ativa — todas dependem da conta HubSpot estar
configurada (ver `/crm`) e, no caso do WhatsApp, de uma integração adicional
(WhatsApp Business API ou Twilio) ainda por decidir. `workflows.json` marca
o estado de cada automação individualmente.

## Automação já implementada em código

A única automação já **funcional** hoje é a submissão do formulário do
website para o HubSpot Forms API — ver
`website/src/app/api/contact/route.ts`. Todas as restantes automações desta
pasta são configuração a fazer diretamente na plataforma de CRM, não código.
