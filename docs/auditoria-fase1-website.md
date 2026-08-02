# Auditoria Técnica — Fase 1 (Website)

*Realizada no ambiente de build local (sandbox), antes do deploy em produção. Versão 1.1.*

---

## Nota sobre Lighthouse

Não foi possível correr o Lighthouse automatizado neste sandbox: o binário
Chrome para arquitetura ARM (baixado via Puppeteer para o efeito) não é
compatível com o kernel do ambiente (`Exec format error`), e o sandbox não
tem acesso a um Chrome/Chromium do sistema nem permissão para instalar um
via `apt`. Não existe ainda URL pública para usar o PageSpeed Insights.

**Ação recomendada assim que houver deploy (Fase 2 do plano geral):** correr
`npx lighthouse https://www.dsprojects.pt --view` ou o relatório do
PageSpeed Insights / Lighthouse integrado no painel da Vercel, e comparar
com esta auditoria manual. Nada nesta lista foi inventado — cada ponto abaixo
está verificado diretamente no código-fonte ou no output real do
`npm run build`.

## Performance

- **JS partilhado por toda a aplicação: 87.1 kB** (gzip), a maior página
  individual soma 144 kB de First Load JS — valores bem abaixo da média do
  setor para sites com animação (confirmado no output de `npm run build`).
- A maioria dos componentes são **Server Components** (zero JS enviado ao
  cliente); só `Header`, `CustomCursor`, `BeforeAfter`, `ProjectsGrid`,
  `ContactForm`, `Reveal` e `Analytics` correm no cliente — exatamente onde
  há interatividade real.
- Fontes (Fraunces + Inter) servidas via `next/font`, self-hosted, sem
  pedido de rede a `fonts.googleapis.com` — elimina bloqueio de renderização
  por fonte externa.
- Imagens preparadas para AVIF/WebP automático via `next/image`
  (`next.config.mjs`) assim que existir fotografia real — nada a comprimir
  manualmente hoje, porque ainda não há imagens reais no repositório.
- 16 rotas pré-renderizadas estaticamente (○/●) — só `/api/contact` e
  `/portfolio` (usa `searchParams`) são dinâmicas.

## Acessibilidade

Correções aplicadas nesta fase:

- **Contraste de cor** — o dourado de marca (`#b08d57`) tem apenas 3.09:1
  sobre branco, insuficiente para texto pequeno (WCAG AA exige 4.5:1).
  Corrigido: `.eyebrow` e etiquetas numéricas (`service-num`, `method-num`,
  função de membro da equipa) passam a usar `--graphite` ou uma variante
  mais escura do dourado (`--gold-text`, 4.5–4.8:1) em fundos claros; o
  dourado puro mantém-se apenas em fundos escuros, onde já tinha 6.4:1.
- **Hierarquia de headings** corrigida — `Timeline` e `Team` saltavam de
  `h2` para `h4`; agora usam `h3`.
- **Skip link** ("Saltar para o conteúdo principal") adicionado no início do
  `<body>`, visível ao receber foco de teclado.
- **Foco visível** consistente (`:focus-visible`) em todos os elementos
  interativos — antes dependia apenas do estilo por omissão do browser.
- **SVGs decorativos** (ícone de placeholder, botão de play) marcados
  `aria-hidden="true"` — evita que leitores de ecrã os anunciem como imagem
  sem descrição, já que o texto ao lado já transmite a informação.
- **Honeypot do formulário** marcado `aria-hidden="true"` — antes podia ser
  anunciado por leitores de ecrã como um campo obrigatório confuso.
- **Erro do formulário** com `role="alert"` — leitores de ecrã anunciam a
  mensagem de erro automaticamente ao aparecer.
- Landmarks semânticos já existiam (`<header>`, `<nav aria-label>`,
  `<main>`, `<footer>`) — confirmados presentes em `layout.tsx`.
- Formulário: todos os campos têm `<label htmlFor>` associado; select usa
  opção desativada como placeholder (não usa apenas `placeholder` de input,
  que falha em selects).

## SEO Técnico

- `sitemap.xml` e `robots.txt` gerados nativamente pelo Next.js
  (`app/sitemap.ts`, `app/robots.ts`) — incluem automaticamente qualquer
  novo serviço adicionado a `lib/site-data.ts`.
- Metadata por página via `generateMetadata`/`buildMetadata()`: title,
  description, canonical, Open Graph, Twitter Card.
- **Open Graph image dinâmica** adicionada (`app/opengraph-image.tsx`, via
  `next/og`) — antes não existia nenhuma imagem de partilha; agora qualquer
  link partilhado (WhatsApp, LinkedIn, Facebook) mostra uma imagem de marca
  gerada automaticamente, sem depender de um ficheiro estático.
- Schema.org (JSON-LD): `HomeAndConstructionBusiness` no layout raiz,
  `Service` + `BreadcrumbList` em cada página de serviço. `FAQPage` a
  adicionar na Fase 2, junto com a página de FAQ.
- Slot de verificação do Google Search Console já preparado em
  `layout.tsx` (`verification.google`, via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`).

## Segurança

Headers adicionados/reforçados em `next.config.mjs`:

| Header | Valor | Porquê |
|---|---|---|
| `Content-Security-Policy` | política restrita, permite apenas GTM/GA4/Meta Pixel/HubSpot/YouTube/Vimeo | Mitiga XSS e injeção de scripts de terceiros não autorizados |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Força HTTPS em todos os pedidos futuros (2 anos) |
| `X-Frame-Options` | `SAMEORIGIN` | Mitiga clickjacking |
| `X-Content-Type-Options` | `nosniff` | Impede MIME-sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Reduz fuga de dados no referrer |
| `Permissions-Policy` | câmara/microfone/geolocalização desativados | Reduz superfície de ataque — o site não usa nenhuma destas APIs |

Outros pontos verificados:
- Nenhum segredo (`HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID`) é exposto ao
  cliente — só variáveis `NEXT_PUBLIC_*` chegam ao browser; os IDs do
  HubSpot só existem no runtime do servidor (`app/api/contact/route.ts`).
- Formulário protegido por honeypot + validação server-side + checkbox de
  consentimento RGPD obrigatória.
- `poweredByHeader: false` — não expõe a versão do Next.js no header
  `X-Powered-By`.

## Responsividade

- Breakpoints customizados (560 / 980 / 1280 / 1440px) espelham exatamente
  os pontos de quebra do design original — grelhas, navegação (menu mobile
  com overlay full-screen) e tipografia fluida (`clamp()`) testados em todas
  as secções via revisão de código.
- Slider de Antes/Depois e Timeline com scroll horizontal adaptados a ecrã
  tátil (`overflow-x:auto`).

## Bugs corrigidos nesta fase

1. `.hero` não tinha `position:relative` explícito — dependia implicitamente
   de uma regra global removida na migração para Next.js; os elementos
   absolutamente posicionados dentro do hero (imagem, conteúdo, scroll cue)
   podiam colapsar de forma imprevisível. Corrigido.
2. Hierarquia de headings inválida em `Timeline` e `Team` (ver Acessibilidade).
3. Elementos decorativos anunciados incorretamente por leitores de ecrã (ver
   Acessibilidade).

## Pendente — bloqueado por autenticação

- **Deploy final, domínio `dsprojects.pt`, HTTPS**: requer login numa conta
  Vercel e acesso ao DNS do domínio. Ver checklist final desta fase.
