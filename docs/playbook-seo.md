# Playbook de SEO Operacional — DS Projects

*Ações recorrentes, não arquitetura. Para o desenho técnico já implementado (schema markup, sitemap, robots, Core Web Vitals) ver `arquitetura-seo.md`. Para a análise de concorrência e palavras-chave ver `auditoria-concorrencia-seo.md`. Este documento é o "o que fazer todo o mês", escrito para ser seguido sem conhecimento técnico prévio.*

## 1. Cadência recomendada

- **Blog: mínimo 2 artigos/mês** nos primeiros 12 meses (referência já definida em `arquitetura-website.md`), focados em palavras-chave informacionais de topo de funil ("quanto custa remodelar...", "como escolher empresa de remodelação...").
- **Portefólio: publicar cada obra concluída assim que autorizada** — não é preciso esperar por um lote, cada obra nova publicada é uma página nova indexável pelo Google.
- **Google Business Profile**: pelo menos 1 publicação/mês (uma obra recente, uma novidade) e responder a reviews dentro de 48h.

## 2. Como publicar um novo artigo de blog (sem tocar em componentes React)

1. Abrir `website/src/lib/blog-data.ts`.
2. Copiar a estrutura de um post existente (`slug`, `title`, `excerpt`, `category`, `readTime`, `publishedAt`, `body`, `relatedServiceSlugs`).
3. Escrever o conteúdo em `body` — blocos de `heading` + `paragraphs`, com `list` opcional para checklists dentro do artigo.
4. Preencher `relatedServiceSlugs` com os serviços realmente relevantes (ver lista em `site-data.ts`) — isto gera automaticamente a ligação "este tema está relacionado com [Serviço]" no fim do artigo, e o artigo passa a aparecer na página desse serviço. Não pular este campo — é o que faz o SEO de internal linking funcionar sozinho.
5. Checklist antes de publicar (ver secção 4).
6. Commit + push — o artigo fica automaticamente no sitemap (`sitemap.ts` já lê `blogPosts` sozinho).

## 3. Como adicionar uma nova área geográfica (ex.: nova cidade de atuação)

1. Abrir `website/src/lib/local-seo-data.ts`.
2. Adicionar uma entrada a `localAreas` com `slug`, `name`, `region`, `intro`, `context` (2 parágrafos sobre as características reais do parque habitacional dessa zona — nunca copiar o texto de outra cidade só trocando o nome, o Google penaliza "páginas finas"/conteúdo duplicado a prazo) e `profileNote`.
3. A página `/remodelacoes/<slug>` e a entrada no sitemap são geradas automaticamente — não é preciso criar nenhum ficheiro novo.
4. Regra: só adicionar uma área onde a DS Projects realmente atua ou pretende atuar ativamente — uma página geográfica sem obras/atividade real nessa zona é o tipo de conteúdo fino que o Google penaliza.

## 4. Checklist on-page — seguir sempre que se publica conteúdo novo (blog, obra ou serviço)

- [ ] Título único, sem duplicar o de outra página do site.
- [ ] `excerpt`/`summary` escrito para humanos, não uma lista de palavras-chave.
- [ ] Pelo menos um link interno de saída (para um serviço, outra obra ou outro artigo relacionado).
- [ ] Toda a fotografia tem `alt` text descritivo (ver `playbook-fotografia.md` secção 7).
- [ ] Ler o texto uma vez em voz alta — se soar a "escrito para o Google" em vez de para uma pessoa, reescrever.

## 5. Acompanhamento mensal (10 minutos, sem ferramentas pagas)

- [ ] Google Search Console → "Desempenho": que pesquisas estão a trazer cliques, quais páginas têm impressões altas mas cliques baixos (candidatas a melhorar título/descrição).
- [ ] Google Search Console → "Cobertura": confirmar que não há páginas novas com erro de indexação.
- [ ] Google Business Profile → confirmar reviews novas respondidas.

## 6. O que NÃO fazer (protege o posicionamento premium, ver `indice-geral-e-framework-decisao.md` filtro de marca)

- Nunca comprar backlinks ou usar redes de troca de links — risco de penalização, e contradiz o posicionamento.
- Nunca publicar um artigo só para "ter conteúdo" sem responder a uma pergunta real de um cliente potencial.
- Nunca liderar um título ou meta descrição com preço ou desconto.

## 7. Pendente de decisão (não bloqueia lançamento)

- Confirmar acesso ao Google Search Console e Google Analytics 4 assim que os IDs estiverem configurados (ver `checklist-lancamento-v1.md` secção 2-3).
- Definir quem, na equipa, fica responsável pela cadência de blog — este documento assume que alguém vai efetivamente escrever 2 artigos/mês; sem essa pessoa definida, a cadência não acontece sozinha.
