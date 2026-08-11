# Protocolo de Produção de Obras — Portefólio Vivo

*Como vou processar as fotografias/vídeos reais assim que a `MEDIA/` estiver organizada. Fluxo de duas fases com um único ponto de aprovação — minimizar interrupções, maximizar trabalho contínuo. Este documento é o meu guia de execução; Diogo só precisa de saber o que vou apresentar e quando.*

## Fase A — Auditoria global (nunca paro na primeira obra)

Ao receber a pasta `MEDIA/OBRAS/` organizada, o primeiro passo é sempre varrer **tudo** antes de tocar em qualquer obra individual:

1. Correr `node scripts/audit-media.mjs "<caminho para MEDIA/OBRAS>"` — percorre todas as subpastas de obra (ignora sempre `_OBRA_MODELO` e qualquer pasta que comece por `_`) e produz três ficheiros: um registo por ficheiro, um resumo por obra, e um detalhe por obra. Nada é copiado ou movido nesta fase.
2. Para cada obra, o script já calcula automaticamente: nome provisório, categoria estimada, localização (se reconhecível no nome da pasta), nº de fotografias, nº de vídeos, fotos Antes/Durante/Depois, contagem de Drone, verticais/horizontais, qualidade estimada (a partir da resolução real das imagens), possíveis duplicados (ficheiros byte-a-byte idênticos — nunca uma suposição visual), sinalização de material insuficiente, capa sugerida, vídeo sugerido, e um Estado de Preparação em percentagem (soma de critérios explícitos, nunca um número "às cegas" — ver comentários no script para os pesos exatos).
3. Componho a partir disto **uma única tabela com todas as obras encontradas** e apresento-a de uma vez — é nesse momento, e só nesse momento, que peço aprovação. Não paro a meio da lista para perguntar sobre a primeira obra que encontrar.

A tabela tem sempre estas colunas: Obra, Categoria, Localização, Fotos (nº), Vídeos (nº), Antes/Durante/Depois, Drone, Vert./Horiz., Qualidade, Duplicados, Material Insuficiente, Capa Sugerida, Vídeo Sugerido, Estado de Preparação (%).

## Fase B — Aprovação do lote inteiro

Diogo revê a tabela completa e aprova (ou ajusta) o lote **de uma vez** — não obra a obra. Nesse momento também é a oportunidade de corrigir qualquer categoria/localização mal inferida antes de eu avançar.

## Fase C — Integração contínua, sem interrupções desnecessárias

Depois da aprovação, processo todas as obras aprovadas em sequência, sem voltar a parar, seguindo por obra:

1. Selecionar o melhor conteúdo (capa, galeria com pares antes/depois, vídeos) a partir da sugestão automática da Fase A, ajustada por bom senso.
2. Copiar os ficheiros finais de `14_EXPORTADAS/` para `website/public/obras/<slug>/`.
3. Escrever o estudo de caso (Desafio, Planeamento, Execução, Solução, Resultado) a partir do que existir em `08_ESTUDO_DE_CASO/` — um campo sem informação suficiente fica de fora, nunca inventado.
4. Testemunho, só se existir e estiver autorizado.
5. Artigos relacionados — automático (cruza `servicesRealized` com `relatedServiceSlugs` dos artigos de blog, sem trabalho manual).
6. SEO por obra: título, resumo, alt text obrigatório em cada fotografia, categoria confirmada.
7. Publicar no DS OS, exportar, importar no website, validar (`tsc`/`eslint`/`next build`), gerar patch.

**Só interrompo o fluxo contínuo por informação genuinamente impossível de inferir dos ficheiros** — por exemplo: localização que não consta em lado nenhum do nome da pasta nem foi indicada na aprovação da Fase B; confirmação de autorização de testemunho; ou uma obra sinalizada como "Material Insuficiente" na tabela (nesses casos, ou fica para trás com uma nota clara no relatório final, ou peço a informação em falta — nunca escrevo um facto que não existe só para não interromper).

O lote termina sempre com um resumo único: quantas obras publicadas, quantas ficaram de fora e porquê, e o patch a aplicar — nunca um relatório por obra individual.

## Notas sobre as heurísticas do script (transparência, não caixa preta)

- **Categoria**: inferida pela tag de divisão mais frequente nos nomes de ficheiro (`cozinha` → `cozinhas`, `casa-de-banho` → `casas-de-banho`, `fachada`/`exterior` → `moradias`); sem nenhuma tag reconhecida, assume `residencial` como omissão razoável. **Sempre marcada como "a confirmar"** na tabela — o script nunca decide sozinho a categoria de negócio final.
- **Localização**: só reconhece as zonas já listadas em `siteConfig.locations` (Lisboa, Porto, Cascais, Oeiras, Sintra, Vila Nova de Gaia, Matosinhos, Almada). Fora dessa lista, fica em branco — não inventa nem tenta adivinhar uma cidade desconhecida.
- **Qualidade estimada**: média de megapixels reais das fotografias (via `sharp`), não uma avaliação estética — uma foto de baixa resolução mas bem composta ainda aparece como "Baixa", cabe à revisão humana na Fase B corrigir a leitura.
- **Duplicados possíveis**: só ficheiros byte-a-byte idênticos (hash SHA-256). Não deteta fotos de rajada visualmente parecidas mas não idênticas — para evitar reportar uma falsa suspeita de duplicado.
- **Capa/vídeo sugeridos**: heurística explícita (prioriza "depois", horizontal, maior resolução) — uma sugestão de arranque, não uma decisão final.
- **Estado de Preparação (%)**: soma de 7 critérios com peso fixo (localização, categoria, fotos "depois" suficientes, capa sugerida, par antes/depois, ausência de material insuficiente, pelo menos um vídeo) — sempre 100% quando todos são cumpridos, nunca um número arbitrário.

## O que preciso de Diogo, no mínimo, por obra

- Localização (se não estiver no nome da pasta e o script não a reconhecer).
- Confirmação da categoria sugerida.
- Confirmação de autorização, se quiser incluir testemunho ou uma fotografia com pessoas identificáveis.

Tudo o resto que não existir (desafio, planeamento, materiais, duração) fica de fora do estudo de caso — nunca inventado.

## Limite conhecido do sistema atual

A listagem `/portfolio` já tem paginação client-side ("Mostrar mais", 12 obras de cada vez), preparada para aguentar confortavelmente centenas de obras publicadas. Só valeria a pena reavaliar paginação no servidor se o portefólio um dia ultrapassasse a ordem dos milhares de obras — não é o cenário esperado para os próximos anos, só uma nota para o futuro.

## Regra que nunca muda

Nada disto contorna as regras já estabelecidas nesta conversa: nunca um nome de cliente sem autorização, nunca uma fotografia de pessoa identificável sem autorização, nunca um testemunho ou facto de obra inventado, nunca uma obra publicada sem, pelo menos, capa e localização genérica reais.
