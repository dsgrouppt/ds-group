# Como adicionar um testemunho real

1. Duplica esta pasta `_MODELO` e dá-lhe um nome novo, sem o `_` inicial
   (ex.: `content/testemunhos/joao-cascais-01/`). Pastas que comecem por
   `_` nunca são publicadas — é assim que o sistema garante que este
   modelo nunca aparece no site por engano.
2. Dentro dessa nova pasta, edita `testemunho.json`:
   - `id`: um identificador curto e único (pode ser igual ao nome da pasta).
   - `kind`: `"texto"` ou `"video"`.
   - `clientName`, `location`, `quote`, `rating`: dados reais do cliente.
     `location` deve ser genérico (concelho/zona), nunca a morada exata.
   - `relatedCaseStudySlug` (opcional): se este testemunho corresponder a
     uma obra já publicada em `content/obras/`, coloca aqui o slug dessa
     obra — o testemunho passa a aparecer também na página dessa obra.
   - `photo` (opcional, testemunhos de texto): caminho para uma fotografia
     real do cliente, só com autorização explícita.
   - `embedUrl` (obrigatório se `kind` for `"video"`): link de embed
     (YouTube/Vimeo, idealmente não listado) do vídeo do testemunho.
3. **`authorized`**: só passa a `true` depois de teres confirmação explícita
   do cliente (mensagem, email ou documento assinado) de que autoriza a
   publicação do nome, citação e/ou imagem no site. Isto é a última barreira
   de segurança — mesmo com o ficheiro completo, nada é publicado com
   `authorized: false` ou em falta.
4. Faz commit e push. Não precisas de tocar em nenhum ficheiro `.tsx`.

Nunca inventes um testemunho, mesmo "só para preencher" — ver a política em
`src/components/sections/VideoTestimonials.tsx`.
