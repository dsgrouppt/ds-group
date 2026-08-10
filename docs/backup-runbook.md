# Runbook de Backups — Base de Dados e Uploads DS OS (PostgreSQL + Volume / Railway)

Última validação: 2026-08-10. Sistema implementado e testado com um restauro real da base de dados (não apenas simulado). Cobertura de uploads adicionada em 2026-08-10 (ver secção 2b) e validada com uma execução real em produção.

## 1. Visão geral

A base de dados de produção (`ds-os-db`, PostgreSQL 18 no Railway, projeto `dynamic-tenderness` / ambiente `production`) é protegida por um serviço dedicado chamado **`postgres`** que corre `pg_dump` diariamente, aplica retenção em três níveis (diário/semanal/mensal) e guarda os dumps num volume persistente (`postgres-volume`, montado em `/backups`).

Este mesmo serviço `postgres` foi estendido para também fazer backup diário do **volume de uploads** (contratos, fotos de obra, documentos anexados) do serviço `ds-os-platform`, com a mesma política de retenção — ver secção 2b.

Este serviço **não é** a base de dados em si — é um "cron job" (imagem Docker `postgres:18-bookworm`, sem processo persistente) que arranca uma vez por dia, corre o script de backup, e termina.

### Porque a imagem tem de ser `postgres:18-bookworm`

`pg_dump` não consegue fazer dump de um servidor com uma versão major **superior** à sua própria. A base de dados de produção corre Postgres 18.4, logo a imagem do serviço de backup tem de ser Postgres 18.x. (Foi detetado e corrigido um bug real neste projeto em que o serviço estava configurado com `postgres:16-bookworm`, o que fazia o `pg_dump` falhar sempre — ver secção 7.)

## 2. Onde ficam os backups (base de dados)

- **Localização física**: volume `postgres-volume`, montado em `/backups` dentro do serviço `postgres`, na mesma conta/projeto Railway (`dynamic-tenderness`).
- **Formato**: `pg_dump -Fc` (formato custom, comprimido, restaurável com `pg_restore`).
- **Nomenclatura**:
  - `db-YYYYMMDD-HHMMSS.dump` — dump diário
  - `weekly-YYYYMMDD-HHMMSS.dump` — cópia do dump quando o dia da semana é domingo (`date +%u` = 7)
  - `monthly-YYYYMMDD-HHMMSS.dump` — cópia do dump quando é dia 1 do mês (`date +%d` = 01)

### Nota honesta sobre "armazenamento externo"

Os backups estão num volume persistente **dentro da mesma conta Railway**, não num provedor terceiro totalmente separado (ex.: S3, Backblaze, outra cloud). Isto protege contra: corrupção de dados na tabela, erro humano (DELETE/UPDATE indevido), bug de aplicação que destrói dados, falha do container da base de dados. **Não protege** contra: perda total da conta Railway, compromisso da conta Railway, ou um incidente que afete toda a região/projeto Railway simultaneamente. Para mitigar este risco residual, recomenda-se — como melhoria futura — replicar periodicamente os dumps para um destino fora da Railway (ex.: bucket S3/R2 com credenciais próprias). Esta melhoria não foi implementada nesta fase por estar fora do âmbito imediato (ver secção 11, "Trabalho futuro").

## 2b. Onde ficam os backups (uploads / ficheiros anexados)

**Contexto do bug corrigido**: até 2026-08-10, o backup diário cobria apenas a base de dados. Os ficheiros anexados (contratos assinados, fotos de obra, documentos) vivem num volume Railway diferente (`ds-os-platform-ds-os-uploads`, montado em `STORAGE_DIR` dentro do serviço `ds-os-platform`), que nunca tinha qualquer cobertura de backup — a funcionalidade nativa "Backups" da Railway só está disponível no plano Pro, que esta conta não tem. Risco real: perda deste volume apagaria permanentemente todos os anexos de todos os clientes, com os registos `Attachment` na base de dados a apontar para ficheiros inexistentes. Para uma plataforma pensada para "centenas de clientes", isto era uma lacuna crítica de continuidade de negócio (classificada como ALTO na auditoria adversarial de 2026-08-10).

