# DS Projects — Website (Next.js)

Website de produção da DS Projects (empresa DS Group). Next.js 14 (App Router),
TypeScript, Tailwind CSS, Framer Motion. Construído a partir da versão estática
v2.0 (`/DS GROUP - ESTRATEGIA/02_WEBSITE/site`), mantendo o mesmo sistema
visual (Brand Book DS Group).

## Stack

- **Next.js 14 / App Router** — renderização estática (SSG) por omissão, rotas de API para o formulário.
- **TypeScript** — tipagem em toda a aplicação (`src/types`).
- **Tailwind CSS** — utilitários + `globals.css` com o sistema visual da marca (variáveis de cor, componentes).
- **Framer Motion** — animações de entrada (`<Reveal>`), parallax do hero.
- **next/font** — Fraunces + Inter self-hosted (sem pedido externo ao Google Fonts, melhora LCP/CLS).
- Sem base de dados nem CMS — todo o conteúdo vive em `src/lib/site-data.ts` (ver abaixo).

## Como correr localmente

```bash
npm install
cp .env.local.example .env.local   # preencher com os valores reais
npm run dev
```

Abrir http://localhost:3000.

## Estrutura

```
src/
  app/                    # rotas (App Router)
    layout.tsx            # layout raiz: fontes, GTM/GA4/Pixel, JSON-LD da organização
    page.tsx              # homepage
    portfolio/page.tsx     # portefólio completo com filtro (?categoria=)
    servicos/[slug]/page.tsx  # 6 páginas de serviço geradas estaticamente
    api/contact/route.ts  # submissão do formulário para o HubSpot
    sitemap.ts / robots.ts
  components/
    layout/               # Header, Footer, CustomCursor
    sections/             # Hero, Services, Method, BeforeAfter, Timeline, Team, etc.
    forms/ContactForm.tsx
    analytics/Analytics.tsx
    ui/                   # PlaceholderMedia, Reveal, LinkArrow
  lib/
    site-data.ts          # fonte única de conteúdo (serviços, projetos, equipa, stats)
    seo.ts                # metadata + JSON-LD
    analytics.ts          # helpers gtag/fbq/dataLayer
```

## Conteúdo e fotografia real

Todo o conteúdo "de negócio" está centralizado em `src/lib/site-data.ts`.
**Não há necessidade de tocar em componentes para atualizar texto, projetos,
estatísticas ou equipa** — editar esse ficheiro é suficiente.

- **Estatísticas (`stats`)**: `value: null` mostra um travessão com a nota "a
  atualizar". Substituir por uma string (ex.: `"150"`) assim que existir dado
  real — propaga automaticamente à `DataStrip`.
- **Projetos (`projects`)**: sem `image`, mostra o placeholder identificado
  ("Fotografia real DS — a inserir"). Definir `image: "/projetos/nome.jpg"`
  (colocado em `public/`) ou uma URL de CDN ativa `next.config.mjs →
  images.remotePatterns` assim que existir fotografia.
- **Equipa (`team`)**: mesmo mecanismo — `name: null` e `image` omitido.
- **Vídeos (`videos`, `videoTestimonials`)**: definir `embedUrl` (URL de embed
  do YouTube/Vimeo) para trocar o placeholder por um `<iframe>` real.

Este padrão (placeholder explícito em vez de conteúdo inventado) é
propositado — nunca publicar números, fotos ou testemunhos fictícios.

## Analytics (GA4, GTM, Meta Pixel)

Configurar em `.env.local`:

```
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_META_PIXEL_ID=
```

**Recomendação:** usar o GTM como camada única (`NEXT_PUBLIC_GTM_ID`) e gerir
as tags de GA4 e Meta Pixel a partir do próprio contentor GTM. Só preencher
`NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_META_PIXEL_ID` diretamente se **não**
estiverem a ser carregados via GTM — caso contrário, os pageviews disparam
em duplicado.

O pageview em navegação entre páginas é disparado manualmente em
`AnalyticsPageView` (necessário no App Router, que não gera este evento
automaticamente como o Pages Router). O envio de um lead (submissão do
formulário com sucesso) dispara `generate_lead` / `Lead` via
`trackLeadConversion()` em `src/lib/analytics.ts`.

## Formulário de contacto → HubSpot

O formulário (`ContactForm.tsx`) envia os dados para `/api/contact` (rota
interna), que por sua vez submete à **HubSpot Forms API v3**:

```
HUBSPOT_PORTAL_ID=00000000
HUBSPOT_FORM_GUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Criar o formulário em HubSpot → Marketing → Formulários, com campos
correspondentes a `firstname`, `email`, `phone`, `project_type`,
`budget_range`, `message` (criar as duas últimas como propriedades de
contacto personalizadas se ainda não existirem).

Proteções incluídas: honeypot (campo-armadilha invisível), validação de
email, checkbox de consentimento RGPD obrigatória. Se a conta HubSpot tiver
as opções de conformidade RGPD ativadas, ajustar o bloco
`legalConsentOptions` comentado em `src/app/api/contact/route.ts`.

Se o site tiver também o tracking script do HubSpot instalado
(`hs-scripts.com`), a submissão liga-se automaticamente ao histórico de
navegação do visitante através do cookie `hubspotutk`.

## SEO

- Metadata por página via `generateMetadata` / `buildMetadata()` (title, description, canonical, Open Graph, Twitter Card).
- JSON-LD: organização (layout raiz), `Service` + `BreadcrumbList` em cada página de serviço.
- `sitemap.ts` e `robots.ts` nativos do Next.js — sitemap inclui automaticamente qualquer serviço novo adicionado a `site-data.ts`.
- Imagens otimizadas via `next/image` assim que `PlaceholderMedia` receber `src` real (AVIF/WebP automático, lazy-loading, `sizes` responsivo).
- Fontes self-hosted via `next/font` (sem bloqueio de renderização por pedido externo).

## Performance

- A maioria dos componentes são Server Components (zero JS extra); só
  `Header`, `CustomCursor`, `BeforeAfter`, `ProjectsGrid`, `ContactForm`,
  `Reveal` e `Analytics` correm no cliente, exatamente onde há interatividade.
- `next.config.mjs` já define headers de segurança básicos e compressão.
- Sem dependências pesadas — apenas Framer Motion além do próprio Next/React.

## Deploy

Otimizado para [Vercel](https://vercel.com) (zero configuração adicional) ou
qualquer plataforma que suporte Next.js 14 (Netlify, Railway, self-hosted com
`next start`). Definir todas as variáveis de `.env.local.example` no painel
da plataforma de deploy antes do primeiro build de produção.

## Antes de publicar

1. Substituir todos os placeholders de fotografia/vídeo por conteúdo real (ver secção "Conteúdo e fotografia real").
2. Validar juridicamente as páginas `/politica-de-privacidade` e `/termos` (atualmente placeholders explícitos).
3. Preencher `NEXT_PUBLIC_SITE_URL` com o domínio final antes do build (usado em metadata, sitemap e JSON-LD).
4. Confirmar o formulário HubSpot com um envio de teste em produção.
5. Validar GTM/GA4/Meta Pixel com o Tag Assistant / Meta Pixel Helper antes de considerar o tracking "ligado".
