# Relatório — Segunda Ronda de Auditoria (9 Prioridades)

*Continuação de `docs/relatorio-final-cto.md`. Esta ronda focou-se em preencher lacunas concretas que a primeira auditoria não cobriu (favicon/manifest, Dockerfiles, comparação de hosting) e em encontrar problemas novos através de testes reais mais profundos — não em repetir o que já estava confirmado.*

## Prioridade 1 — Website

**Encontrado e corrigido**: faltava favicon.ico, apple-touch-icon e ícones PWA (só existia o SVG); faltava web app manifest; faltava `viewport`/`theme-color` explícito. Gerados a partir do monograma de marca já existente (preto + "DS" + traço dourado) — nenhuma imagem inventada. `display: "browser"` no manifest, deliberadamente, não `"standalone"`: um site institucional não justifica um prompt de instalação de app.

**Confirmado sem alterações necessárias** (testado ao vivo): as 32 rotas, SEO/OG/Twitter/canonical, JSON-LD, cabeçalhos de segurança, cache imutável em assets estáticos, sitemap/robots, sem links externos por agora.

## Prioridade 2 — Deploy

**Encontrado e corrigido**: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` era lida no código mas não estava documentada no `.env.local.example`.

**Confirmado**: builds limpos do zero em ambas as apps, os dois workflows de CI válidos, scripts de backup/restauro sintaticamente corretos, health check e redirecionamento de autenticação a funcionar ao vivo.

## Prioridade 3 — Hosting

Comparados Vercel, Railway, Render, VPS genérico e Hetzner. **Recomendação**: website → Vercel; plataforma + base de dados → Railway (disco persistente para uploads, Postgres gerido no mesmo painel, sem o "adormecimento" do tier gratuito do Render). VPS/Hetzner preparado como alternativa de reserva, não escolha inicial, dado que a empresa não tem equipa de operações dedicada.

**Preparado, independentemente da escolha final**: `Dockerfile` para as duas apps (`output: "standalone"`, testado localmente), `docker-compose.yml` + `.env.docker.example` para o cenário VPS, `railway.json`, `render.yaml`. Ver `docs/comparacao-hosting.md`.

## Prioridade 4 — Segurança

**Encontrado e corrigido — o achado mais importante desta ronda**: a rota `/api/files/[id]` (download de anexos) verificava a sessão com `!session?.user` em vez de `!session?.user?.id`. Isto contornava, só nesta rota, a proteção de revogação de sessão construída na auditoria anterior — uma conta desativada continuaria, na prática, a conseguir descarregar ficheiros através desta rota específica, mesmo com a sessão supostamente revogada. Corrigido para o mesmo padrão usado em `requireUser()`; confirmado por varrimento que era o único ponto do código com este problema.

**Também corrigido**: sem rate limiting no formulário de contacto do website (podia ser usado para submissões repetidas contra o HubSpot) — adicionado o mesmo padrão já usado no login da plataforma; um administrador podia remover o seu próprio perfil de Administrador sem hipótese de reverter — adicionada a mesma proteção que já existia contra auto-desativação.

**Confirmado sem problemas novos**: zero SQL injection (Prisma parametriza tudo, único `$queryRaw` é um `SELECT 1` sem interpolação), zero XSS via `dangerouslySetInnerHTML` (só JSON.stringify de dados estáticos), CSRF coberto nativamente pelos Server Actions do Next 14, cookies de sessão com as flags corretas por omissão do NextAuth (nenhuma configuração insegura sobreposta).

## Prioridade 5 — Performance

**Encontrado e corrigido**: `sharp` não estava instalado no website — o `next/image` usa um fallback WASM mais lento em produção sem ele; a própria documentação do Next.js recomenda instalá-lo explicitamente. Zero vulnerabilidades novas confirmadas (as que aparecem no `npm audit` são as mesmas já documentadas, dependentes da subida para Next.js 16, decisão já conscientemente adiada).

**Confirmado sem problemas**: zero queries N+1, zero fuga de dependências server-only (Prisma/bcrypt) para bundles de cliente, Tailwind com purga configurada corretamente nas duas apps, bundle JS partilhado ~87KB.

## Prioridade 6 — UX

**Encontrado e corrigido**: nenhum botão de submissão mostrava estado de "a processar" — em ligações lentas, um duplo-clique podia criar registos duplicados. Criado `SubmitButton` (usa `useFormStatus` do React 18) e aplicado nos 19 pontos de submissão de formulário em todos os 9 módulos, incluindo o upload de anexos (onde a demora de rede é mais notada).

## Prioridade 7 — Plataforma

Reteste completo, ao vivo, contra Postgres real: 11 testes da primeira ronda (cliente → negócio → automação de obra → margem → tarefa+comentário → anexos → fatura+pagamento) + 4 testes novos nesta ronda (Marketing: criar/editar campanha; RH: criar/editar funcionário; Agenda: criar/editar evento; eliminação confirmada nos três). 15 de 15 testes passaram. Nenhum problema novo de CRUD, permissões, automações ou cálculos.

## Prioridade 8 — Lançamento

Adicionada secção dedicada de **Disaster Recovery** ao manual técnico (não existia antes como cenário distinto do backup do dia a dia) — runbooks para perda total de servidor, corrupção/eliminação em massa de dados e credenciais comprometidas, com RPO de 24h e RTO de 1–2h como objetivos realistas para o porte da empresa.

## Prioridade 9 — Execução contínua

Concluída sem interrupções — todas as 8 prioridades tratadas em sequência, sem pedir confirmação intermédia, conforme instruído. Nenhuma decisão pendente exigiu password, MFA, pagamento ou decisão comercial nesta ronda.

---

Todas as alterações desta ronda estão commitadas e sincronizadas na pasta partilhada. Ver `docs/comparacao-hosting.md` (nova) e a secção 7 de `docs/manual-tecnico-operacoes.md` (Disaster Recovery, nova) para o detalhe completo.
