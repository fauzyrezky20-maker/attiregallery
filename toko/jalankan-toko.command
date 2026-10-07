#!/bin/bash
# AttireGallery untuk Mac/Linux: klik dua kali (Mac) atau jalankan: bash toko/jalankan-toko.command
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null; then
  echo "Node.js belum terpasang. Unduh versi LTS dari https://nodejs.org lalu jalankan lagi."
  open https://nodejs.org 2>/dev/null; read -p "Tekan Enter untuk keluar"; exit 1
fi
if [ ! -f .env.local ]; then
  printf 'BETTER_AUTH_SECRET=%s\nBETTER_AUTH_URL=http://localhost:3000\nAUTH_ALLOWED_HOSTS=*\nLOCAL_NETWORK_MODE=1\n' "$(openssl rand -base64 32)" > .env.local
fi
[ -d node_modules ] || npm ci --no-audit --no-fund || exit 1
[ -f .next/BUILD_ID ] || npm run build || exit 1
echo
echo "AttireGallery berjalan di http://localhost:3000"
echo "Dari ponsel (Wi-Fi yang sama):"
(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}') | sed 's#^#  http://#; s#$#:3000#'
echo "Jangan tutup jendela ini selama toko buka."
(sleep 3; open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null) &
npm start -- -H 0.0.0.0 -p 3000
