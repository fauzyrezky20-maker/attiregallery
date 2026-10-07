#!/usr/bin/env bash
# Perbarui aplikasi setelah kode baru diunggah/di-pull ke folder ini.
#   sudo bash deploy/update.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP=/opt/attiregallery
if [[ "$SRC" != "$APP" ]]; then
  tar -C "$SRC" --exclude=./node_modules --exclude=./.next --exclude=./data --exclude=./.git --exclude=./.env.local -cf - . | tar -C "$APP" -xf -
fi
chown -R attire:attire "$APP"
sudo -u attire bash -c "cd $APP && npm ci --no-audit --no-fund && npm run build"
systemctl restart attiregallery
echo "✅ Aplikasi diperbarui."
