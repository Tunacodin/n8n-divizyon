#!/usr/bin/env bash
# .env.local'deki değişkenleri Vercel production + preview ortamlarına aktarır.
# Önceden: vercel login + vercel link yapılmış olmalı.
#
# Kullanım:  bash scripts/sync-vercel-env.sh

set -e
ENV_FILE="$(dirname "$0")/../.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env.local bulunamadı: $ENV_FILE"
  exit 1
fi

# Her satırı oku, # ve boş satırları atla
while IFS= read -r line || [ -n "$line" ]; do
  # Yorum veya boş satır?
  case "$line" in
    \#*|'') continue ;;
  esac
  # KEY=VALUE parse et
  KEY="${line%%=*}"
  VAL="${line#*=}"
  # Boş key?
  [ -z "$KEY" ] && continue
  # Tırnak varsa sök
  VAL="${VAL%\"}"
  VAL="${VAL#\"}"

  # Halihazırda varsa önce sil (hata vermesin diye || true)
  for env_target in production preview development; do
    vercel env rm "$KEY" "$env_target" -y >/dev/null 2>&1 || true
  done

  # Ekle — production + preview + development'a
  printf '%s' "$VAL" | vercel env add "$KEY" production >/dev/null 2>&1 && \
    printf '%s' "$VAL" | vercel env add "$KEY" preview >/dev/null 2>&1 && \
    printf '%s' "$VAL" | vercel env add "$KEY" development >/dev/null 2>&1 && \
    echo "  ✓ $KEY" || \
    echo "  ✗ $KEY (hata)"
done < "$ENV_FILE"

echo
echo "Tamamlandı. Deploy için:  vercel --prod"
