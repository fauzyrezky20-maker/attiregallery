#!/usr/bin/env bash
# Pasang AttireGallery di server Ubuntu (mis. Oracle Cloud Always Free) dengan HTTPS otomatis.
#
# Pemakaian (jalankan dari dalam folder aplikasi):
#   sudo bash deploy/install.sh attiregallery.duckdns.org
#
# Yang dilakukan: memasang Node.js 22 + Caddy, build aplikasi, menjalankannya sebagai layanan
# yang otomatis hidup lagi setelah server restart, membuka port 80/443, dan backup database harian.
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Pemakaian: sudo bash deploy/install.sh NAMA-DOMAIN   (contoh: attiregallery.duckdns.org)"; exit 1
fi
if [[ $EUID -ne 0 ]]; then echo "Jalankan dengan sudo."; exit 1; fi

SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP=/opt/attiregallery
DATA=/var/lib/attiregallery
USER_NAME=attire

export DEBIAN_FRONTEND=noninteractive

# Server kecil (RAM 1 GB) butuh swap agar proses build tidak kehabisan memori.
if [[ ! -f /swapfile ]] && [[ $(awk '/MemTotal/ {print $2}' /proc/meminfo) -lt 3000000 ]]; then
  echo "==> Menambah swap 2 GB"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Memasang paket sistem"
apt-get update -y
apt-get install -y curl ca-certificates gnupg build-essential python3 sqlite3 debian-keyring debian-archive-keyring apt-transport-https iptables-persistent

if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1)" != "v22" ]]; then
  echo "==> Memasang Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v caddy >/dev/null; then
  echo "==> Memasang Caddy (HTTPS otomatis)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "==> Menyiapkan pengguna & folder"
id "$USER_NAME" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$USER_NAME"
mkdir -p "$APP" "$DATA/uploads" "$DATA/backup"
if [[ "$SRC" != "$APP" ]]; then
  tar -C "$SRC" --exclude=./node_modules --exclude=./.next --exclude=./data --exclude=./.git -cf - . | tar -C "$APP" -xf -
fi

if [[ ! -f "$APP/.env.local" ]]; then
  cat > "$APP/.env.local" <<ENV
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
BETTER_AUTH_URL=https://$DOMAIN
DATABASE_PATH=$DATA/attiregallery.db
UPLOAD_DIR=$DATA/uploads
ENV
else
  sed -i "s#^BETTER_AUTH_URL=.*#BETTER_AUTH_URL=https://$DOMAIN#" "$APP/.env.local"
fi
chown -R "$USER_NAME:$USER_NAME" "$APP" "$DATA"
chmod 600 "$APP/.env.local"

echo "==> Build aplikasi (beberapa menit)"
sudo -u "$USER_NAME" bash -c "cd $APP && npm ci --no-audit --no-fund && npm run build"

echo "==> Menjalankan sebagai layanan"
cat > /etc/systemd/system/attiregallery.service <<UNIT
[Unit]
Description=AttireGallery
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$APP
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now attiregallery
systemctl restart attiregallery

echo "==> Mengatur HTTPS untuk $DOMAIN"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
  encode gzip
  request_body {
    max_size 20MB
  }
  reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl enable caddy
systemctl restart caddy

echo "==> Membuka port 80 & 443 di firewall server"
for p in 80 443; do
  iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $p -j ACCEPT
done
netfilter-persistent save >/dev/null 2>&1 || true

echo "==> Backup database harian (disimpan 14 hari di $DATA/backup)"
cat > /etc/cron.daily/attiregallery-backup <<CRON
#!/bin/sh
sqlite3 $DATA/attiregallery.db ".backup '$DATA/backup/attiregallery-\$(date +%F).db'"
find $DATA/backup -name '*.db' -mtime +14 -delete
CRON
chmod +x /etc/cron.daily/attiregallery-backup

echo
echo "✅ Selesai. Buka https://$DOMAIN lalu buat akun pemilik."
echo "   Status layanan : sudo systemctl status attiregallery"
echo "   Log aplikasi   : sudo journalctl -u attiregallery -f"
