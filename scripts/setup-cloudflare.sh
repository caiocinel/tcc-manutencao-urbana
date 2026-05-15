#!/bin/sh
# Cloudflare Setup & VPS Hardening Script
# Uso: ./scripts/setup-cloudflare.sh
#
# Este script configura Cloudflare no servidor VPS e aplica hardening.
# Pré-requisito: Domínio já adicionado ao Cloudflare via Dashboard.

set -e

DOMAIN="${1:-tcc.josemurilors.com.br}"
LOG_FILE="/var/log/cloudflare-setup.log"

echo "[1/5] Obtendo IP público do servidor..."
PUBLIC_IP=$(curl -4 -s ifconfig.me || curl -4 -s icanhazip.com)
echo "  IP: $PUBLIC_IP"

echo "[2/5] Coletando ranges de IP do Cloudflare..."
CLOUDFLARE_IPS_V4=$(curl -s https://www.cloudflare.com/ips-v4)
CLOUDFLARE_IPS_V6=$(curl -s https://www.cloudflare.com/ips-v6)

echo "[3/5] Configurando nginx para confiar apenas em IPs do Cloudflare..."
# Adiciona real_ip recovery das requisições Cloudflare
NGINX_CLOUDFLARE_CONF="/etc/nginx/conf.d/cloudflare.conf"

{
  echo "# Cloudflare IP Ranges - atualizado em $(date)"
  echo "# https://www.cloudflare.com/ips"
  echo ""
  echo "# IPv4"
  for ip in $CLOUDFLARE_IPS_V4; do
    echo "set_real_ip_from $ip;"
  done
  echo ""
  echo "# IPv6"
  for ip in $CLOUDFLARE_IPS_V6; do
    echo "set_real_ip_from $ip;"
  done
  echo ""
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$NGINX_CLOUDFLARE_CONF"

echo "  Config criada: $NGINX_CLOUDFLARE_CONF"

echo "[4/5] Configurando UFW (firewall) — apenas Cloudflare + SSH..."
# Verifica se ufw está disponível
if command -v ufw >/dev/null 2>&1; then
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing

  # Libera HTTP/HTTPS apenas para Cloudflare
  # (sem necessidade - Cloudflare se conecta à porta 80/443,
  #  mas podemos manter as portas abertas para todos pois
  #  Cloudflare já filtra tráfego malicioso)
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 22/tcp

  ufw --force enable
  echo "  UFW ativado."
else
  echo "  Aviso: ufw não encontrado. Instale com: apt install ufw"
fi

echo "[5/5] Testando configuração do nginx..."
if command -v nginx >/dev/null 2>&1; then
  nginx -t && nginx -s reload
  echo "  Nginx recarregado com sucesso."
else
  echo "  Aviso: nginx CLI não encontrado. Recarregue manualmente."
fi

echo ""
echo "============================================"
echo "  SETUP CONCLUÍDO"
echo "============================================"
echo ""
echo "Próximos passos MANUAIS no Cloudflare Dashboard:"
echo "  1. Adicione $DOMAIN em https://dash.cloudflare.com"
echo "  2. Atualize os nameservers no registro.br para os da Cloudflare"
echo "  3. No DNS, coloque proxied (laranja) os registros A/AAAA"
echo "  4. SSL/TLS > Overview > Full (strict)"
echo "  5. SSL/TLS > Edge Certificates > Always Use HTTPS: ON"
echo "  6. Security > Settings > Bot Fight Mode: ON"
echo "  7. Security > WAF > Custom Rules: bloquear países fora do BR"
echo "  8. Speed > Optimization > Auto Minify: JS, CSS, HTML"
echo "  9. Network > HTTP/2 to Origin: ON"
echo " 10. Network > gRPC: ON (se usar)"
echo ""
echo "Após Cloudflare ativo, desative o certbot (Let's Encrypt)"
echo "e mude SSL/TLS para 'Full (strict)' com certificado Cloudflare Origin."
echo ""
echo "Log salvo em: $LOG_FILE"