**Solução implementada**:

1. Novo endpoint interno em `ds-os-platform`: `GET /api/internal/uploads-backup` (`src/app/api/internal/uploads-backup/route.ts`), protegido por um token partilhado (`BACKUP_INTERNAL_TOKEN`, nunca pela sessão de utilizador normal). Empacota `STORAGE_DIR` em `.tar.gz` num ficheiro temporário e devolve-o com um cabeçalho `Content-Length` explícito (importante — ver nota técnica abaixo). O `middleware.ts` foi ajustado para deixar `/api/internal/*` passar sem verificação de sessão (nunca é chamado por um browser).
2. O script de backup do serviço `postgres` foi estendido para, depois do `pg_dump`, descarregar este tarball via rede privada da Railway e guardá-lo em `/backups` com a mesma política de retenção (secção 3).

**Nota técnica importante — porque não se usa `curl`**: a imagem `postgres:18-bookworm` **não tem `curl` nem `wget` instalados** (confirmado por diagnóstico direto no container). O fetch é por isso feito em **bash puro via `/dev/tcp`** (feature nativa do bash, sem dependências externas), construindo o pedido HTTP manualmente e usando `dd` para uma cópia binária exata do corpo da resposta. Por essa razão o endpoint tem de devolver um `Content-Length` explícito em vez de streaming com `Transfer-Encoding: chunked` — um parser de chunked encoding em bash puro seria demasiado frágil para um script de backup sem supervisão humana. A lógica foi validada localmente byte-a-byte (comparação `md5sum`) antes de ser aplicada em produção, incluindo os casos de falha (token inválido, resposta sem `Content-Length`).

**Nota técnica — porta interna**: o `Dockerfile` de `ds-os-platform` define `ENV PORT=3001`, mas a Railway injeta a sua própria variável `PORT` em runtime (que tem precedência sobre o `ENV` do Dockerfile), pelo que o serviço escuta na realidade na **porta 8080** dentro da rede privada da Railway. Isto foi confirmado em Settings → Networking → Public Networking do serviço `ds-os-platform` (mostra "Port 8080") e validado com uma tentativa real de ligação. O endereço usado no script é `ds-os-platform.railway.internal:8080`.

- **Localização física**: mesmo volume `postgres-volume`, ficheiros `uploads-*.tar.gz` ao lado dos `db-*.dump`.
- **Formato**: `.tar.gz` (conteúdo completo de `STORAGE_DIR`, preservando a estrutura de subpastas).
- **Nomenclatura**: `uploads-daily-YYYYMMDD-HHMMSS.tar.gz`, `uploads-weekly-YYYYMMDD-HHMMSS.tar.gz`, `uploads-monthly-YYYYMMDD-HHMMSS.tar.gz` — mesmas regras de criação (semanal ao domingo, mensal no dia 1) que os dumps da base de dados.
- **Comportamento em caso de falha**: se o fetch dos uploads falhar por qualquer razão (token em falta, ligação recusada, resposta sem `Content-Length`), o script regista um aviso (`[backup] AVISO: ...`) e **continua sem erro fatal** — o backup da base de dados, já concluído nesse momento, nunca é invalidado por uma falha no passo dos uploads.

## 3. Política de retenção

| Tipo | Frequência de criação | Retenção |
|---|---|---|
| Diário (`db-*.dump` / `uploads-daily-*.tar.gz`) | Todos os dias às 00:00 UTC | 7 dias |
| Semanal (`weekly-*.dump` / `uploads-weekly-*.tar.gz`) | Aos domingos | 28 dias |
| Mensal (`monthly-*.dump` / `uploads-monthly-*.tar.gz`) | Dia 1 de cada mês | 365 dias |

A limpeza é feita no fim de cada execução via `find /backups -maxdepth 1 -name "<padrão>" -mtime +N -delete`, com prefixos distintos (`db-`/`weekly-`/`monthly-` vs `uploads-daily-`/`uploads-weekly-`/`uploads-monthly-`) para que a retenção de um tipo nunca apague ficheiros do outro.

