# PROCESSO COMERCIAL OPERACIONAL — DS REMODELAÇÕES → DS PROJECTS

Documento produzido pelo Diretor Comercial. Desenhado para ser implementado já na operação atual (DS Remodelações) e transferido sem alterações estruturais para a DS Projects após o rebranding — só nomes/documentos visuais mudam, o sistema mantém-se.

Onde a informação depende de uma decisão da empresa que não me foi dada (preços, condições de pagamento reais, horário de funcionamento, política de garantia), está marcado como **[DECISÃO NECESSÁRIA]**. Tudo o resto é o desenho do processo, que é da minha responsabilidade propor.

---

## 1. PIPELINE DO CRM

Dez etapas. Uma obra só avança de etapa quando cumpre a condição de saída — nunca "mais ou menos".

### 1.1 Novo Lead
- **Objetivo:** registar todo o contacto recebido, sem exceção, antes de qualquer avaliação.
- **Condição de entrada:** contacto chegou por qualquer canal (formulário site, telefone, WhatsApp, Instagram/Facebook, referência, Google Business).
- **Condição de saída:** primeiro contacto foi tentado (ligação, WhatsApp ou email) dentro do SLA. Não sai por qualificação — só por tentativa de contacto feita.
- **Informação obrigatória:** nome, contacto (telefone/email), canal de origem, data/hora de entrada, mensagem inicial (se houver).
- **Próxima ação:** disparo automático de tarefa "Primeiro Contacto" (ver secção 2 — SLA).

### 1.2 Qualificação
- **Objetivo:** determinar se o lead tem perfil para a DS (localização, tipo de obra, orçamento realista, decisor, urgência).
- **Condição de entrada:** primeiro contacto foi feito e o lead respondeu (ou foi possível recolher os dados mínimos por telefone).
- **Condição de saída:** score de qualificação atribuído (ver secção 3) e categoria definida (fraco / potencial / qualificado / prioritário).
- **Informação obrigatória:** localização da obra, tipo de obra, orçamento estimado do cliente (mesmo que aproximado), prazo pretendido, quem decide, urgência declarada.
- **Próxima ação:** lead fraco → arquivar com tag de motivo; lead potencial/qualificado/prioritário → agendar visita.

### 1.3 Contacto (agendamento de visita)
- **Objetivo:** marcar visita técnica ao local da obra.
- **Condição de entrada:** lead qualificado como potencial, qualificado ou prioritário.
- **Condição de saída:** visita agendada com data, hora e responsável definidos, e confirmada com o cliente.
- **Informação obrigatória:** morada exata da obra, data/hora da visita, quem vai à visita, telefone direto do cliente.
- **Próxima ação:** enviar confirmação de visita (script 4) 24h antes.

### 1.4 Visita / Orçamento
- **Objetivo:** avaliar a obra no local e recolher tudo o que é necessário para orçamentar com rigor.
- **Condição de entrada:** visita realizada.
- **Condição de saída:** visita concluída, com levantamento de medidas/âmbito registado e reunião interna de orçamentação agendada ou feita.
- **Informação obrigatória:** âmbito real observado no local, fotos, medidas, condicionantes (prazos do cliente, acessos, estado atual), orçamento que o cliente tem em mente (confirmado ou ajustado após visita).
- **Próxima ação:** preparar proposta — prazo interno máximo definido em **[DECISÃO NECESSÁRIA]** (recomendação: 5 dias úteis para obra de remodelação completa).

### 1.5 Proposta Enviada
- **Objetivo:** apresentar proposta formal, estruturada conforme secção 4.
- **Condição de entrada:** proposta preparada e validada internamente.
- **Condição de saída:** proposta entregue ao cliente (email + chamada de acompanhamento, nunca só email frio) e confirmação de receção obtida.
- **Informação obrigatória:** valor proposto, data de envio, canal de envio, validade da proposta, quem enviou.
- **Próxima ação:** iniciar cadência de follow-up (secção 5), dia D+1.

