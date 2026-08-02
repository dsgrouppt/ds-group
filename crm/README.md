# CRM — DS Group / DS Projects

Especificação técnica do CRM (schema pronto para importar via API/UI do
HubSpot ou equivalente). A justificação de negócio de cada campo, estado e
automação está em [`../docs/crm-especificacao.md`](../docs/crm-especificacao.md) — este
diretório contém apenas a representação técnica, machine-readable.

| Ficheiro | Conteúdo |
|---|---|
| [`schema/contact-properties.json`](./schema/contact-properties.json) | Propriedades de contacto — os nomes de campo coincidem exatamente com os enviados por `website/src/app/api/contact/route.ts` |
| [`schema/deal-pipeline.json`](./schema/deal-pipeline.json) | As duas pipelines (Comercial e Projeto) com as respetivas etapas |
| [`schema/deal-properties.json`](./schema/deal-properties.json) | Propriedades de negócio + etiquetas (tags) |

## Estado atual

O CRM ainda **não está configurado** numa conta HubSpot real. Este schema é
o ponto de partida para essa configuração (Fase 4 do plano técnico). Depois
de criado no HubSpot:

1. Confirmar que os nomes internos das propriedades em HubSpot coincidem
   exatamente com os `name` aqui definidos (evita ter de alterar código).
2. Preencher `HUBSPOT_PORTAL_ID` e `HUBSPOT_FORM_GUID` em
   `website/.env.local` (ver `website/README.md`).
3. Configurar as automações descritas em
   [`../automations/workflows.json`](../automations/workflows.json) diretamente no HubSpot (Workflows).
