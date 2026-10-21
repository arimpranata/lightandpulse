#!/usr/bin/env bash
# Builds a ready-to-upload bundle for Hostinger:
#
#   build/public_html/            → upload the contents to your site's public_html
#     index.html, _expo/, assets/   the web version of the app
#     api/                          the PHP API (add config.php on the server)
#   build/database/               → import in phpMyAdmin (schema.sql, then seed.sql)
#   build/bali-guide-public_html.zip
#
# Usage: deploy/build.sh https://your-domain.com/api
set -euo pipefail

API_URL="${1:-${EXPO_PUBLIC_API_URL:-}}"
if [[ -z "$API_URL" ]]; then
  echo "Usage: deploy/build.sh https://your-domain.com/api" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/build"
WEB="$OUT/public_html"

rm -rf "$OUT"
mkdir -p "$WEB" "$OUT/database"

echo "→ Building the web app (API: $API_URL)"
(
  cd "$ROOT/app"
  [[ -d node_modules ]] || npm ci
  EXPO_PUBLIC_API_URL="$API_URL" CI=1 npx expo export --platform web --output-dir "$WEB"
)

echo "→ Copying the API"
rsync -a --exclude 'config.php' "$ROOT/api/" "$WEB/api/"
cp "$ROOT/deploy/public_html.htaccess" "$WEB/.htaccess"

echo "→ Copying database scripts"
cp "$ROOT/database/schema.sql" "$ROOT/database/seed.sql" "$OUT/database/"

echo "→ Zipping"
(cd "$WEB" && zip -qr "$OUT/bali-guide-public_html.zip" .)

echo
echo "Done. Upload build/bali-guide-public_html.zip to public_html and extract it,"
echo "then create public_html/api/config.php from api/config.example.php."
