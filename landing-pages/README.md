# Landing Pages — DS Group / DS Projects

Landing pages de campanha (Google Ads / Meta Ads), separadas do website
institucional para permitir mensagens específicas por campanha sem alterar
a navegação principal.

## Modelo

[`templates/campanha-servico.html`](./templates/campanha-servico.html) — ficheiro
único (HTML+CSS+JS inline), sem dependências de build, pronto a duplicar por
campanha. Segue o mesmo sistema de marca do website (`/brand/design-tokens.json`).

**Para criar uma nova campanha:**

1. Copiar o template para `landing-pages/campanhas/<slug-da-campanha>.html`.
2. Substituir todos os campos `{{ENTRE_CHAVETAS}}`.
3. Confirmar que `API_ENDPOINT` no `<script>` aponta para o domínio de
   produção correto.
4. Publicar (ver opções de alojamento abaixo).

## Duas formas de publicar

**Opção A — Recomendada: como rota do Next.js.** Copiar o conteúdo do body
para uma nova página em `website/src/app/lp/<slug>/page.tsx`. Vantagens:
mesmo domínio (sem problema de CORS ao chamar `/api/contact`), beneficia de
SEO técnico e performance do Next.js, e do mesmo pipeline de deploy
(Vercel). Esta é a opção preferível sempre que o volume de campanhas
justificar o esforço.

**Opção B — Ficheiro estático isolado.** Publicar o `.html` diretamente
(ex.: Vercel como projeto separado, ou qualquer alojamento estático). Mais
rápido a lançar, mas exige adicionar cabeçalhos CORS à rota
`website/src/app/api/contact/route.ts` para aceitar pedidos de um domínio
diferente — sem isso, o formulário falha silenciosamente por bloqueio do
browser.

## Estado atual

Ainda não existe nenhuma campanha publicada — apenas o modelo. Criar a
primeira landing page apenas quando a Fase de marketing pago (ver
`docs/estrategia-marketing.md`) estiver pronta para arrancar.