### 1.6 Negociação
- **Objetivo:** responder a objeções, ajustar âmbito se necessário, sem desvalorizar a proposta pelo preço.
- **Condição de entrada:** cliente reagiu à proposta (dúvida, pedido de ajuste, objeção, comparação com concorrência).
- **Condição de saída:** cliente aceita (verbalmente ou por escrito) ou desiste de forma explícita.
- **Informação obrigatória:** natureza da objeção, ajustes propostos (se houver), nova versão da proposta (se aplicável).
- **Próxima ação:** se aceite → Fechado Ganho; se recusa definitiva → Fechado Perdido; se silêncio → mantém-se em Negociação sob a cadência de follow-up.

### 1.7 Fechado Ganho
- **Objetivo:** confirmar formalmente o negócio e preparar arranque de obra.
- **Condição de entrada:** cliente aceitou a proposta.
- **Condição de saída:** contrato assinado e sinal/condições iniciais de pagamento cumpridas **[DECISÃO NECESSÁRIA — condições de sinal/adjudicação]**.
- **Informação obrigatória:** contrato assinado, valor final acordado, data prevista de início, condições de pagamento acordadas.
- **Próxima ação:** transferir para Execução; agendar reunião de arranque de obra.

### 1.8 Fechado Perdido
- **Objetivo:** registar o motivo real da perda, para aprendizagem e para eventual recuperação futura.
- **Condição de entrada:** cliente recusou de forma explícita, ou lead ficou sem resposta além do limite definido na secção 2.
- **Condição de saída:** não sai — é estado terminal, exceto se reativado manualmente (ver Recuperação, secção 5).
- **Informação obrigatória:** motivo de perda (tag obrigatória: preço, prazo, escolheu concorrente, adiou projeto, sem resposta, fora de âmbito, outro).
- **Próxima ação:** entra em lista de recuperação passados 3 a 6 meses, conforme o motivo.

### 1.9 Execução
- **Objetivo:** acompanhar comercialmente a obra em curso (não é gestão de obra — é garantir que a experiência do cliente se mantém ao nível da promessa comercial).
- **Condição de entrada:** contrato assinado e obra iniciada.
- **Condição de saída:** obra concluída e entregue ao cliente.
- **Informação obrigatória:** ponto de situação da obra (para efeitos comerciais/relação, não técnico), eventuais desvios de âmbito ou valor acordados com o cliente.
- **Próxima ação:** agendar visita/contacto de entrega final e passar a Pós-Venda.

### 1.10 Pós-Venda
- **Objetivo:** fidelizar, obter avaliação/review e gerar recomendação ou nova oportunidade (upsell/cross-sell).
- **Condição de entrada:** obra entregue.
- **Condição de saída:** não fecha — é um estado de relação contínua; revisita-se periodicamente (recomendação: aos 30 dias, 6 meses e 1 ano).
- **Informação obrigatória:** data de entrega, satisfação registada, review pedido/obtido, potencial de nova obra ou recomendação identificado.
- **Próxima ação:** script de pedido de review (script 11) aos 15-30 dias após entrega; marcar como "cliente embaixador" se recomendar ativamente.

---

## 2. SLA DE LEADS

Numa empresa premium de remodelações, o primeiro a responder bem, ganha desproporcionalmente mais do que o seu peso relativo — isto não é opinião, é como este mercado se comporta em quase todos os setores de serviços de alto valor. O SLA reflete isso.

- **Tempo máximo para primeiro contacto:** 15 minutos em horário laboral; máximo 2 horas fora desse intervalo mas ainda no mesmo dia útil. Lead recebido depois das 18h ou fim de semana → contacto até às 10h do dia útil seguinte.
- **Número de tentativas:** mínimo 6 tentativas distribuídas em 3 dias corridos, antes de classificar como "sem resposta". Nunca 6 tentativas no mesmo dia — isso é pressão, não persistência.
  - Dia 1: telefone (2x, com intervalo de pelo menos 2h) + WhatsApp.
  - Dia 2: telefone (1x) + WhatsApp/SMS.
  - Dia 3: telefone (1x) + email formal + WhatsApp final.
