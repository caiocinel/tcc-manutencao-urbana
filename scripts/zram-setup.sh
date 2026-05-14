#!/usr/bin/env bash
# zram-setup.sh — Ativa ZRAM com 2GB comprimidos para VPS ARM64 com 4GB RAM
# Uso: sudo ./scripts/zram-setup.sh [--persist]
set -euo pipefail

PERSIST="${1:-}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute como root: sudo $0 [--persist]"
  exit 1
fi

echo "=== Ativando ZRAM (2GB comprimido) ==="

modprobe zram 2>/dev/null || echo "zram ja carregado"

# Verifica se ja existe
if [ -e /sys/block/zram0/disksize ] && [ "$(cat /sys/block/zram0/disksize)" != "0" ]; then
  echo "ZRAM ja ativo: $(cat /sys/block/zram0/disksize)"
  exit 0
fi

echo lz4 > /sys/block/zram0/comp_algorithm
echo 2G > /sys/block/zram0/disksize
mkswap /dev/zram0
swapon -p 5 /dev/zram0

echo "ZRAM ativado:"
swapon --show | grep zram

if [ "$PERSIST" = "--persist" ]; then
  echo "Criando servico systemd para persistir..."

  cat > /etc/systemd/system/zram.service << 'EOF'
[Unit]
Description=ZRAM swap comprimido (lz4, 2GB)
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'modprobe zram; echo lz4 > /sys/block/zram0/comp_algorithm; echo 2G > /sys/block/zram0/disksize; mkswap /dev/zram0; swapon -p 5 /dev/zram0'
ExecStop=/bin/sh -c 'swapoff /dev/zram0; echo 1 > /sys/block/zram0/reset'
RemainAfterExit=true

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable zram.service
  echo "Servico zram.service instalado e ativado na inicializacao."
fi
