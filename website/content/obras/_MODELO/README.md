# Como adicionar uma obra nova ao portefólio

Não é preciso tocar em nenhum ficheiro `.tsx`/`.ts` de código para publicar uma obra nova. Segue estes passos:

## 1. Copia esta pasta

Copia `website/content/obras/_MODELO/` para `website/content/obras/<slug-da-obra>/` — o `<slug-da-obra>` é o nome que vai aparecer no URL (ex.: `remodelacao-cozinha-lisboa-01`). Usa só letras minúsculas, números e hífens, sem espaços nem acentos.

Copia também `website/public/obras/_MODELO/` para `website/public/obras/<slug-da-obra>/` — é aqui que vão as fotografias.

## 2. Preenche o `obra.json`

Abre o `obra.json` que copiaste e substitui os textos de exemplo pelos dados reais da obra. Campos obrigatórios: `slug` (tem de ser igual ao nome da pasta), `title`, `category`, `location`, `summary`, `cover`, `status`.

**Regras importantes:**
- `title` e `location` nunca podem identificar o cliente (sem nome, sem morada exata — só concelho/zona).
- `duration` e `materials` só se preenchem com informação verdadeira. Se não souberes, deixa o campo de fora (não inventes).
- `category` tem de ser um destes valores exatos: `residencial`, `premium`, `cozinhas`, `casas-de-banho`, `moradias`, `comercial`.
- `status` começa sempre como `"draft"` — a obra só aparece no site quando mudares para `"published"`. Isto dá-te tempo para rever tudo com calma antes de publicar.
- Cada foto/vídeo em `gallery`/`videos` precisa de um `alt` (descrição curta) — é obrigatório para acessibilidade e ajuda o SEO.

## 3. Coloca as fotografias

Dentro de `website/public/obras/<slug-da-obra>/`:
- `capa.jpg` — a fotografia de capa (aparece na listagem do portefólio).
- `galeria/01.jpg`, `galeria/02.jpg`, ... — as restantes fotografias.

Usa `phase: "antes"`, `"durante"` ou `"depois"` em cada foto da galeria sempre que fizer sentido — isso ativa automaticamente a comparação antes/depois na página da obra.

## 4. Vídeos (se tiveres)

Sobe o vídeo, não-listado, ao YouTube ou Vimeo, e cola o link de **embed** (não o link normal) no campo `embedUrl`. Define `orientation` como `"horizontal"` (vídeo normal) ou `"vertical"` (reel/story).

## 5. Publica

Muda `"status": "draft"` para `"status": "published"`, faz commit e push. A obra aparece automaticamente:
- na listagem `/portfolio`;
- na página própria `/portfolio/<slug-da-obra>`;
- no sitemap (SEO);
- na página do serviço correspondente (`servicesRealized`).

## Validação automática

Se te enganares num campo obrigatório ou num valor de `category` inválido, o build do site (`npm run build`) falha com uma mensagem clara a dizer exatamente o que falta — nunca publica uma obra com dados incompletos por engano.
