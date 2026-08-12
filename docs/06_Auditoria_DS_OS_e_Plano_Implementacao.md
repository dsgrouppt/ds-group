# AUDITORIA DS OS — ANTES DE IMPLEMENTAR O PROCESSO COMERCIAL

Auditoria real, não estimada. Fonte: repositório `dsgrouppt/ds-group` (branch `master`), módulo `platform/` (Next.js 14 + Prisma + PostgreSQL), mais o estado ao vivo do deployment de produção.

**Confirmação de que o DS OS está em produção agora:** serviço `ds-os-platform` no Railway (projeto `dynamic-tenderness`, workspace `dsgrouppt`), domínio `os.dsprojects.pt`, último deploy hoje às 17:15, logs de arranque confirmam `"The database is already in sync with the Prisma schema"` — ou seja, é uma base de dados Postgres real, viva, com o schema atual aplicado. Isto não é um protótipo — qualquer alteração ao schema é uma alteração a um sistema em produção.

---

## DESCOBERTA IMPORTANTE ANTES DO MAPA

O repositório já tem **dois documentos de processo comercial anteriores**, escritos antes desta conversa:

- `docs/crm-especificacao.md` (v1.0) — desenho de CRM com pipeline, tags, automações e SLA de **2h para qualificação**.
- `docs/sistema-comercial.md` (v1.0) — processo comercial ponta a ponta com scripts, cadência de follow-up em **24h / 48h / 5 dias / 10 dias** (diferente da cadência D+1/D+3/D+7/D+14/D+21 que defini no documento 05).

O schema Prisma atual (`Deal.stage`) foi construído **alinhado com `crm-especificacao.md`**, não com o documento que eu (Diretor Comercial) escrevi depois. Ou seja: existe uma segunda fonte de verdade no próprio código, mais antiga que a minha.

**Trato o documento `05_Processo_Comercial_Operacional_DS.md` como a versão que prevalece**, porque foi construído com os valores definitivos que aprovaste (área de atuação, faixas de orçamento, condições de pagamento, garantia). Mas isto precisa da tua confirmação explícita antes de o CTO tocar em código — ver secção "Decisão necessária" no fim. Sem isso, o CTO fica com dois SLAs e duas cadências de follow-up diferentes escritas no mesmo repositório.

---

## O MAPA: EXISTE → REUTILIZAR / PARCIAL → ALTERAR / NÃO EXISTE → CONSTRUIR

### 1. CRM (pipeline comercial)
**EXISTE → REUTILIZAR, quase por completo.** O modelo `Deal` já tem um pipeline de 8 etapas (`NOVO_LEAD → QUALIFICADO → VISITA_AGENDADA → VISITA_REALIZADA → PROPOSTA_ENVIADA → EM_NEGOCIACAO → FECHADO_GANHO → FECHADO_PERDIDO`), com `source`, `projectType`, `budgetRange`, `amount`, `probability`, `lossReason`, `owner`. As minhas 10 etapas do documento 05 mapeiam quase 1:1 para aqui — a etapa "Execução" e "Pós-Venda" já existem, só que no modelo `Project` (ver ponto 3), não no `Deal`, o que é arquitetonicamente melhor do que eu tinha assumido.

**PARCIAL → ALTERAR:** falta o **score de qualificação** (0-10, os 5 critérios do documento 05) como campo estruturado — hoje `QUALIFICADO` é só um estado, sem pontuação nem categoria (fraco/potencial/qualificado/prioritário) guardada.

### 2. Clientes
**EXISTE → REUTILIZAR.** Modelo `Client` completo: nome, email, telefone, tipo (Família/Investidor/Arquiteto-parceiro), localização, notas, tags, e já tem um **Portal do Cliente** próprio (login separado, mensagens, documentos, fotos, cronograma, pagamentos) — mais avançado do que eu previa. Nada a construir aqui.

### 3. Obras
**EXISTE → REUTILIZAR.** Modelo `Project`, pipeline de 8 etapas (`HANDOVER → KICKOFF_AGENDADO → PREPARACAO → EXECUCAO → CONTROLO_QUALIDADE → VISTORIA_CLIENTE → ENTREGUE → POS_OBRA_GARANTIA`) — cobre exatamente as minhas etapas 1.9 (Execução) e 1.10 (Pós-Venda), com mais detalhe do que eu tinha desenhado.

