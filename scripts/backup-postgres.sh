#!/usr/bin/env bash
# backup-postgres.sh — pg_dump com rotação, notificação Telegram e upload S3 opcional
set -euo pipefail

DB_NAME="${DB_NAME:-manutencao_urbana}"
DB_USER="${DB_USER:-urbana}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Telegram (opcional)
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# S3 / rclone (opcional)
RCLONE_DEST="${RCLONE_DEST:-}"

notify_telegram() {
  local msg="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${msg}" \
      -d "parse_mode=HTML" > /dev/null 2>&1 || true
  fi
}

cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    notify_telegram "⚠️ BACKUP FALHOU: ${DB_NAME} em ${DB_HOST}:${DB_PORT} — exit code ${exit_code}"
  fi
  exit $exit_code
}
trap cleanup EXIT

export PGPASSWORD="${DB_PASSWORD}"
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

BACKUP_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
echo "Backup criado: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Upload S3 via rclone (opcional)
if [ -n "$RCLONE_DEST" ]; then
  if command -v rclone &> /dev/null; then
    rclone copy "${BACKUP_FILE}" "${RCLONE_DEST}/" && \
      echo "Upload S3 concluido: ${RCLONE_DEST}/" || \
      echo "Upload S3 falhou (ignorado)"
  else
    echo "rclone nao instalado — pulando upload S3"
  fi
fi

# Rotação: remove backups mais velhos que RETENTION_DAYS
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "Backups anteriores a ${RETENTION_DAYS} dias removidos."

notify_telegram "✅ Backup OK: ${DB_NAME} (${BACKUP_SIZE})"