- **Canais a utilizar:** telefone é sempre a primeira tentativa (maior taxa de resposta e maior sinal de profissionalismo). WhatsApp como reforço imediato. Email só a partir da 2ª tentativa em diante, nunca como único canal.
- **Fora de horário:** resposta automática (WhatsApp/email) a confirmar receção e prazo de resposta ("Recebemos o seu pedido. Vamos entrar em contacto até às [hora] de amanhã."). Nunca deixar um lead sem qualquer confirmação de receção, mesmo que o contacto humano só aconteça depois.
- **Horário de funcionamento comercial:** **[DECISÃO NECESSÁRIA]** — assumido dias úteis, período laboral padrão, a confirmar.
- **Prioridade de leads:** ordenada pelo score de qualificação (secção 3), não pela ordem de chegada. Um lead prioritário que chega às 17h55 tem precedência sobre um lead fraco que chegou às 9h.
- **Quando um lead passa a "sem resposta":** após as 6 tentativas em 3 dias sem qualquer resposta do lead. Nesse ponto move-se para Fechado Perdido com tag "sem resposta", e entra automaticamente na lista de recuperação aos 45 dias (um único contacto de reativação, não uma nova cadência completa).

---

## 3. QUALIFICAÇÃO

Sistema de pontuação simples (0 a 10), aplicado na etapa de Qualificação, com base em 5 critérios objetivos. Os valores exatos de cada critério (ex.: qual é o "orçamento mínimo aceitável") dependem de decisões de negócio que preciso de confirmar — a estrutura de pontuação está pronta, os limiares estão marcados onde aplicável.

| Critério | 0 pontos | 1 ponto | 2 pontos |
|---|---|---|---|
| **Localização** | Fora da área de atuação | Zona limítrofe/a confirmar deslocação | Dentro da área de atuação principal |
| **Tipo de obra** | Trabalho pontual/avulso (ex.: só pintura) | Remodelação parcial (1-2 divisões) | Remodelação completa/gestão integral de projeto |
| **Orçamento** | Abaixo do mínimo viável **[DECISÃO NECESSÁRIA — definir valor mínimo]** | Dentro da faixa mas ajustado/incerto | Dentro ou acima da faixa alvo, confirmado pelo cliente |
| **Prazo/urgência** | "Só a pesquisar", sem prazo | Prazo definido mas superior a 6 meses | Quer avançar nos próximos 1-3 meses |
| **Decisor** | Não é decisor e decisor não está acessível | É decisor mas a decidir em conjunto com outra pessoa não presente | É o decisor (ou casal/decisores presentes) |

**Classificação final:**
- **0–2 pontos → Lead fraco.** Arquivar com tag de motivo; não entra em visita.
- **3–5 pontos → Lead potencial.** Agendar visita, mas sem prioridade máxima de agenda.
- **6–8 pontos → Lead qualificado.** Agendar visita com prioridade normal-alta.
- **9–10 pontos → Lead prioritário.** Contacto e visita com prioridade máxima; idealmente visita em menos de 48h.

A área de atuação exata, o orçamento mínimo viável e a faixa alvo são **[DECISÃO NECESSÁRIA]** — assim que definidos, encaixam diretamente nesta tabela sem alterar a estrutura.

---

## 4. PROPOSTA COMERCIAL — ESTRUTURA OBRIGATÓRIA

Toda a proposta DS segue esta estrutura, seja em nome de DS Remodelações ou, após transição, DS Projects. O formato visual (template) é do CMO/CTO — aqui defino o conteúdo obrigatório.