### 4. Leads
**EXISTE → REUTILIZAR** (um lead é um `Deal` em estado `NOVO_LEAD`, ligado a um `Client`). **PARCIAL → ALTERAR:** falta um campo `firstContactAt` (ou equivalente) para medir o SLA de resposta — hoje não há como saber, a partir da base de dados, quanto tempo passou entre a criação do lead e o primeiro contacto real.

### 5. Contactos (tentativas de contacto)
**NÃO EXISTE enquanto histórico estruturado.** Hoje só há `ActivityLog` genérico (ação/entidade/data) e comentários de tarefa. Para implementar o SLA de 6 tentativas em 3 dias (secção 2 do documento 05) é preciso decidir: reaproveitar `ActivityLog` com uma ação nova (`CONTACT_ATTEMPT`), ou criar um modelo dedicado. Recomendo ao CTO reaproveitar `ActivityLog` — é mais leve e já está indexado por entidade.

### 6. Notificações
**NÃO EXISTE.** Confirmado por código e por `docs/integracoes-estado.md`: não há email transacional (nem Resend, nem Postmark, nem SMTP), não há WhatsApp Business API, não há push nem in-app notifications. Isto é o maior espaço em branco do pedido — os scripts de WhatsApp/email do documento 05 (secção 6) não têm hoje nenhum canal automático para serem disparados; teriam de ser copiados manualmente pelo comercial até isto ser construído.

### 7. Tarefas
**EXISTE → REUTILIZAR.** Modelo `Task` completo (`status`, `priority`, `dueAt`, `assignee`, `comments`, ligação a `Deal`/`Project`) — é exatamente a peça que falta para materializar o SLA e a cadência de follow-up. **O que falta não é o modelo, é a automação que cria as tarefas** (ver ponto 11).

### 8. Estados
**EXISTE → REUTILIZAR.** Todos os enums (`DEAL_STAGE_ORDER`, `PROJECT_STAGE_ORDER`, `TASK_STATUS`, `TASK_PRIORITY`, `LOSS_REASON`) já estão centralizados em `lib/enums.ts`, com rótulos em português, e servem de fonte única de verdade tanto para validação (Zod) como para a interface. **PARCIAL → ALTERAR:** `LOSS_REASON` tem hoje `PRECO/PRAZO/CONCORRENTE/ADIOU/SEM_RESPOSTA` — falta `FORA_DE_AMBITO` e `OUTRO`, que o documento 05 pede.

### 9. Dashboards
**PARCIAL → ALTERAR/EXPANDIR.** Já existe um dashboard central (`app/(app)/page.tsx`) com: negócios abertos, obras ativas, nº de clientes, pipeline ponderado por probabilidade, tarefas pendentes/urgentes, próximos eventos, faturado no mês, deals ganhos/perdidos, leads por origem. Cobre uma parte real dos KPIs do documento 05. **Falta:** taxa de contacto, taxa de conversão por etapa do funil, tempo médio até primeira resposta, tempo médio até fecho, ticket médio — todos calculáveis a partir dos campos existentes + os dois campos novos do ponto 4.

### 10. Permissões (RBAC)
**EXISTE → REUTILIZAR, sem alterações.** `lib/permissions.ts` já tem uma matriz robusta por módulo/ação e 7 papéis (incluindo `COMERCIAL`), com o módulo `crm` já corretamente restrito. Nenhuma mudança de permissões é necessária para esta implementação — importante, porque significa que não há risco de RBAC nesta entrega.

### 11. Automações
**QUASE NÃO EXISTE — é o núcleo real do trabalho.** Hoje existe **exactamente uma** automação de facto implementada: `Deal` → `FECHADO_GANHO` cria automaticamente o `Project` correspondente (dentro de uma transação, já testada e corrigida de um bug real de integridade — ver comentário no código, "Bug #11"). Tudo o resto descrito em `crm-especificacao.md §6` (tarefa de qualificação automática, confirmação de visita, follow-up automático, reativação de perdidos) **está documentado mas nunca foi implementado em código**. Isto é o que dá corpo real ao SLA e à cadência de follow-up do documento 05.

---

## RESUMO DO MAPA

