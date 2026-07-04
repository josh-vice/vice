# Renderer (Layer 3 of 3)

**The only "code" layer.** It consumes ( lesson content + chart vocabulary ) and
produces the animation. Implemented in [`renderer.js`](renderer.js) (+ [`player.css`](player.css)),
exposed as `window.LTRenderer`.

---

## Decision: build a new v2 renderer (do **not** extend the recon player)

I evaluated the existing `lt-recon-player.js` (~63 KB) against this format honestly.

**It is the wrong base, because it is married to the format we are replacing.** The
recon player is built around the recon scene model: ECharts candlesticks driven by a
per-ASR-**chunk** `scene` object, plus three parallel side-channels — `cues` (a
transcript-reactive accent track), `timelines` (audio), and `chartmeta`/indicator
machinery (`_schemeColors`, ichimoku, colorScheme). Its unit of work is "one ASR chunk →
one styled scene + cue reconciliation," which is exactly the chunk-centric, ASR-coupled
design the handoff says not to inherit. Extending it would drag all of that in.

What v2 needs instead is small and different: a **beat**-centric renderer where
consecutive beats are one *evolving* chart, content is decoupled from geometry via
**named anchors/stages**, and there are no cues/timelines/indicators. Reusing the recon
player would mean bending the new clean format back onto the old machinery.

**So v2 has its own renderer — deliberately tiny and dependency-free.** What it reuses
from the old world is only what's genuinely good and decoupled:

- the **aesthetic** (`#08070f` bg, `#00d4d4` teal bull / `#f2f2f2` white bear,
  JetBrains Mono) — mirrored in `player.css`;
- the **deterministic legs→OHLC idea** from `lt-chartgen.js` — *vendored* into the
  vocabulary layer, not imported.

No ECharts, no Lucide, no site CSS — the renderer is plain `<canvas>` + a little DOM and
runs in the isolated `preview.html` with nothing from the live app.

---

## How it works

```js
new LTRenderer(mountEl, lesson, opts?)   // builds UI, renders beat 0
  .go(i, animate?)  .next()  .prev()  .play()  .pause()  .destroy()
```

### Layout
A `<canvas>` "stage" for charts/candles, a DOM **panel** overlay for CONCEPT text, a
**caption** bar (the narration `say`), and **controls** (Back / Play / Next + a type-
coded dot per beat). Text stays in the DOM so it's selectable and accessible; only the
chart is drawn on canvas.

### Rendering each beat type
- **CONCEPT** → hide the canvas, show the panel, reveal `lines[]` one-by-one (staggered).
- **CHART** → resolve the move via `LTChartVocab.get('chart', beat.chart)`, reveal
  candles up to `stages[beat.stage]`, then draw the beat's annotations.
- **CANDLE** → draw the single named candle large with wick/body callouts.

### The content↔geometry boundary (why layers don't bleed)
The renderer never names a concept, level, or move. A lesson's `show` item names an
**anchor** (`support`, `sweepLow`, …); the renderer looks that name up in the move's
`anchors` map to get the price/point, and draws. So:
- editing content (labels, which anchors, which stage) never touches this file;
- adding a chart move never touches this file (it just exposes more anchors/stages);
- this file knows nothing lesson-specific.
A bad anchor/stage/kind name throws an error that **names the offending string**, so
authoring mistakes surface immediately instead of rendering a silently wrong chart.

### Evolving charts (the continuity rule, in code)
When a beat's `chart` equals the chart already on screen, the renderer treats it as the
**same** chart: it reuses the cached (deterministic) geometry, animates only the
**newly-revealed** candles for the new stage, and **accumulates** annotations by walking
back over the consecutive same-`chart` beats (`_chartAnnos`). A different move, or any
CONCEPT/CANDLE beat, starts fresh. This is what makes "one coherent chart that gains
annotations across beats" the default and disconnected charts impossible.

### Animation
One `requestAnimationFrame` loop interpolates everything from per-element start-times:
candles grow from their open price (staggered ~42 ms), wicks fade in, dashed levels draw
left→right, zones fade, markers pop. The loop **stops when idle** and restarts on the
next change (no idle CPU). `prefers-reduced-motion` snaps instead of animating. Arbitrary
navigation (Back, dot-click) renders the target beat's full state instantly and
deterministically; only single forward steps within one chart animate the delta.

### Advancing beats
Click the stage or press **Next/→** to advance; **Play/Space** auto-advances using a
per-beat dwell (estimated from `say` length, overridable via `beat.dwell`). Silent for
now — the caption bar shows the narration.

### Audio-ready (the cue hook)
`_cueAudio(beat)` runs on every beat entry. Today it's a no-op. When `beat.audio` exists
it plays that clip and advances on `ended`. **The beats you authored are the cue points
— no re-authoring when ElevenLabs TTS lands.**

---

### Annotation kinds
The renderer draws `level`, `zone` (with optional `tone` to recolour for risk/reward),
`marker` (edge-aware labels that never clip the rim), `note`, `trendline` (a diagonal
through two point anchors, for diagonal S/R), and `region` (candle beats). Adding a kind
is the *only* reason to touch this file — content and vocabulary never carry drawing code.

## Verified

Two harnesses, both isolated and live (served from the workspace root):
- `preview.html` — the original single module (Course 4 · 03).
- `course1.html` — the **Course 1 hub** (15 modules in a switcher).

An automated sweep stepped **all 86 beats across all 15 Course 1 modules** plus the
Course 4 module, drawing each one: **zero errors**. All three beat types render; sweep
charts evolve across beats with cumulative annotations; narration agrees with every
visual; the aesthetic matches the site; works on mobile (cramped but scrollable).

## Files

| file | layer | role |
|------|-------|------|
| `chart-vocabulary.js` | 2 | named geometry primitives (`LTChartVocab`) |
| `renderer.js`         | 3 | the renderer (`LTRenderer`) |
| `player.css`          | 3 | renderer styling (self-contained, site tokens) |
| `lessons/**/*.js`     | 1 | editable lesson data (each registers into `LT_LESSONS`) |
| `preview.html`        | — | single-module harness (Course 4 · 03) |
| `course1.html`        | — | Course 1 hub — all 15 modules in one switcher |