1. **Capa** — logótipo, nome do projeto/cliente, morada da obra, data, número de proposta, validade. Visual alinhado com o posicionamento premium (preto/branco/grafite/dourado, sem elementos gráficos genéricos de construção).
2. **Enquadramento** — parágrafo curto, personalizado ao cliente e à obra visitada (nunca texto genérico copiado). Reforça o que a DS vende: gestão integral, tranquilidade, controlo de processo — não mão de obra.
3. **Âmbito** — descrição clara do que está incluído, dividida por espaço/divisão da obra.
4. **Trabalhos** — lista detalhada de trabalhos a executar, por especialidade (demolições, construção civil, eletricidade, canalização, acabamentos, etc.).
5. **Materiais** — materiais incluídos, com nível de acabamento especificado (ex.: "torneiras gama X" em vez de deixar em aberto — ambiguidade em materiais é a maior fonte de conflito pós-venda no setor).
6. **Exclusões** — tudo o que explicitamente não está incluído, para evitar expectativas erradas.
7. **Prazo** — duração estimada da obra e data prevista de início/fim, com nota sobre o que pode alterar o prazo.
8. **Condições de pagamento** — **[DECISÃO NECESSÁRIA]**: estrutura de sinal/faseamento a definir (ex.: % na adjudicação, % por fases, % na entrega).
9. **Validade** — prazo de validade da proposta **[DECISÃO NECESSÁRIA — recomendo 15 dias, para criar decisão atempada sem parecer urgência artificial]**.
10. **Garantias** — período e âmbito de garantia **[DECISÃO NECESSÁRIA]**.
11. **Próximos passos** — secção final curta e clara: como o cliente avança (assinatura, contacto direto do responsável, o que acontece depois de aceitar). Nunca terminar a proposta sem indicar a ação concreta seguinte.

---

## 5. FOLLOW-UP APÓS PROPOSTA

Cadência de 5 contactos ao longo de ~3 semanas. Tom sempre calmo e consultivo — nunca insistente.

| Quando | Objetivo | Canal | Condição para continuar | Condição para fechar como perdido |
|---|---|---|---|---|
| **D+1** | Confirmar que a proposta foi recebida e está clara | Telefone | Cliente atende ou responde | — (é sempre o primeiro passo) |
| **D+3** | Perceber se há dúvidas ou objeções concretas | WhatsApp + oferta de chamada | Cliente responde, mesmo que "ainda a analisar" | — |
| **D+7** | Reforçar valor (não pressionar preço), perguntar se falta alguma informação | Telefone | Cliente continua a demonstrar interesse real | Se cliente pede claramente para não ser mais contactado |
| **D+14** | Última verificação ativa — perceber se decisão está tomada, adiada ou perdida para concorrência | Telefone ou WhatsApp | Cliente ainda não decidiu mas mantém interesse | Se não há resposta a D+7 e D+14 |
| **D+21** | Encerramento formal e educado — deixar porta aberta | Email | — | Sempre fecha aqui, com tag de motivo, se não houve avanço |

Depois de D+21 sem avanço → Fechado Perdido, motivo registado, entra na lista de recuperação aos 3-6 meses (ver secção 1.8).

---

## 6. SCRIPTS COMERCIAIS

Tom em todos os scripts: calmo, direto, sem pressão, sem linguagem de desconto ou urgência artificial. Frases curtas. Nunca "promoção", "últimas vagas", "desconto especial".

### 6.1 Primeiro contacto (telefone, lead recebido via site/formulário)
> "Boa tarde, [Nome], fala [Nome do comercial] da DS Remodelações. Vi que nos contactou sobre um projeto de remodelação em [localização/tipo de obra]. Tem 2 minutos para me contar um pouco mais sobre o que tem em mente?"

Objetivo: recolher os dados de qualificação (secção 3) de forma natural, não como interrogatório.

