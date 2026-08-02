# DS GROUP — ESTRUTURA DE CRM

*Desenho funcional de CRM para gestão comercial e de projeto. Versão 1.0. Implementável em HubSpot, Pipedrive ou similar.*

---

## 1. Objetos Principais

O CRM organiza-se em três objetos ligados entre si: **Lead/Contacto**, **Negócio (Deal)** e **Projeto (pós-fecho)**. Um lead qualifica-se em Negócio; um Negócio fechado gera automaticamente um Projeto.

## 2. Campos — Lead / Contacto

| Campo | Tipo | Notas |
|---|---|---|
| Nome | Texto | — |
| Contacto (telefone/email) | Texto | — |
| Origem do lead | Lista | Google Ads, Meta Ads, Referência, SEO orgânico, Google Business Profile |
| Tipo de cliente | Lista | Família / Investidor / Arquiteto-parceiro |
| Tipo de projeto | Lista | Habitação / Comercial / Investimento |
| Faixa de orçamento estimado | Lista | <30k / 30-60k / 60-100k / 100k+ |
| Prazo desejado | Data/Texto | — |
| Localização do imóvel | Texto | — |
| Notas de qualificação | Texto longo | Frases exatas do cliente sobre prioridades |

## 3. Campos — Negócio (Deal)

| Campo | Tipo | Notas |
|---|---|---|
| Valor proposto | Número (€) | — |
| Margem estimada | % | Visível apenas internamente |
| Data de visita técnica | Data | — |
| Data de envio de proposta | Data | — |
| Probabilidade de fecho | % | Automática por etapa |
| Comercial responsável | Utilizador | — |
| Motivo de perda (se aplicável) | Lista | Preço, Prazo, Escolheu concorrente, Adiou projeto, Sem resposta |

## 4. Estados (Pipeline)

**Pipeline Comercial:**
1. Novo Lead
2. Qualificado
3. Visita Agendada
4. Visita Realizada
5. Proposta Enviada
6. Em Negociação
7. Fechado — Ganho
8. Fechado — Perdido

**Pipeline de Projeto (pós-fecho, novo objeto):**
1. Handover
2. Kickoff Agendado
3. Preparação
4. Execução
5. Controlo de Qualidade
6. Vistoria com Cliente
7. Entregue
8. Pós-obra / Garantia Ativa

## 5. Etiquetas (Tags)

- `VIP` — cliente investidor com potencial de projetos recorrentes
- `Referência-Arquiteto` — lead vindo de gabinete parceiro
- `Risco-Prazo` — projeto com atraso identificado, sinaliza atenção de direção
- `Risco-Financeiro` — pagamento em atraso
- `Promotor` — cliente que já deu testemunho ou referência
- `Reincidente` — segundo projeto ou mais com a DS

## 6. Automações

| Gatilho | Ação automática |
|---|---|
| Novo lead criado | Notificação ao comercial + tarefa de qualificação em 2h |
| Visita agendada | WhatsApp de confirmação automático 24h antes |
| Proposta enviada | Tarefa de follow-up automática a 48h e a 5 dias |
| 10 dias sem resposta pós-proposta | Move para "Fechado — Perdido" com tarefa de email de fecho de processo |
| Negócio marcado "Fechado — Ganho" | Cria automaticamente Projeto + tarefa de agendamento de kickoff |
| Sexta-feira, 9h (projetos em Execução) | Lembrete automático ao gestor de projeto para reporte semanal |
| Projeto entra em "Entregue" | Agenda tarefa de pedido de testemunho a 15 dias e pedido de referência a 30 dias |
| Etiqueta `Risco-Prazo` aplicada | Notifica diretor de operações |

## 7. Indicadores (Dashboard)

**Comercial:**
- Taxa de conversão por etapa do funil
- Tempo médio de resposta a novo lead
- Taxa de conversão por origem de lead (ROI de marketing)
- Valor médio de negócio fechado
- Motivo de perda mais frequente

**Operacional:**
- Nº de projetos ativos
- % de projetos dentro do prazo
- % de projetos dentro do orçamento
- Tempo médio de vistoria a entrega final

**Financeiro:**
- Receita faturada no mês
- Margem bruta média
- Pipeline previsto (valor ponderado por probabilidade)

**Marca/Satisfação:**
- Net Promoter Score pós-obra
- Nº de testemunhos e referências gerados por mês
- Nº de clientes reincidentes

---

*Próximo documento: 08_Estrategia_Marketing.md*
