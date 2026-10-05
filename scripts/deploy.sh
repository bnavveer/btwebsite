#!/usr/bin/env bash
# Deploy the site to Cloudflare (Worker "btwebsite" with static assets, served at bt.quano.us).
# Copies only the public files into dist/ so source images and scripts aren't published.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist && mkdir dist
cp index.html capabilities.html flyer.html quote.html dist/
cp -R assets dist/
cat > dist/_headers <<'HEADERS'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/assets/*
  Cache-Control: public, max-age=604800
HEADERS
npx -y wrangler@latest deploy
