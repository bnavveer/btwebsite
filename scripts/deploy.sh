#!/usr/bin/env bash
# Deploy the site to Cloudflare (Worker "btwebsite" with static assets).
#
#   ./scripts/deploy.sh             preview at bt.quano.us: every page sends "X-Robots-Tag: noindex"
#                                   so the preview never competes with the real domain in search
#   MODE=production ./scripts/deploy.sh
#                                   for baytransportinc.com: indexable (add the domain to wrangler.jsonc first)
#
# Copies only the public files into dist/ so source images and scripts aren't published.
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${MODE:-preview}"

python3 scripts/build_pages.py >/dev/null
rm -rf dist && mkdir dist
cp ./*.html robots.txt sitemap.xml dist/
cp -R assets dist/

{
  echo "/*"
  echo "  X-Content-Type-Options: nosniff"
  echo "  Referrer-Policy: strict-origin-when-cross-origin"
  echo "  Permissions-Policy: camera=(), microphone=(), geolocation=()"
  if [ "$MODE" != "production" ]; then echo "  X-Robots-Tag: noindex"; fi
  echo "/assets/img/*"
  echo "  Cache-Control: public, max-age=604800"
  echo "/assets/docs/*"
  echo "  Cache-Control: public, max-age=604800"
  echo "/assets/css/*"
  echo "  Cache-Control: public, max-age=31536000, immutable"
  echo "/assets/js/*"
  echo "  Cache-Control: public, max-age=31536000, immutable"
} > dist/_headers

# Old GoDaddy URLs, so existing links and search results land on the new pages
cat > dist/_redirects <<'REDIRECTS'
/capabilities-statement /capabilities 301
/capabilities-statement/ /capabilities 301
/home / 301
/contact-us /#contact 301
/assets/docs/capabilities-statement-2023.pdf /assets/docs/bay-transport-capabilities-statement.pdf 301
/services /services 200
REDIRECTS
sed -i '' '/^\/services \/services 200$/d' dist/_redirects

echo "Deploying in $MODE mode"
npx -y wrangler@latest deploy
