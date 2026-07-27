#!/bin/zsh
# ═══════════════════════════════════════════════════════════════════════════
# BloFin Academy stage (/blofintest) — skin builder
# Regenerates the stage's recolored copies of the four prod files that carry
# hardcoded LT colours (closure-internal, unreachable from runtime JS):
#   lt-styles.css, lessons-v2/player.css,
#   lessons-v2/renderer.js, lessons-v2/chart-vocabulary.js
# Re-run after ANY prod change to those files, then bump their ?v= in
# blofintest/index.html.
#
# Palette: LT cyan→green #04b97d, LT pink→red #f13c54 (market semantics),
# purple/coral→BloFin orange family, purple-tinted bg stack→BloFin blue-black.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/blofintest"
mkdir -p "$OUT/lessons-v2"

# Shared mappings: pink→red, purple/coral→orange family, LT bg stack→BloFin
common() {
  sed -E \
    -e 's/#16e9d0/#ff8802/Ig' \
    -e 's/#ff2e88/#f13c54/Ig'  -e 's/255, ?46, ?136/241,60,84/g' \
    -e 's/#ff5fa3/#f4677a/Ig'  -e 's/#ff5c9e/#f4677a/Ig' \
    -e 's/#ff2ef5/#c72e42/Ig' \
    -e 's/#a855f7/#e67a00/Ig'  -e 's/168, ?85, ?247/230,122,0/g' \
    -e 's/#ff7a4d/#ff8802/Ig'  -e 's/255, ?122, ?77/255,136,2/g' \
    -e 's/#08070f/#0b0d11/Ig'  -e 's/#0d0b18/#10131a/Ig' \
    -e 's/#14121f/#161a22/Ig'  -e 's/#1d1a30/#1e232d/Ig' \
    -e 's/#272240/#282e3a/Ig'  -e 's/#272235/#232833/Ig' \
    -e 's/#363049/#333a47/Ig'  -e 's/#4b4566/#495261/Ig'
}

# FINAL owner ruling 2026-07-27: UI accents are ALWAYS orange / orange-adjacent;
# green + red exist ONLY inside charts (candles & market semantics).

# UI chrome (stylesheets): hardcoded teals are ACCENT colour → BloFin orange
recolor_ui() {
  common < "$1" | sed -E \
    -e 's/#00d4d4/#ff8802/Ig'  -e 's/0, ?212, ?212/255,136,2/g' \
    -e 's/#00b8b8/#e67a00/Ig'  -e 's/#009696/#c96b00/Ig' \
    > "$2"
}

# Chart renderers: teals mean BULLISH → market green
recolor_chart() {
  common < "$1" | sed -E \
    -e 's/#00d4d4/#04b97d/Ig'  -e 's/0, ?212, ?212/4,185,125/g' \
    -e 's/#00b8b8/#039e6b/Ig'  -e 's/#009696/#03855a/Ig' \
    > "$2"
}

recolor_ui    "$ROOT/lt-styles.css"                  "$OUT/lt-styles.css"
recolor_ui    "$ROOT/lessons-v2/player.css"          "$OUT/lessons-v2/player.css"
recolor_chart "$ROOT/lessons-v2/renderer.js"         "$OUT/lessons-v2/renderer.js"
recolor_chart "$ROOT/lessons-v2/chart-vocabulary.js" "$OUT/lessons-v2/chart-vocabulary.js"

node --check "$OUT/lessons-v2/renderer.js"
node --check "$OUT/lessons-v2/chart-vocabulary.js"
echo "BloFin skin rebuilt: $(ls "$OUT/lt-styles.css" "$OUT/lessons-v2/" | tr '\n' ' ')"
