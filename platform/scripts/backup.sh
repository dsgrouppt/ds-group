#!/bin/bash
# Backup da base de dados de produção — pg_dump em formato custom (comprimido,
# permite restauro seletivo de tabelas). Requer DATABASE_URL no ambiente.
#
# Uso:
#   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" ./scripts/backup.sh
#
# Gera um ficheiro em backups/ds-os-YYYYMMDD-HHMMSS.dump
#
# Nota: a maioria dos fornecedores de Postgres geridos (Neon, Supabase, RDS)
# já faz backups automáticos point-in-time — este script é uma camada extra
# de segurança para exportação manual/local, não substitui os backups do
# fornecedor.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Erro: defina DATABASE_URL antes de correr este script." >&2
  exit 1
fi

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
mkdir -p "$DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILE="$DIR/ds-os-$TIMESTAMP.dump"

echo "A criar backup em $FILE ..."
pg_dump "$DATABASE_URL" --format=custom --file="$FILE"
echo "Backup concluído: $FILE ($(du -h "$FILE" | cut -f1))"

# Retenção: mantém só os últimos 14 backups locais (ajustar conforme política da empresa).
ls -1t "$DIR"/ds-os-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