## 4. Agendamento (cron)

- Serviço: `postgres` (ID `235d8bcc-8613-4b22-a0b8-0810fd87c5a3`)
- Cron: `0 0 * * *` (diariamente à meia-noite UTC), configurado em Settings → Deploy → Cron Schedule
- Pode ser despoletado manualmente em qualquer altura via a tab **Cron Runs** → botão **Run now**
- O mesmo agendamento cobre agora ambos os passos (base de dados + uploads) numa única execução.

## 5. Script de backup (Custom Start Command do serviço `postgres`)

```bash
bash -c 'set -e; mkdir -p /backups; TS=$(date +%Y%m%d-%H%M%S); DOW=$(date +%u); DOM=$(date +%d); FILE=/backups/db-$TS.dump; echo "[backup] Starting pg_dump at $TS"; pg_dump "$DATABASE_URL" -Fc -f "$FILE"; SIZE=$(du -h "$FILE" | cut -f1); echo "[backup] Created $FILE ($SIZE)"; if [ "$DOM" = "01" ]; then cp "$FILE" /backups/monthly-$TS.dump; fi; if [ "$DOW" = "7" ]; then cp "$FILE" /backups/weekly-$TS.dump; fi; find /backups -maxdepth 1 -name "db-*.dump" -mtime +7 -delete; find /backups -maxdepth 1 -name "weekly-*.dump" -mtime +28 -delete; find /backups -maxdepth 1 -name "monthly-*.dump" -mtime +365 -delete; echo "[backup] Retention (DB) applied."; UPFILE=/backups/uploads-daily-$TS.tar.gz; if [ -n "$BACKUP_INTERNAL_TOKEN" ]; then if exec 3<>/dev/tcp/ds-os-platform.railway.internal/8080; then printf "GET /api/internal/uploads-backup HTTP/1.1\r\nHost: ds-os-platform.railway.internal\r\nAuthorization: Bearer %s\r\nConnection: close\r\n\r\n" "$BACKUP_INTERNAL_TOKEN" >&3; STATUS_LINE=""; CL=""; N=0; while IFS= read -r LINE <&3; do LINE="${LINE%[[:cntrl:]]}"; N=$((N+1)); if [ "$N" -eq 1 ]; then STATUS_LINE="$LINE"; fi; if [ -z "$LINE" ]; then break; fi; LOWER="${LINE,,}"; case "$LOWER" in content-length:*) CL="${LINE#*:}"; CL="${CL# }" ;; esac; done; echo "[backup] uploads status: $STATUS_LINE"; case "$STATUS_LINE" in "HTTP/1.1 200"*) if [ -n "$CL" ] && [ "$CL" -gt 0 ] 2>/dev/null; then dd bs="$CL" count=1 iflag=fullblock <&3 > "$UPFILE" 2>/dev/null; exec 3<&- 3>&-; ACTUAL=$(stat -c%s "$UPFILE" 2>/dev/null || echo 0); if [ "$ACTUAL" = "$CL" ]; then USIZE=$(du -h "$UPFILE" | cut -f1); echo "[backup] Created $UPFILE ($USIZE)"; if [ "$DOM" = "01" ]; then cp "$UPFILE" /backups/uploads-monthly-$TS.tar.gz; fi; if [ "$DOW" = "7" ]; then cp "$UPFILE" /backups/uploads-weekly-$TS.tar.gz; fi; find /backups -maxdepth 1 -name "uploads-daily-*.tar.gz" -mtime +7 -delete; find /backups -maxdepth 1 -name "uploads-weekly-*.tar.gz" -mtime +28 -delete; find /backups -maxdepth 1 -name "uploads-monthly-*.tar.gz" -mtime +365 -delete; echo "[backup] Retention (uploads) applied."; else echo "[backup] AVISO: tamanho recebido nao bate com Content-Length -- descartado."; rm -f "$UPFILE"; fi; else echo "[backup] AVISO: resposta sem Content-Length valido -- uploads nao copiados hoje."; exec 3<&- 3>&-; fi ;; *) echo "[backup] AVISO: pedido de uploads falhou -- uploads nao copiados hoje."; exec 3<&- 3>&- ;; esac; else echo "[backup] AVISO: nao foi possivel ligar a ds-os-platform.railway.internal:8080 -- uploads nao copiados hoje."; fi; else echo "[backup] AVISO: BACKUP_INTERNAL_TOKEN nao configurado -- uploads nao copiados hoje."; fi; echo "[backup] Current backups:"; ls -lh /backups; df -h /backups; echo "[backup] Backup job finished successfully."'
```