### 6.2 Chamada após preenchimento de formulário (sem resposta ao 1º toque)
> "Boa tarde, [Nome], fala [Nome] da DS Remodelações. Tentei ligar há pouco — fico só a avisar por mensagem que vamos tentar novamente [período]. Se preferir, pode responder aqui com o melhor horário para falarmos."

### 6.3 Marcação de visita
> "Com o que me disse, faz sentido irmos ver o espaço presencialmente para lhe podermos dar um orçamento rigoroso — sem isso, qualquer valor que lhe déssemos seria uma estimativa vaga. Tem disponibilidade [dia/hora] ou [dia/hora alternativo]?"

### 6.4 Confirmação de visita (24h antes)
> "Boa tarde, [Nome]. A confirmar a nossa visita de amanhã, [hora], em [morada]. Vai estar consigo mais alguém que também decida sobre o projeto? Assim já levamos tudo preparado para a conversa."

### 6.5 Envio de proposta
> "Boa tarde, [Nome]. Acabei de enviar a proposta para o seu email, com tudo o que falámos na visita — âmbito, materiais e prazos. Vou ligar-lhe [D+1] para perceber se ficou tudo claro e responder a qualquer dúvida. Fique à vontade para me contactar antes disso, se precisar."

### 6.6 Follow-up (genérico, adaptar à etapa da cadência)
> "Boa tarde, [Nome]. Só a confirmar se teve oportunidade de rever a proposta com calma. Não é para pressionar — é só para perceber se ficou alguma dúvida em aberto que eu possa esclarecer."

### 6.7 Objeção de preço ("está caro")
> "Compreendo perfeitamente essa preocupação — é natural comparar valores. Posso explicar-lhe o que está incluído neste valor, porque normalmente a diferença não está no preço por metro quadrado, está no que fica ou não fica resolvido depois da obra estar concluída. Quer que reveja consigo item a item?"

Nunca responder à objeção de preço com desconto imediato. Responder sempre com valor/âmbito primeiro.

### 6.8 "Vou pensar"
> "Faz todo o sentido, é uma decisão importante. Só para eu perceber melhor como o posso ajudar — há algo em concreto que ainda está em dúvida? Prazo, âmbito, forma de pagamento? Às vezes ajuda falarmos sobre esse ponto específico em vez de ficar tudo em aberto."

### 6.9 "Está caro" (comparação direta com concorrência)
> "É natural pedir mais do que um orçamento, e acho bem que o faça. Só lhe pediria uma coisa: quando comparar, confirme se está a comparar o mesmo âmbito e os mesmos materiais — é aí que normalmente aparecem as diferenças que não se veem à primeira vista. Fico disponível para rever a proposta consigo se quiser comparar ponto a ponto."

### 6.10 Cliente desaparece (sem resposta após D+7/D+14)
> "Boa tarde, [Nome]. Não quero ser insistente, por isso esta é a minha última mensagem sobre esta proposta. Se o projeto ainda estiver em cima da mesa, tem toda a disponibilidade da nossa parte para retomar a conversa quando fizer sentido para si. Se entretanto decidiu seguir por outro caminho, agradeço que me diga — ajuda-me a não insistir sem necessidade."

### 6.11 Fecho
> "Fico muito contente por avançarmos. Para formalizarmos, envio-lhe o contrato para assinatura e o próximo passo é [condição de sinal — DECISÃO NECESSÁRIA]. Assim que estiver tratado, marcamos já a reunião de arranque de obra."

### 6.12 Pós-venda / pedido de review
> "Boa tarde, [Nome]. Já lá vão [X] dias desde a entrega da obra — como está a correr o dia a dia no espaço? [pausa para resposta genuína] Fico contente por saber. Se sentir que fizemos um bom trabalho, ajudava-nos imenso que deixasse uma review no Google — é o que mais pesa para as próximas famílias que estão a decidir como nós estivemos consigo."

---

## 7. IMPLEMENTAÇÃO NO DS OS

