# Playbook de Fotografia — Portefólio DS Projects

*Guia prático para quem fotografa uma obra (equipa própria ou fotógrafo contratado). Desenhado para encaixar diretamente no sistema de portefólio já construído — seguir estas regras significa zero trabalho manual de reclassificação depois. Ver `scripts/audit-media.mjs` e `checklist-lancamento-v1.md` secção 7.*

## 1. Princípio geral

Cada obra publicada no portefólio precisa de, no mínimo, uma fotografia de **Depois** com qualidade suficiente para ser a capa. Tudo o resto é para tornar a ficha da obra mais forte, não obrigatório para publicar — mas obras com fotografias de **Antes** e **Durante** contam uma história muito mais convincente do que só o resultado final, e são o que diferencia um portefólio de um simples álbum de fotos bonitas.

## 2. O que fotografar, por fase

**Antes** (obrigatório sempre que possível — combinar com o cliente no primeiro dia)
- Cada divisão que vai ser intervencionada, no mínimo 2 ângulos.
- Um plano geral do espaço inteiro (mostra escala do projeto).
- Detalhes dos problemas que justificam a remodelação (humidade, instalações antigas, etc.) — reforça a narrativa de "Desafio" na ficha da obra.

**Durante** (opcional mas muito valorizado — mostra profissionalismo e processo)
- Momentos-chave: demolição, estrutura à vista, instalações novas antes de fechar paredes, aplicação de acabamentos.
- Não precisa de ser exaustivo — 3 a 6 fotos bem escolhidas contam a história do processo melhor do que 30 fotos redundantes.

**Depois** (obrigatório — sem isto não há capa nem galeria principal)
- As mesmas divisões e ângulos do "Antes", para permitir comparação direta (o sistema já suporta um slider antes/depois automático quando os dois existem).
- Um plano geral do espaço inteiro.
- Pelo menos 1 foto "hero" por divisão principal — bem enquadrada, boa luz, candidata a capa da obra.

## 3. Quantidade recomendada por obra

| Tipo de obra | Antes | Durante | Depois | Total mínimo |
|---|---|---|---|---|
| Cozinha ou casa de banho isolada | 3-4 | 2-3 | 5-6 | ~12 |
| Remodelação residencial completa | 8-12 | 4-8 | 12-18 | ~30 |
| Moradia ou projeto premium | 12-18 | 8-12 | 18-25 | ~45 |

Mais do que isto não é um problema — o sistema tem filtros e paginação na galeria (`Gallery.tsx`, com lightbox). Menos do que o mínimo da linha "Depois" torna a obra fraca para publicar.

## 4. Orientação e enquadramento

- **Horizontal (paisagem) por omissão** — é o que melhor se adapta à grelha do portefólio e à página de estudo de caso.
- **Vertical** só quando o assunto pede (ex.: um pormenor alto, uma escada, uma fachada estreita) — o sistema já sabe distinguir e adaptar o layout (`orientation: "horizontal" | "vertical"` em cada ficheiro).
- Luz natural sempre que possível; evitar contraluz direto contra janelas.
- Nunca fotografar com pessoas identificáveis em enquadramento a não ser que seja um membro da equipa em ação (ex.: a instalar algo) — nunca clientes, por proteção de privacidade, a não ser que exista autorização explícita para esse uso específico (ver política de testemunhos).

## 5. Nomenclatura de ficheiros — a parte que poupa trabalho depois

`scripts/audit-media.mjs` classifica automaticamente por palavras-chave no nome do ficheiro ou da pasta. Usar estas palavras (sem acentos funciona sempre, com acentos também é reconhecido) garante classificação automática correta:

- Fase: `antes` / `durante` / `depois`
- Vista aérea: `drone`
- Divisão/assunto: `cozinha`, `casa-de-banho` (ou `wc`, `banho`), `pintura`, `pladur`, `pavimento`, `fachada`, `exterior`, `interior`
- Plano geral da obra: `obra-completa`, `geral` ou `capa`

Exemplo de nome de ficheiro bem formado:
`cascais-moradia-01_cozinha_depois_01.jpg`

Não é obrigatório seguir isto à letra — o script também analisa a pasta onde o ficheiro está —, mas quanto mais claro o nome, menos revisão manual é precisa depois de correr o script.

## 6. Estrutura de pastas sugerida (antes de entregar)

```
obra-cascais-01/
  antes/
  durante/
  depois/
  drone/            (se aplicável)
```

Uma pasta por obra, com subpastas por fase — é o que `audit-media.mjs` espera encontrar e é também mais fácil de rever manualmente antes de decidir o que publicar.

## 7. Texto alternativo (obrigatório, não opcional)

Toda a fotografia publicada precisa de uma frase curta de "alt text" (acessibilidade + SEO de imagem) — ex.: *"Cozinha remodelada em L, bancada em quartzo branco, Cascais"*. Isto é preenchido no DS OS ao adicionar a fotografia à obra (`/marketing/website/<obra>`, campo "Texto alternativo"), não no ficheiro em si — mas vale a pena já ires escrevendo estas descrições enquanto organizas as fotos, poupa tempo depois.

## 8. Onde entram estas fotos no sistema

1. Organizas as fotos nas pastas por obra/fase (secção 6).
2. Corres (ou eu corro, quando indicares a localização) `node scripts/audit-media.mjs "<pasta>"` — gera um relatório de classificação proposta, nunca copia nada sozinho.
3. Revês o relatório, decides a estrutura final de obras.
4. As fotos entram no site através do DS OS (`/marketing/website/<obra>`, secção "Fotos e vídeos") — caminho do ficheiro + alt text + fase/orientação.
5. Publicas a obra e exportas para o website (ver `website-cms-integracao.md`).
