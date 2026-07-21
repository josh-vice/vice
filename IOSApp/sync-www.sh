#!/bin/bash
# Sync the live website into the iOS app's web bundle (IOSApp/www), then copy
# it into the native Xcode project if one exists. Runs automatically from the
# repo's post-commit hook; safe to run by hand any time: cd IOSApp && npm run sync
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/IOSApp"
WWW="$APP/www"

mkdir -p "$WWW"

# App runtime files only — no backups, docs, SEO pages, or Vercel config.
rsync -a --delete \
  --include='index.html' \
  --include='lt-*.js' \
  --include='lt-styles.css' \
  --include='lt-logo.svg' \
  --include='favicon.ico' \
  --include='perpingo-*-160.webp' \
  --include='vice-terminal-64.png' \
  --exclude='/*/' \
  --exclude='*' \
  "$ROOT/" "$WWW/"

rsync -a --delete "$ROOT/lessons-v2/" "$WWW/lessons-v2/"

# The Vercel analytics script 404s inside the app shell; strip its tag.
if grep -q '_vercel/insights' "$WWW/index.html"; then
  sed -i '' '/_vercel\/insights/d' "$WWW/index.html"
fi

echo "www synced ($(du -sh "$WWW" | cut -f1))"

# Push the bundle into the native project (no-op until `npx cap add ios` has run).
if [ -d "$APP/ios" ]; then
  (cd "$APP" && npx cap copy ios)
fi