Variáveis de ambiente necessárias no serviço `postgres`:
- `DATABASE_URL` = `${{ds-os-db.DATABASE_URL}}` (referência Railway, resolvida automaticamente — nunca é necessário copiar a password manualmente).
- `BACKUP_INTERNAL_TOKEN` — token partilhado usado para autenticar o pedido ao endpoint interno de uploads. Tem de ter **exatamente o mesmo valor** na variável `BACKUP_INTERNAL_TOKEN` do serviço `ds-os-platform`. Gerado uma única vez e copiado manualmente para ambos os serviços (não é uma referência Railway automática, porque não há relação de "reference" nativa entre dois serviços não-base-de-dados).

## 6. Procedimento de restauro (passo-a-passo)

Em caso de perda ou corrupção de dados em produção:

1. **Não apagar nem alterar** a base de dados de produção antes de confirmar qual o dump correto a usar.
2. Identificar o dump a restaurar. Via Railway → serviço `postgres` → tab **Console**, ou através de uma execução manual com `ls -lh /backups`, listar os dumps disponíveis e escolher o mais recente anterior ao incidente.
3. Criar um alvo de restauro temporário para validar o dump **antes** de tocar em produção:
   - Adicionar um novo serviço Docker Image `postgres:18-bookworm` (mesma major version que produção) no projeto Railway, com `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` definidos como credenciais novas e descartáveis.
   - (Nota: o plano atual do Railway tem um limite de 3 volumes por projeto — se esse limite estiver esgotado, usar uma imagem Docker Postgres simples sem volume anexado é suficiente para um alvo de restauro temporário e descartável.)
