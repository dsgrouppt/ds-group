# Runbook de Backups — Base de Dados DS OS (PostgreSQL / Railway)

Última validação: 2026-08-10. Sistema implementado e testado com um restauro real (não apenas simulado).

## 1. Visão geral

A base de dados de produção (`ds-os-db`, PostgreSQL 18 no Railway, projeto `dynamic-tenderness` / ambiente `production`) é protegida por um serviço dedicado chamado **`postgres`** que corre `pg_dump` diariamente, aplica retenção em três níveis (diário/semanal/mensal) e guarda os dumps num volume persistente (`postgres-volume`, montado em `/backups`).

Este serviço **não é** a base de dados em si — é um "cron job" (imagem Docker `postgres:18-bookworm`, sem processo persistente) que arranca uma vez por dia, corre o script de backup, e termina.

### Porque a imagem tem de ser `postgres:18-bookworm`

`pg_dump` não consegue fazer dump de um servidor com uma versão major **superior** à sua própria. A base de dados de produção corre Postgres 18.4, logo a imagem do serviço de backup tem de ser Postgres 18.x. (Foi detetado e corrigido um bug real neste projeto em que o serviço estava configurado com `postgres:16-bookworm`, o que fazia o `pg_dump` falhar sempre — ver secção 7.)

## 2. Onde ficam os backups

- **Localização física**: volume `postgres-volume`, montado em `/backups` dentro do serviço `postgres`, na mesma conta/projeto Railway (`dynamic-tenderness`).
- **Formato**: `pg_dump -Fc` (formato custom, comprimido, restaurável com `pg_restore`).
- **Nomenclatura**:
  - `db-YYYYMMDD-HHMMSS.dump` — dump diário
  - `weekly-YYYYMMDD-HHMMSS.dump` — cópia do dump quando o dia da semana é domingo (`date +%u` = 7)
  - `monthly-YYYYMMDD-HHMMSS.dump` — cópia do dump quando é dia 1 do mês (`date +%d` = 01)

### Nota honesta sobre "armazenamento externo"

Os backups estão num volume persistente **dentro da mesma conta Railway**, não num provedor terceiro totalmente separado (ex.: S3, Backblaze, outra cloud). Isto protege contra: corrupção de dados na tabela, erro humano (DELETE/UPDATE indevido), bug de aplicação que destrói dados, falha do container da base de dados. **Não protege** contra: perda total da conta Railway, compromisso da conta Railway, ou um incidente que afete toda a região/projeto Railway simultaneamente. Para mitigar este risco residual, recomenda-se — como melhoria futura — replicar periodicamente os dumps para um destino fora da Railway (ex.: bucket S3/R2 com credenciais próprias). Esta melhoria não foi implementada nesta fase por estar fora do âmbito imediato (ver secção 9, "Trabalho futuro").

## 3. Política de retenção

| Tipo | Frequência de criação | Retenção |
|---|---|---|
| Diário (`db-*.dump`) | Todos os dias às 00:00 UTC | 7 dias |
| Semanal (`weekly-*.dump`) | Aos domingos | 28 dias |
| Mensal (`monthly-*.dump`) | Dia 1 de cada mês | 365 dias |

A limpeza é feita no fim de cada execução via `find /backups -maxdepth 1 -name "<padrão>" -mtime +N -delete`.

## 4. Agendamento (cron)

- Serviço: `postgres` (ID `235d8bcc-8613-4b22-a0b8-0810fd87c5a3`)
- Cron: `0 0 * * *` (diariamente à meia-noite UTC), configurado em Settings → Deploy → Cron Schedule
- Pode ser despoletado manualmente em qualquer altura via a tab **Cron Runs** → botão **Run now**

## 5. Script de backup (Custom Start Command do serviço `postgres`)

```bash
bash -c 'set -e; mkdir -p /backups; TS=$(date +%Y%m%d-%H%M%S); DOW=$(date +%u); DOM=$(date +%d); FILE=/backups/db-$TS.dump; echo "[backup] Starting pg_dump at $TS"; pg_dump "$DATABASE_URL" -Fc -f "$FILE"; SIZE=$(du -h "$FILE" | cut -f1); echo "[backup] Created $FILE ($SIZE)"; if [ "$DOM" = "01" ]; then cp "$FILE" /backups/monthly-$TS.dump; fi; if [ "$DOW" = "7" ]; then cp "$FILE" /backups/weekly-$TS.dump; fi; find /backups -maxdepth 1 -name "db-*.dump" -mtime +7 -delete; find /backups -maxdepth 1 -name "weekly-*.dump" -mtime +28 -delete; find /backups -maxdepth 1 -name "monthly-*.dump" -mtime +365 -delete; echo "[backup] Retention applied. Current backups:"; ls -lh /backups; df -h /backups; echo "[backup] Backup job finished successfully."'
```

Variável de ambiente necessária: `DATABASE_URL` = `${{ds-os-db.DATABASE_URL}}` (referência Railway, resolvida automaticamente — nunca é necessário copiar a password manualmente).

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

### RPO e RTO atuais

- **RPO (Recovery Point Objective)**: até 24 horas (pior caso — perda de dados desde o último backup diário até ao incidente).
- **RTO (Recovery Time Objective)**: ordem de minutos — o processo de `pg_restore` de uma base de dados deste tamanho demora segundos a poucos minutos; o tempo dominante é o processo humano de decisão e validação.

## 7. Teste de restauro real (evidência)

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

## 8. Verificação de rotina recomendada

- **Semanal**: confirmar em Railway → `postgres` → Cron Runs que a última execução tem estado "Last run succeeded" e que a lista de ficheiros em `/backups` está a crescer/rodar conforme esperado.
- **Mensal**: repetir o teste de restauro completo (secção 6/7) contra um serviço temporário, para confirmar que os dumps continuam válidos e restauráveis.
- **Após qualquer alteração à imagem do Postgres de produção** (ex.: upgrade de major version): atualizar de imediato a imagem do serviço `postgres` (backup) para a mesma major version, caso contrário todos os backups seguintes falham silenciosamente com erro de incompatibilidade de versão do `pg_dump`.

## 9. Escalamento

Se o cron de backup falhar (estado diferente de "Last run succeeded" na tab Cron Runs), ou se os ficheiros em `/backups` não estiverem a ser criados/rodados como esperado:

1. Consultar os logs da execução falhada (Cron Runs → clicar na execução → Deploy Logs).
2. Verificar se a variável `DATABASE_URL` continua válida (referência `${{ds-os-db.DATABASE_URL}}` intacta em Variables).
3. Verificar se a versão da imagem (`postgres:18-bookworm`) continua a corresponder à major version da base de dados de produção.
4. Corrigir e correr manualmente via **Run now** para confirmar a resolução antes de considerar o incidente fechado.

## 10. Estado de custo

Nenhuma infraestrutura temporária foi deixada ativa após a validação: o serviço `fulfilling-exploration` foi apagado e a variável `RESTORE_TARGET_URL` removida. Os únicos serviços ativos no projeto `dynamic-tenderness` / `production` relacionados com backups são a base de dados de produção (`ds-os-db`) e o serviço de backup (`postgres`), ambos necessários e já existentes antes desta implementação — não foi adicionado custo residual permanente.

## 11. Trabalho futuro (fora do âmbito atual)

- Replicação dos dumps para um destino verdadeiramente externo (fora da conta Railway), ex.: S3/Backblaze B2/R2.
- Alerta automático (Slack/email) em caso de falha do cron de backup, em vez de depender de verificação manual periódica.
- Encriptação dos dumps em repouso, caso venham a ser replicados para fora do volume Railway.