### 7.1 Campos do CRM (ficha de Lead/Cliente)

| Campo | Tipo | Obrigatório em | Notas |
|---|---|---|---|
| Nome | Texto | Novo Lead | — |
| Contacto (telefone) | Texto | Novo Lead | — |
| Email | Texto | Qualificação | — |
| Canal de origem | Lista (site, telefone, WhatsApp, Instagram, Facebook, Google Business, referência) | Novo Lead | Alimenta métricas de marketing (CMO) |
| Data/hora de entrada | Data/hora automática | Novo Lead | — |
| Localização da obra | Texto/morada | Qualificação | — |
| Tipo de obra | Lista (remodelação completa, parcial, pontual) | Qualificação | — |
| Orçamento estimado | Número/faixa | Qualificação | — |
| Prazo pretendido | Data/período | Qualificação | — |
| Decisor presente | Sim/Não | Qualificação | — |
| Score de qualificação | Número (0-10, auto-calculado pelos campos acima) | Qualificação | Ver secção 3 |
| Categoria | Auto (fraco/potencial/qualificado/prioritário) | Qualificação | — |
| Data/hora da visita | Data/hora | Contacto | — |
| Responsável pela visita | Utilizador | Contacto | — |
| Âmbito observado + fotos | Anexos/texto | Visita/Orçamento | — |
| Valor da proposta | Número | Proposta Enviada | — |
| Data de envio da proposta | Data automática | Proposta Enviada | — |
| Validade da proposta | Data (auto: envio + X dias) | Proposta Enviada | — |
| Etapa atual | Lista (as 10 etapas da secção 1) | Sempre | Campo central do pipeline |
| Motivo de perda | Lista (preço, prazo, concorrência, adiou, sem resposta, fora de âmbito, outro) | Fechado Perdido | Obrigatório para fechar como perdido |
| Data de fecho | Data automática | Fechado Ganho/Perdido | — |
| Valor final acordado | Número | Fechado Ganho | — |
| Data de entrega da obra | Data | Pós-Venda | — |
| Review pedido/obtido | Sim/Não/Link | Pós-Venda | — |
| Tags | Multi-select | Livre | Ver 7.3 |

### 7.2 Tarefas automáticas (triggers)

- **Ao criar Novo Lead** → criar tarefa "Primeiro Contacto" com prazo = 15 min (horário laboral) / próximo dia útil às 10h (fora de horário), atribuída ao comercial de plantão.
- **Ao mover para Qualificação** → criar checklist obrigatório com os 5 critérios da secção 3.
- **Ao agendar Visita** → criar tarefa "Confirmar visita" 24h antes automaticamente.
- **Ao mover para Proposta Enviada** → criar automaticamente as 5 tarefas de follow-up (D+1, D+3, D+7, D+14, D+21) com datas calculadas a partir da data de envio.
- **Se lead fica em Novo Lead > 15 min sem tarefa concluída** → notificação de SLA em risco ao comercial + escalação ao responsável comercial após 30 min.
- **Se lead atinge 6 tentativas sem resposta** → sugestão automática de mover para Fechado Perdido (motivo "sem resposta"), com confirmação manual do comercial.
- **Fechado Perdido "sem resposta" ou "adiou projeto"** → tarefa de reativação automática aos 45/90/180 dias conforme motivo.
- **Pós-Venda** → tarefas automáticas aos 30 dias, 6 meses e 1 ano após entrega.

### 7.3 Estados, tags e prioridades

**Estados (etapa do pipeline):** Novo Lead, Qualificação, Contacto, Visita/Orçamento, Proposta Enviada, Negociação, Fechado Ganho, Fechado Perdido, Execução, Pós-Venda.

**Tags sugeridas:**
- Origem: Site / WhatsApp / Instagram / Facebook / Google Business / Referência
- Tipo de obra: Remodelação Completa / Parcial / Pontual
- Motivo de perda: Preço / Prazo / Concorrência / Adiou / Sem Resposta / Fora de Âmbito / Outro
- Relação: Cliente Embaixador (deixou review/recomendou)

