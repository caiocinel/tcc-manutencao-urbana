#!/bin/sh
# Reset do banco demo — executa o seed (que recria o banco do zero).
# Uso: ./scripts/reset_demo.sh   (dentro do container backend)

set -e

cd /app

echo "$(date): Reset do banco demo iniciado..."
python scripts/seed_demo.py
echo "$(date): Reset do banco demo concluído!"
