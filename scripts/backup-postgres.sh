#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-manutencao_urbana}"
DB_USER="${DB_USER:-urbana}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

pg_dump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  --no-owner \
  --no-acl \
  --format=custom \
  --compress=9 \
  --file="${BACKUP_FILE}"

echo "Backup criado: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "Backups anteriores a ${RETENTION_DAYS} dias removidos."