**Prioridade (campo derivado do score de qualificação):** P1 – Prioritário (9-10), P2 – Qualificado (6-8), P3 – Potencial (3-5), P4 – Fraco (0-2, normalmente arquivado sem entrar em fila ativa).

### 7.4 Notificações

- SLA de primeiro contacto em risco (aos 10 min) e violado (aos 15 min).
- Follow-up do dia (lista diária de tarefas D+1/D+3/D+7/D+14/D+21 a executar).
- Proposta a expirar (3 dias antes da validade terminar).
- Lead prioritário (P1) criado — notificação imediata, não só na fila normal.
- Aniversário de entrega de obra (para gatilhos de pós-venda/upsell).

### 7.5 Dashboard de métricas comerciais
Painel com os KPIs da secção 8, filtrável por período, por comercial e por origem do lead.

---

## 8. KPIs COMERCIAIS

| KPI | Definição/fórmula |
|---|---|
| Leads recebidos | Total de leads criados no período |
| Leads contactados | Leads com pelo menos 1 tentativa de contacto registada |
| Taxa de contacto | Leads contactados ÷ Leads recebidos |
| Leads qualificados | Leads com categoria "qualificado" ou "prioritário" |
| Visitas marcadas | Total de visitas agendadas no período |
| Propostas enviadas | Total de propostas enviadas no período |
| Taxa de fecho | Fechados Ganhos ÷ Propostas Enviadas |
| Valor médio de obra (ticket médio) | Soma do valor final acordado ÷ nº de Fechados Ganhos |
| Faturação potencial (pipeline aberto) | Soma dos valores propostos em Proposta Enviada + Negociação |
| Tempo médio até resposta | Média do intervalo entre criação do lead e primeiro contacto efetivo |
| Tempo médio até fecho | Média do intervalo entre Novo Lead e Fechado Ganho |

Estes 11 indicadores são o mínimo para pilotar o comercial semanalmente. Métricas adicionais (por origem de lead, por comercial, taxa de recomendação) podem ser acrescentadas depois de o sistema base estar em funcionamento — não antes, para não complicar a implementação inicial.

---

## SEPARAÇÃO DE DECISÕES

### A) Decisões que posso tomar sozinho (já refletidas neste documento)
- Estrutura das 10 etapas do pipeline e respetivas regras de entrada/saída.
- Sistema de qualificação (estrutura de pontuação e categorias).
- Cadência e scripts de follow-up.
- Todos os 12 scripts comerciais.
- Estrutura obrigatória da proposta (os 11 blocos de conteúdo).
- Especificação funcional de campos, estados, tags e automações do CRM (o "o quê"; a construção técnica é do CTO).
- Definição dos 11 KPIs comerciais mínimos.

### B) Decisões que precisam da tua aprovação (Diogo)
- Horário de funcionamento comercial oficial (para o SLA de leads).
- Área de atuação geográfica exata (para o critério de localização na qualificação).
- Orçamento mínimo viável e faixa alvo de obra (para o critério de orçamento na qualificação).
- Condições de pagamento/sinal (adjudicação, faseamento, entrega).
- Validade padrão da proposta (proponho 15 dias).
- Política e período de garantia.
- Prazo interno para preparar proposta após visita (proponho 5 dias úteis).

### C) Alterações técnicas a entregar ao CTO (nenhuma implementada aqui — apenas especificada)
- Criação dos campos, estados e tags no DS OS conforme secção 7.1 e 7.3.
- Configuração das tarefas automáticas e triggers da secção 7.2.
- Configuração das notificações da secção 7.4.
- Construção do dashboard de métricas comerciais da secção 7.5/8.
- Cálculo automático do score de qualificação a partir dos campos definidos na secção 3, assim que os limiares em B) estiverem definidos.
