# Protocolo de Produção de Obras — Portefólio Vivo

*Como vou processar as fotografias/vídeos reais assim que a `MEDIA/` estiver organizada, obra a obra e em lotes, até o portefólio ter centenas de obras publicadas. Este documento é o meu guia de execução — Diogo não precisa de o seguir passo a passo, só de saber o que vou pedir e quando.*

## 1. Pré-requisito

Cada obra chega organizada segundo `MEDIA/OBRAS/<obra>/` (ver `playbook-fotografia.md` e `playbook-video.md`). Quanto mais isto for seguido à letra, menos perguntas preciso de fazer por obra — mas nunca bloqueio uma obra só porque uma pasta não está perfeita, adapto-me ao que existir.

## 2. Pipeline por lote (repito para cada grupo de obras entregue)

**Passo 1 — Classificação automática**
Correr `node scripts/audit-media.mjs "<pasta>"` sobre o material entregue. Gera um relatório de classificação (fase, orientação, categoria) por ficheiro — nunca copia nem move nada sozinho.

**Passo 2 — Confirmar a estrutura por obra**
Reviso o relatório, confirmo os limites de cada obra (uma pasta = uma obra, se seguido o padrão) e sinalizo qualquer ambiguidade a Diogo antes de avançar — nunca assumo que um ficheiro pertence a uma obra só por estar fisicamente perto de outros.

**Passo 3 — Selecionar o melhor conteúdo por obra**
A partir do relatório e da própria organização em `12_EDITADAS`/`10_CAPAS`:
- 1 fotografia de capa.
- Galeria com pares antes/depois sempre que ambos existirem (o sistema já monta o slider automaticamente quando há `phase: "antes"` e `phase: "depois"` na mesma obra).
- Vídeos (processo/tour) com orientação identificada.
- Tags (`cozinha`, `casa-de-banho`, etc.) herdadas da classificação automática.

**Passo 4 — Copiar os ficheiros finais para o website**
De `MEDIA/OBRAS/<obra>/14_EXPORTADAS/` para `website/public/obras/<slug>/` — é o caminho que `MediaAsset.src` espera. Ficheiros grandes/não comprimidos nunca entram diretamente aqui.

**Passo 5 — Escrever o estudo de caso**
Desafio, Planeamento, Execução, Solução, Resultado — a partir do que estiver em `08_ESTUDO_DE_CASO/` e de qualquer nota que Diogo tenha dado. Se não houver informação suficiente para um dos campos, fica de fora (nunca invento um desafio ou resultado específico) — a mesma regra aplicada desde a primeira auditoria de conteúdo desta conversa.

**Passo 6 — Testemunho (se existir e autorizado)**
Só entra se houver prova de autorização em `TESTEMUNHOS/Autorizacoes/`. Sem isso, a obra é publicada sem testemunho — nunca bloqueio a publicação da obra por falta de testemunho, é um extra, não um requisito.

**Passo 7 — Artigos relacionados**
Automático: o sistema cruza os `servicesRealized` da obra com os artigos de blog que têm esse serviço em `relatedServiceSlugs` (mecanismo já construído — ver `getBlogPostsForCaseStudy` em `lib/blog-data.ts`). Não preciso de ligar isto manualmente por obra.

**Passo 8 — SEO por obra**
- Título único, descritivo (categoria + localização genérica, nunca nome de cliente).
- `summary` escrito para humanos.
- Texto alternativo obrigatório em cada fotografia.
- Categoria correta (afeta os filtros do portefólio e o schema `CreativeWork`).

**Passo 9 — Publicar**
No DS OS (`/marketing/website`): criar/editar a obra, publicar, exportar. No website: `node scripts/import-cms-export.mjs`, rever `git diff`, validar (`tsc`/`eslint`/`next build`), gerar patch.

**Passo 10 — Confirmar com Diogo**
Cada lote termina com um resumo claro: quantas obras processadas, quantas publicadas, o que ficou de fora e porquê (ex.: falta de capa, falta de autorização), e o patch a aplicar.

## 3. O que preciso de Diogo, por obra (mínimo indispensável)

- Localização genérica (concelho/zona) — já deve estar no nome da pasta se seguido o padrão.
- Categoria de serviço.
- Pelo menos uma fotografia de "Depois" com qualidade para capa.
- Confirmação de autorização, se quiser incluir testemunho ou uma fotografia com pessoas identificáveis.

Tudo o resto (desafio, planeamento, materiais, duração) é bem-vindo mas não bloqueia a publicação — fica de fora do estudo de caso se não existir, nunca inventado.

## 4. Cadência de processamento

Processo em **lotes**, não obra a obra em tempo real — mais eficiente para validar (`tsc`/`eslint`/`next build`) e gerar um patch coerente de cada vez, em vez de dezenas de micro-patches. Tamanho de lote sugerido: 5-15 obras, ou "tudo o que estiver pronto de cada vez que Diogo entregar", o que for menor.

## 5. Limite conhecido do sistema atual e quando reavaliar

A listagem `/portfolio` já tem paginação ("Mostrar mais", 12 obras de cada vez — adicionado nesta sessão, precisamente a pensar em centenas de obras). Isto aguenta confortavelmente centenas de obras publicadas. Se um dia o portefólio ultrapassar a ordem dos milhares de obras (não é o caso esperado para os próximos anos), valeria a pena reavaliar paginação no servidor em vez de client-side — não é uma ação a tomar agora, só uma nota para o futuro.

## 6. Regra que nunca muda

Nada disto contorna as regras já estabelecidas nesta conversa: nunca um nome de cliente sem autorização, nunca uma fotografia de pessoa identificável sem autorização, nunca um testemunho ou facto de obra inventado, nunca uma obra publicada sem, pelo menos, capa e localização genérica reais.
