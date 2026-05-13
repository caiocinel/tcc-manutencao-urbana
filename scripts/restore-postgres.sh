#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 <arquivo-backup.sql.gz>"
  echo "Ex: $0 ./backups/manutencao_urbana_20260511_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-manutencao_urbana}"
DB_USER="${DB_USER:-urbana}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Arquivo nao encontrado: ${BACKUP_FILE}"
  exit 1
fi

echo "Restaurando ${BACKUP_FILE} em ${DB_HOST}:${DB_PORT}/${DB_NAME}..."
echo "Isso SUBSTITUIRA todos os dados existentes."
read -rp "Continuar? (s/N): " confirm
if [ "${confirm}" != "s" ]; then
  echo "Cancelado."
  exit 0
fi

pg_restore \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "${BACKUP_FILE}"

echo "Restauracao concluida."
