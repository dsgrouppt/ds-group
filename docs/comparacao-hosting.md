# Comparação de Hosting e Arquitetura de Deploy — DS Group

*Análise para decidir onde alojar o website, a plataforma DS OS, a base de dados e os uploads. Nenhuma decisão foi tomada por nós — tudo está preparado para qualquer uma das opções, a escolha é da empresa.*

## Contexto que pesou na análise

A DS Group é uma empresa de remodelações, não uma empresa de tecnologia — não tem (nem deve precisar de ter) uma pessoa dedicada a operações de servidor. Isto pesa mais do que o preço mais baixo possível: o critério principal foi **esforço operacional**, depois custo, depois desempenho bruto.

## Comparação

| | Vercel | Railway | Render | VPS genérico | Hetzner |
|---|---|---|---|---|---|
| Ideal para | Website (Next.js nativo) | Plataforma + BD | Plataforma + BD | Controlo total | Controlo total, custo mínimo |
| Disco persistente | Não (serverless) | Sim | Sim | Sim | Sim |
| Postgres gerido | Só via parceiro (ex. Neon) | Sim, nativo | Sim, nativo | Não — auto-gerido | Não — auto-gerido |
| SSL automático | Sim | Sim | Sim | Manual (Certbot) | Manual (Certbot) |
| Esforço de manutenção | Nenhum | Muito baixo | Muito baixo | Alto (patches, segurança, monitorização, tudo manual) | Alto |
| Custo estimado/mês* | Grátis–20€ | 10–25€ (app+BD) | 15–35€ (app+BD, sem cold-start) | 5–15€ (só a máquina) | 4–10€ (só a máquina) |
| Escala automaticamente | Sim | Sim (vertical fácil) | Sim (vertical fácil) | Manual | Manual |

*Estimativas para o volume esperado da DS Group (uma equipa pequena, não milhares de utilizadores simultâneos) — não inclui o tempo/custo de gestão de um VPS.

## Recomendação

**Website → Vercel.** É a plataforma feita pela mesma equipa do Next.js — zero configuração, deploy automático a cada `git push`, CDN global incluído, SSL automático, e o tier gratuito cobre confortavelmente o tráfego esperado de um site institucional. Não há razão técnica para complicar isto.

**Plataforma (DS OS) → Railway.** Ao contrário do website, a plataforma precisa de um processo sempre ativo (sessões, Prisma, upload de ficheiros em disco) — não é um bom encaixe para serverless puro sem antes migrar o armazenamento para object storage. O Railway resolve isto sem esforço: disco persistente incluído, Postgres gerido no mesmo painel (reduz a dispersão por vários fornecedores), preço previsível para o volume de uma equipa pequena, e não tem o problema de "adormecer" que o tier gratuito do Render tem (importante — a plataforma vai ser usada durante o horário de trabalho, uma pessoa não deve ter de esperar 30 segundos pelo primeiro pedido do dia).

**Base de dados → Postgres gerido do Railway** (mais simples, um único fornecedor a gerir) **ou Neon** como alternativa, se a empresa preferir uma base de dados com branching/staging mais sofisticado no futuro — ambos funcionam sem alterar uma linha de código, é só trocar `DATABASE_URL`.

**Uploads → o disco persistente do Railway**, sem qualquer alteração de código — a arquitetura atual já está pronta para isto. Se um dia se migrar o website ou a plataforma para um hosting 100% serverless (ex. tudo em Vercel), aí sim é preciso migrar `platform/src/lib/storage.ts` para object storage (S3/R2/Supabase Storage) — mudança isolada a um único ficheiro, documentada em `docs/manual-tecnico-operacoes.md`.

**VPS/Hetzner**: fica como opção de reserva, não como primeira escolha. É genuinamente a opção mais barata em euros por mês, mas transfere para a empresa (ou para quem a empresa contratar) a responsabilidade de aplicar patches de segurança, configurar SSL manualmente, montar monitorização do zero e recuperar de uma falha de servidor sozinha. Só faz sentido escolher isto se a empresa vier a ter (ou contratar) apoio técnico dedicado — nesse caso, o `Dockerfile` e o `docker-compose.yml` preparados nesta fase tornam a migração para um VPS/Hetzner tão simples quanto correr `docker compose up` no servidor.

## O que ficou preparado, independentemente da escolha

- `platform/Dockerfile` e `website/Dockerfile` — build multi-stage, imagem final mínima (usa o output `standalone` do Next.js), testado localmente (`next build` gera corretamente a pasta `.next/standalone` e o motor do Prisma é incluído automaticamente).
- `docker-compose.yml` (raiz do repositório) + `.env.docker.example` — stack completa (website + plataforma + Postgres) para o cenário VPS/Hetzner, com um volume dedicado para os uploads.
- `platform/railway.json` — configuração pronta para deploy direto no Railway (health check ligado a `/api/health`, reinício automático em falha).
- `render.yaml` — blueprint pronto para deploy direto no Render, caso essa seja a escolha em vez do Railway.
- Vercel não precisa de nenhum ficheiro de configuração — deteta e configura automaticamente qualquer projeto Next.js.

**Nota de transparência**: os `Dockerfile` e `docker-compose.yml` foram validados ao nível de código (build local confirma que o output `standalone` e o cliente Prisma ficam corretos) mas não foi possível correr `docker build`/`docker compose up` de facto neste ambiente (sem acesso a Docker). Recomenda-se um primeiro teste de build real antes do primeiro deploy — é uma verificação de minutos, não um risco técnico à espera de acontecer.