4. Restaurar o dump escolhido no alvo temporário:
   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges -d "$RESTORE_TARGET_URL" /backups/<ficheiro>.dump
   ```
5. Validar integridade comparando contagens de registos das tabelas principais entre produção e o alvo restaurado (`Client`, `Project`, `Task`, `User`, e outras relevantes):
   ```bash
   psql "$DATABASE_URL" -tAc 'SELECT count(*) FROM "Client"'
   psql "$RESTORE_TARGET_URL" -tAc 'SELECT count(*) FROM "Client"'
   ```
   Repetir para as restantes tabelas. Os valores devem coincidir (ou refletir exatamente a diferença esperada, se o dump for anterior a alguma escrita legítima).
6. Só depois de validado o dump: coordenar uma janela de manutenção, colocar a aplicação em modo de leitura/manutenção se possível, e restaurar para a base de dados de produção real (`ds-os-db`) usando o mesmo comando `pg_restore`, apontando `-d` para o `DATABASE_URL` de produção.
7. Verificar a aplicação (login, dashboard, módulos principais) após o restauro.
8. **Apagar imediatamente** o serviço temporário de restauro criado no passo 3, para não incorrer custo residual.
9. Documentar o incidente: causa, dump usado, hora do restauro, dados eventualmente perdidos entre o último backup e o incidente (RPO real).

### Restauro dos uploads (ficheiros anexados)

Em caso de perda do volume de uploads (`ds-os-platform-ds-os-uploads`), independentemente da base de dados:

1. Identificar o `uploads-*.tar.gz` mais recente anterior ao incidente em `/backups` (serviço `postgres`).
2. Copiar esse ficheiro para o volume de uploads do serviço `ds-os-platform` (ex.: via Railway Console de `ds-os-platform`, transferindo o tarball entre serviços através de um passo intermédio — não existe hoje um mecanismo de cópia direta entre volumes de serviços diferentes na Railway, pelo que este passo pode exigir descarregar o ficheiro localmente e voltar a enviá-lo, ou expor temporariamente um segundo endpoint interno de "restore" análogo ao de backup).
3. Extrair no destino: `tar -xzf uploads-daily-<TS>.tar.gz -C "$STORAGE_DIR"`.
4. Confirmar que os `Attachment` da base de dados voltam a resolver para ficheiros existentes, testando a abertura de alguns anexos na aplicação.

**Nota**: este procedimento de restauro de uploads ainda não foi testado ponta-a-ponta com um exercício real (ao contrário do restauro da base de dados, testado em 2026-08-09/10 — ver secção 7). Recomenda-se realizar um teste de restauro de uploads análogo antes de depender totalmente deste mecanismo — ver secção 11.

### RPO e RTO atuais

- **RPO (Recovery Point Objective)**: até 24 horas (pior caso — perda de dados desde o último backup diário até ao incidente), tanto para a base de dados como para os uploads.
- **RTO (Recovery Time Objective)**: ordem de minutos para a base de dados — o processo de `pg_restore` de uma base de dados deste tamanho demora segundos a poucos minutos; o tempo dominante é o processo humano de decisão e validação. Para os uploads, o RTO depende do volume de dados e ainda não foi medido com um exercício real (ver nota acima).

## 7. Teste de restauro real (evidência — base de dados)

Em 2026-08-09/10 foi executado um teste de restauro real e não apenas teórico:

1. Foi criado um serviço Postgres 18 temporário (`fulfilling-exploration`) no mesmo projeto Railway.
2. O dump diário mais recente (`db-20260809-224729.dump`, 48 KB) foi restaurado nesse serviço via `pg_restore --clean --if-exists --no-owner --no-privileges`.
3. Foram comparadas as contagens de registos entre produção e o alvo restaurado:

   | Tabela | Produção | Restaurado |
   |---|---|---|
   | Client | 6 | 6 |
   | Project | 4 | 4 |
   | Task | 0 | 0 |
   | User | 1 | 1 |

   **Resultado: MATCH_OK** — todas as contagens coincidiram exatamente.
4. O serviço temporário foi apagado após a validação, e a variável de ambiente temporária (`RESTORE_TARGET_URL`) removida do serviço `postgres`, eliminando qualquer custo residual.

### Bug real encontrado e corrigido durante este processo

Durante a primeira tentativa de teste de restauro, a variável `RESTORE_TARGET_URL` não persistiu corretamente ao ser guardada, o que fez com que a execução agendada da meia-noite (00:01 UTC) corresse — sem erro visível à primeira vista — o script de *teste* de restauro em vez do script de *produção*, porque o Custom Start Command ainda não tinha sido revertido nesse momento. Consequência: essa noite específica não produziu um backup de produção (o backup do dia anterior manteve-se intacto, sem perda de dados, apenas um ciclo de backup falhado). Causa raiz identificada (variável não gravada) e corrigida; script de produção reposto e validado com uma execução limpa subsequente (`db-20260810-000101.dump`, 47 KB, criado com sucesso, retenção aplicada sem erros).

### Evidência da cobertura de uploads (2026-08-10)

Após a implementação descrita na secção 2b, foi executada uma verificação real (não simulada) via **Run now**:

- Primeira tentativa: falhou com `bash: connect: Connection refused` ao ligar a `ds-os-platform.railway.internal:3001` — a porta assumida (3001, definida no `Dockerfile`) não correspondia à porta real de escuta em runtime (a Railway injeta a sua própria `PORT`, que tem precedência sobre o `ENV` do Dockerfile). O backup da base de dados nessa execução **não foi afetado** — o script continuou e terminou com sucesso, apenas sem o ficheiro de uploads, exatamente como desenhado.
- Corrigido o alvo para `ds-os-platform.railway.internal:8080` (porta confirmada em Settings → Networking do serviço `ds-os-platform`).
- Segunda execução: `[backup] uploads status: HTTP/1.1 200 OK`, `[backup] Created /backups/uploads-daily-20260810-202911.tar.gz (40K)`, `[backup] Retention (uploads) applied.` — sucesso confirmado nos logs da execução.

## 8. Verificação de rotina recomendada

- **Semanal**: confirmar em Railway → `postgres` → Cron Runs que a última execução tem estado "Last run succeeded" e que a lista de ficheiros em `/backups` está a crescer/rodar conforme esperado, incluindo tanto `db-*.dump` como `uploads-daily-*.tar.gz` (um `[backup] AVISO: ...` nos logs sobre os uploads não faz a execução falhar visualmente no Railway, por ser não-fatal por desenho — por isso vale a pena abrir os logs de vez em quando e não confiar só no estado "succeeded").
- **Mensal**: repetir o teste de restauro completo da base de dados (secção 6/7) contra um serviço temporário, para confirmar que os dumps continuam válidos e restauráveis. Realizar também, pelo menos uma vez, o teste de restauro de uploads descrito na secção 6.
- **Após qualquer alteração à imagem do Postgres de produção** (ex.: upgrade de major version): atualizar de imediato a imagem do serviço `postgres` (backup) para a mesma major version, caso contrário todos os backups seguintes falham silenciosamente com erro de incompatibilidade de versão do `pg_dump`.
- **Após qualquer alteração de rede/porta em `ds-os-platform`** (ex.: mudança de domínio, redeploy com configuração de porta diferente): confirmar que `ds-os-platform.railway.internal:8080` continua correto, repetindo a verificação em Settings → Networking.

## 9. Escalamento

Se o cron de backup falhar (estado diferente de "Last run succeeded" na tab Cron Runs), ou se os ficheiros em `/backups` não estiverem a ser criados/rodados como esperado:

1. Consultar os logs da execução falhada (Cron Runs → clicar na execução → Deploy Logs).
2. Verificar se a variável `DATABASE_URL` continua válida (referência `${{ds-os-db.DATABASE_URL}}` intacta em Variables).
3. Verificar se a versão da imagem (`postgres:18-bookworm`) continua a corresponder à major version da base de dados de produção.
4. Se o problema for especificamente nos uploads (mensagem `[backup] AVISO: ...` nos logs, mas o resto do backup a correr bem): verificar (a) se `BACKUP_INTERNAL_TOKEN` tem o mesmo valor em ambos os serviços (`postgres` e `ds-os-platform`), (b) se `ds-os-platform` está online, e (c) se a porta `8080` continua correta em Settings → Networking de `ds-os-platform`.
5. Corrigir e correr manualmente via **Run now** para confirmar a resolução antes de considerar o incidente fechado.

## 10. Estado de custo

Nenhuma infraestrutura temporária foi deixada ativa após a validação: o serviço `fulfilling-exploration` foi apagado e a variável `RESTORE_TARGET_URL` removida. Os serviços ativos no projeto `dynamic-tenderness` / `production` relacionados com backups são a base de dados de produção (`ds-os-db`), o serviço de aplicação (`ds-os-platform`, já necessário e existente por outras razões) e o serviço de backup (`postgres`) — não foi adicionado nenhum serviço novo nem custo residual permanente para cobrir os uploads, apenas um endpoint adicional dentro do serviço já existente.

## 11. Trabalho futuro (fora do âmbito atual)

- Replicação dos dumps (base de dados e uploads) para um destino verdadeiramente externo (fora da conta Railway), ex.: S3/Backblaze B2/R2.
- Alerta automático (Slack/email) em caso de falha do cron de backup, em vez de depender de verificação manual periódica — particularmente importante para as falhas *não-fatais* dos uploads (secção 2b), que hoje só aparecem nos logs e não impedem o estado "succeeded" da execução.
- Teste de restauro ponta-a-ponta dos uploads (só o mecanismo de backup foi validado em produção; o restauro descrito na secção 6 é, para já, teórico).
- Encriptação dos dumps/tarballs em repouso, caso venham a ser replicados para fora do volume Railway.
