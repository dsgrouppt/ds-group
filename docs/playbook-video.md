# Playbook de Vídeo — Portefólio e Hero DS Projects

*Guia prático de gravação e entrega de vídeo. O website suporta três tipos de vídeo, cada um com um propósito e especificação técnica diferente — usar o tipo certo no sítio certo é o que faz o site parecer premium em vez de lento ou amador.*

## 1. Os três tipos de vídeo do site (não confundir)

### A. Vídeo de fundo da Hero (`heroMedia.videoUrl`)
- **O que é:** um clip curto, mudo, em loop, atrás do título da homepage — o que um visitante vê nos primeiros 5 segundos.
- **Alojamento:** ficheiro próprio (self-hosted), nunca YouTube/Vimeo — um leitor embutido do YouTube mostra controlos/chrome que quebram o efeito de fundo.
- **Especificação:**
  - Duração: 8-15 segundos, a repetir em loop sem corte visível (o início e o fim devem "encaixar").
  - Sem som (é sempre reproduzido mudo) — não gravar dependente de áudio.
  - Orientação horizontal, mínimo 1920×1080, formato `.mp4` (H.264) já comprimido — ficheiros grandes atrasam o carregamento da página mais importante do site.
  - Conteúdo: movimento lento e elegante — uma câmara em travelling suave por uma obra concluída, um detalhe de acabamento em foco progressivo, nunca um corte rápido tipo anúncio.
  - O sistema já respeita `prefers-reduced-motion` automaticamente (mostra uma fotografia fixa em vez do vídeo a quem tem essa preferência ativada no dispositivo) — não precisas de te preocupar com isso.

### B. Vídeos de processo / por obra (galeria do estudo de caso)
- **O que é:** vídeos dentro da página de uma obra específica — making-of, timelapse de progresso, tour final ao espaço.
- **Alojamento:** YouTube ou Vimeo, de preferência **não listado** (unlisted) — aparece no site via embed, mas não é encontrado a pesquisar na plataforma. Isto mantém o site rápido (o vídeo só carrega quando o visitante clica) sem exigir alojamento próprio de vídeos pesados.
- **Especificação:** sem limite rígido de duração, mas 30-90 segundos para um timelapse e 1-3 minutos para um tour tendem a manter melhor a atenção. Horizontal ou vertical — o sistema já sabe adaptar o layout consoante a orientação real do vídeo.

### C. Vídeos de testemunho
- **O que é:** um cliente (com autorização explícita) a falar sobre a experiência.
- **Alojamento:** mesmo princípio do tipo B — YouTube/Vimeo não listado.
- **Especificação:** 30-60 segundos é o ideal — testemunhos longos perdem quem está a decidir se contacta ou não. Gravação horizontal para a grelha de testemunhos, mas vertical funciona igualmente bem (útil para reaproveitar depois em redes sociais — ver `playbook-redes-sociais.md`). **Nunca gravar ou publicar sem autorização explícita e documentada do cliente** — a mesma regra dos testemunhos de texto.

## 2. O que gravar por obra

- **Drone/aérea** (se disponível): plano geral do exterior/telhado antes e depois — forte para moradias e projetos maiores, dispensável para uma cozinha isolada.
- **Timelapse de progresso**: útil sobretudo em obras mais longas (moradias, projetos premium) — mostra profissionalismo sem exigir edição complexa (uma câmara fixa a fotografar a intervalos já chega).
- **Tour final**: uma câmara em movimento contínuo e lento pelo espaço concluído, sem cortes bruscos.

## 3. Nomenclatura e organização (para o `audit-media.mjs` classificar sozinho)

Mesmas palavras-chave do playbook de fotografia aplicam-se a vídeo — `drone`, `antes`, `durante`, `depois` no nome do ficheiro ou da pasta. Guardar os vídeos brutos na mesma estrutura de pastas por obra (`obra-cascais-01/durante/timelapse-01.mp4`, por exemplo).

`ffprobe` (parte do `ffmpeg`) precisa de estar instalado na máquina onde correres o script de auditoria para detetar automaticamente a orientação (horizontal/vertical) dos vídeos — sem isso, os vídeos ainda são classificados por nome de ficheiro/pasta, só não por metadados reais. Se não tiveres a certeza se está instalado, avisa-me quando chegarmos a essa fase e eu confirmo.

## 4. Fluxo de entrega

1. Gravas/recebes os vídeos brutos.
2. Para o vídeo de fundo da Hero (tipo A): eu (ou tu) comprimo/corto o clip final e coloco-o em `public/` — depois só é preciso preencher `heroMedia.videoUrl` em `lib/site-data.ts` (uma linha, sem mais alterações de código).
3. Para vídeos de processo e testemunhos (tipos B e C): fazes upload a uma conta YouTube ou Vimeo da DS Projects, marcas como não listado, copias o link de embed, e esse link entra no DS OS (campo "Link de embed" na obra ou no testemunho).
4. Publicas normalmente através do fluxo do CMS interno (`website-cms-integracao.md`).

## 5. O que ainda precisa de decisão tua

- Conta YouTube ou Vimeo da empresa para alojar os vídeos tipo B/C (ainda não existe/não foi confirmada) — sem isto, os vídeos não têm onde ficar alojados.
- Confirmar se há capacidade de gravar drone internamente ou se será um serviço externo pontual — não bloqueia o lançamento, só a riqueza do conteúdo inicial.
