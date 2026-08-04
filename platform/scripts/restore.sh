#!/bin/bash
# Restaura um backup criado por scripts/backup.sh.
#
# Uso:
#   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" ./scripts/restore.sh backups/ds-os-20260101-120000.dump
#
# ATENÇÃO: isto substitui os dados existentes na base de dados de destino.
# Confirmar sempre o DATABASE_URL antes de correr — um restauro no ambiente
# errado apaga dados de produção.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Erro: defina DATABASE_URL antes de correr este script." >&2
  exit 1
fi

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: DATABASE_URL=... ./scripts/restore.sh <ficheiro.dump>" >&2
  exit 1
fi

echo "A restaurar $FILE para:"
echo "  $DATABASE_URL" | sed -E 's/:[^:@]+@/:****@/'
read -p "Confirma? Isto substitui os dados existentes. (escreva 'sim' para continuar) " CONFIRM
if [ "$CONFIRM" != "sim" ]; then
  echo "Cancelado."
  exit 0
fi

pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$FILE"
echo "Restauro concluído."