| Dimensão | Estado |
|---|---|
| CRM (pipeline) | EXISTE — reutilizar (falta só score de qualificação) |
| Clientes | EXISTE — reutilizar |
| Obras | EXISTE — reutilizar |
| Leads | EXISTE — reutilizar (falta campo de SLA) |
| Contactos (tentativas) | NÃO EXISTE — construir (leve, reaproveitando ActivityLog) |
| Notificações | NÃO EXISTE — construir (o maior gap) |
| Tarefas | EXISTE — reutilizar |
| Estados | EXISTE — reutilizar (falta 2 valores em LOSS_REASON) |
| Dashboards | PARCIAL — expandir, não recriar |
| Permissões/RBAC | EXISTE — nenhuma alteração necessária |
| Automações | QUASE NÃO EXISTE — construir (núcleo do trabalho) |

**Conclusão prática:** a arquitetura de dados já suporta ~70% do documento 05 sem qualquer alteração. O trabalho real de implementação concentra-se em três coisas: (1) dois campos novos + dois valores de enum, (2) a camada de automação que hoje não existe (criar tarefas automaticamente em cada gatilho do funil), (3) decidir e ligar um canal de notificação real (email e/ou WhatsApp) — sem isto, os scripts do documento 05 continuam a ser copiados à mão.

---

## PLANO DE IMPLEMENTAÇÃO INCREMENTAL (para o CTO executar, não eu)

Ordem pensada para nunca deixar a produção num estado inconsistente — cada fase é independente e reversível:

**Fase 1 — Schema (baixo risco, aditivo, sem remover nada):**
- `Deal`: adicionar `qualificationScore Int?`, `qualificationCategory String?`, `firstContactedAt DateTime?`.
- `LOSS_REASON`: adicionar `FORA_DE_AMBITO`, `OUTRO`.
- Migração aditiva — não quebra dados existentes, não afeta o Portal do Cliente nem o RBAC.

**Fase 2 — Automação de tarefas (o núcleo):**
- Ao criar `Deal`: criar `Task` "Primeiro Contacto" com `dueAt` calculado pelo SLA (secção 2 do documento 05).
- Ao mover para `PROPOSTA_ENVIADA`: criar as 5 `Task` de follow-up (D+1/D+3/D+7/D+14/D+21) — mesmo padrão transacional já usado em `advanceDealStage` para Fechado-Ganho → Obra.
- Ao mover para `FECHADO_PERDIDO`: exigir `lossReason` preenchido; se motivo elegível, agendar `Task` de reativação a 45/90/180 dias.

**Fase 3 — Dashboard:**
- Adicionar os 5 KPIs em falta (taxa de contacto, conversão por etapa, tempo até resposta, tempo até fecho, ticket médio) à página existente — extensão, não reconstrução.

**Fase 4 — Notificações (depende de decisão de fornecedor, já sinalizada em `docs/integracoes-estado.md`):**
- Decidir fornecedor de email (Resend/Postmark) e, separadamente, se/quando ligar WhatsApp Business API.
- Só depois disto os 12 scripts do documento 05 podem disparar automaticamente — até lá, ficam como templates de referência para uso manual pela equipa comercial.

**Fase 5 — Reconciliação de documentação:**
- Atualizar/arquivar `crm-especificacao.md` e `sistema-comercial.md` para não conviverem no repositório com parâmetros diferentes dos aprovados no documento 05.

---

## DECISÃO NECESSÁRIA ANTES DE EXECUTAR

Cheguei ao limite do que faço como Diretor Comercial. Esta auditoria foi possível porque tenho acesso de leitura ao repositório e à infraestrutura (Railway) ligados a esta conversa — mas escrever schema, migrações e automações contra uma base de dados de produção real é trabalho de engenharia, não comercial. É exatamente a fronteira que defini no meu próprio mandato: nunca altero código.

Preciso que decidas duas coisas antes de qualquer execução:

1. **Confirmas que o documento 05 (SLA 15min/2h, cadência D+1 a D+21, faixas de orçamento e condições de pagamento aprovadas) substitui `crm-especificacao.md` e `sistema-comercial.md` como fonte de verdade?** Se sim, o CTO atualiza esses ficheiros como parte da Fase 5.
2. **Quem executa as Fases 1-5 acima:** o chat/sessão do CTO (com o mesmo nível de acesso técnico que usei aqui para auditar, mas com mandato para escrever código), ou queres que eu continue a coordenar a partir daqui? Dado que é produção real com dados reais, recomendo que seja feito através do fluxo normal de código do CTO (branch, revisão, deploy) — não diretamente contra a base de dados de produção a partir desta conversa.
