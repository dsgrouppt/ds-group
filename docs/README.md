# Documentação — DS Group / DS Projects

Índice da documentação estratégica e operacional do grupo. Ver também
[`/brand`](../brand) (identidade de marca) e [`/crm`](../crm) (especificação
técnica do CRM).

### Comece por aqui

| Documento | Conteúdo |
|---|---|
| [`checklist-lancamento-v1.md`](./checklist-lancamento-v1.md) | **Comece aqui.** Checklist único e acionável de tudo o que falta para lançar a v1.0 — só decisões de negócio/infraestrutura, zero código pendente |
| [`indice-geral-e-framework-decisao.md`](./indice-geral-e-framework-decisao.md) | Visão consolidada do projeto + critério de decisão do grupo |

### Estratégia e negócio

| Documento | Conteúdo |
|---|---|
| [`arquitetura-website.md`](./arquitetura-website.md) | Mapa do site, páginas, CTAs, SEO, funil de conversão (plano original — ver nota no topo do documento sobre o que evoluiu) |
| [`manual-operacional.md`](./manual-operacional.md) | Processos por departamento, checklists, fluxogramas |
| [`sistema-comercial.md`](./sistema-comercial.md) | Processo de venda ponta a ponta, scripts por canal |
| [`crm-especificacao.md`](./crm-especificacao.md) | Campos, estados, etiquetas, automações, indicadores (ver implementação técnica em `/crm`) |
| [`estrategia-marketing.md`](./estrategia-marketing.md) | Canais pagos/orgânicos, plano de conteúdos de 12 meses |
| [`documentos-internos.md`](./documentos-internos.md) | Contrato-tipo, checklists, modelos de orçamento/proposta/email |

### Playbooks operacionais (uso recorrente, dia a dia)

| Documento | Conteúdo |
|---|---|
| [`playbook-utilizacao-ds-os.md`](./playbook-utilizacao-ds-os.md) | Guia prático de utilização do DS OS, módulo a módulo — inclui o novo "Site — Portefólio" |
| [`playbook-fotografia.md`](./playbook-fotografia.md) | O que fotografar por obra, quantidade, orientação, nomenclatura — para encaixar direto no sistema de portefólio |
| [`playbook-video.md`](./playbook-video.md) | Vídeos horizontais/verticais/drone, especificação do vídeo de fundo da Hero |
| [`playbook-seo.md`](./playbook-seo.md) | Ações recorrentes de SEO — publicar artigo, nova área geográfica, cadência |
| [`playbook-redes-sociais.md`](./playbook-redes-sociais.md) | O que publicar, onde, com que cadência, como reaproveitar o portefólio |
| [`protocolo-producao-obras.md`](./protocolo-producao-obras.md) | Pipeline exato de processamento de obras reais, lote a lote, do ficheiro bruto à publicação |

### Técnico e infraestrutura

| Documento | Conteúdo |
|---|---|
| `DS_OS_MASTER_HANDOVER_PART1.md`, `PART2.md`, `PART3.md` | Handover técnico completo do DS OS, escrito para outro CTO nunca ter visto o projeto |
| [`plataforma-arquitetura.md`](./plataforma-arquitetura.md) | Arquitetura técnica do DS OS (ERP+CRM) |
| [`manual-tecnico-operacoes.md`](./manual-tecnico-operacoes.md) | Instalação, deploy, backups, recuperação — website + platform |
| [`producao.md`](./producao.md) | Preparação para produção: base de dados, variáveis de ambiente, storage |
| [`backup-runbook.md`](./backup-runbook.md) | Runbook de backups e restauro (BD + uploads) |
| [`comparacao-hosting.md`](./comparacao-hosting.md) | Comparação de hosting/deploy para website, platform, BD e uploads |
| [`website-cms-integracao.md`](./website-cms-integracao.md) | Desenho do CMS interno (DS OS → Website): como funciona, decisões e o que falta ativar |
| [`arquitetura-seo.md`](./arquitetura-seo.md) | Arquitetura técnica de SEO já implementada no website |
| [`auditoria-concorrencia-seo.md`](./auditoria-concorrencia-seo.md) | Auditoria de concorrência e estratégia SEO |
| [`integracoes-estado.md`](./integracoes-estado.md) | Estado real de cada integração (Meta Pixel, GA4, HubSpot, CRM, CMS interno, Portal do Cliente...) |

### Auditorias e relatórios (histórico)

| Documento | Conteúdo |
|---|---|
| [`relatorio-final-cto.md`](./relatorio-final-cto.md) | Auditoria completa pré-produção (website + platform + infra) |
| [`relatorio-segunda-ronda.md`](./relatorio-segunda-ronda.md) | Segunda ronda de auditoria — lacunas e problemas novos |
| [`auditoria-fase1-website.md`](./auditoria-fase1-website.md) | Auditoria técnica do website, Fase 1 |
| [`auditoria-tech-lead.md`](./auditoria-tech-lead.md) | Auditoria de segurança/performance/código do DS OS |

A identidade de marca (Brand Book, conceitos de logótipo, identidade DS
Projects) vive em [`/brand`](../brand) — não neste diretório — para ficar
junto dos ativos técnicos de marca (tokens de cor/tipografia) que o código
consome diretamente.
