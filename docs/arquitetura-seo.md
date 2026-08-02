# Arquitetura SEO — DS Projects

*Fase 2 do plano técnico do CTO. Construída a partir de
`docs/auditoria-concorrencia-seo.md`. Todas as páginas descritas aqui já
estão implementadas e a compilar sem erros no website Next.js.*

---

## 1. Estrutura de URLs

```
/                                    → Homepage
/servicos/[slug]                     → 6 páginas de serviço
/remodelacoes/[cidade]                → 8 páginas de Local SEO
/portfolio                           → Portefólio completo (filtrável)
/blog                                → Índice do blog
/blog/[slug]                         → 6 artigos
/faq                                 → Perguntas Frequentes (FAQPage schema)
/politica-de-privacidade
/termos
```

Princípio seguido: URLs curtos, em português, sem parâmetros desnecessários,
cada um mapeado 1:1 a uma intenção de pesquisa específica — nunca uma
página genérica a tentar responder a tudo.

## 2. Local SEO — 8 páginas por concelho

Concelhos cobertos: **Lisboa, Porto, Cascais, Oeiras, Sintra, Vila Nova de
Gaia, Matosinhos, Almada** — escolhidos por serem as zonas de maior procura
por remodelação de padrão médio-alto a premium nas duas áreas metropolitanas
de atuação (ver `docs/auditoria-concorrencia-seo.md`, secção 2).

**Decisão deliberada:** não foi criada uma matriz cidade × serviço (48
páginas) à semelhança da Urban Obras. Cada página de cidade tem conteúdo
genuinamente diferenciado — contexto do parque habitacional local, desafio
técnico típico e perfil de projeto mais comum nessa zona — em vez de texto
template com o nome trocado. Isto protege contra penalização por "thin/
duplicate content" e mantém o padrão de qualidade da marca. Cada página de
cidade liga para todos os 6 serviços e para as restantes 7 cidades
(interlinking interno completo).

Ficheiro fonte: `website/src/lib/local-seo-data.ts`.
Schema aplicado: `Service` + `BreadcrumbList` por página.

## 3. Blog — 6 artigos de lançamento

Todos escritos para intenção de pesquisa real de um cliente em fase de
decisão (não para densidade de palavra-chave). Títulos e URLs:

| Artigo | Intenção de pesquisa |
|---|---|
| Quanto tempo demora uma remodelação? | "quanto tempo demora remodelação casa" |
| O que significa "remodelação chave na mão" | "remodelação chave na mão significado" |
| Como escolher uma empresa de remodelação: 7 perguntas | "como escolher empresa remodelação" |
| Remodelar para investimento: o que muda | "remodelar apartamento para arrendar/investir" |
| 5 erros comuns em remodelações de cozinha | "erros remodelação cozinha" |
| Checklist antes de remodelar uma casa de banho | "checklist remodelação casa de banho" |

Regras de marca respeitadas em todos os artigos: nunca lidera com preço,
nunca diz "fazemos tudo", tom direto e baseado em critério técnico.

Ficheiro fonte: `website/src/lib/blog-data.ts`. Schema aplicado: `Article` +
`BreadcrumbList`. Estrutura pronta para receber novos posts apenas
adicionando uma entrada ao array — sem alterar código de página.

## 4. FAQ — schema `FAQPage`

12 perguntas reais agrupadas em 4 categorias (Processo, Prazos e Orçamento,
Investidores, Garantia), pensadas para reduzir objeção concreta de um
cliente com orçamento entre 20.000€ e 200.000€, sem nunca comunicar um
número de preço — ver `website/src/lib/faq-data.ts`.

O schema `FAQPage` foi a peça de Schema.org que ficava pendente da Fase 1
(ver nota em `docs/auditoria-fase1-website.md`) — está agora implementado e
verificado no HTML gerado (`"@type":"FAQPage"` presente no build estático).

## 5. Sitemap e navegação

`website/src/app/sitemap.ts` foi atualizado para incluir automaticamente as
8 páginas de cidade e os 6 artigos de blog — qualquer novo item adicionado
aos ficheiros de dados entra no sitemap sem alteração manual. O menu
principal e o rodapé foram atualizados com "Blog" e "FAQ"; o rodapé lista
também as 8 áreas de atuação.

## 6. Segurança — atualização do Next.js

Durante esta fase, o `npm install` assinalou uma vulnerabilidade crítica na
versão do Next.js em uso (14.2.5, referente ao aviso de segurança de
dezembro de 2025 da Vercel). Foi aplicada a atualização para a última
versão de patch da mesma série (**14.2.35**), sem alterações de código
necessárias — build validado com sucesso após a atualização.

`npm audit` continua a assinalar vulnerabilidades adicionais cuja correção
completa exige subir para o **Next.js 16** (major version, breaking
change — nova versão do App Router, possíveis alterações de configuração).
Esta é uma decisão estratégica, não uma correção automática segura, por
isso **não foi aplicada sem aprovação**: exige uma janela dedicada de
testes de regressão em todas as páginas antes do deploy em produção.
Recomenda-se agendar esta migração já com o site em produção (Fase 2/3
concluídas), não a meio da construção do SEO.

## 7. Próximos passos de conteúdo (não bloqueados, mas fora do âmbito técnico)

- Fotografia real por cidade e por artigo (atualmente placeholders
  identificados, conforme regra de marca desde a v2.0 do website).
- Expansão do blog para cadência regular (ex.: 2 artigos/mês) — a estrutura
  de dados já suporta isto sem trabalho técnico adicional.
- Ligação do Google Search Console (Fase 3) para monitorizar posicionamento
  real das 8 páginas de cidade e dos 6 artigos face aos concorrentes
  identificados na auditoria.

---

Ver também: [`auditoria-concorrencia-seo.md`](./auditoria-concorrencia-seo.md)
para a análise de concorrência que fundamenta estas decisões.
