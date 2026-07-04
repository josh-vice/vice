# Lesson Content Format (Layer 1 of 3)

**What a human edits to author or fix a lesson.** One lesson = one file. One beat =
one legible block. No seeds, no generated code, no cache archaeology.

The format is a plain JavaScript data object assigned to `window.LTLesson` (pure
data — no logic, comment-friendly, loads with a `<script>` tag, matches the site's
no-build vanilla convention). It could be JSON; `.js` is chosen only so the file can
carry comments and trailing commas.

> **The test this format must pass.** Six months from now, to fix one beat in one
> lesson, you open one file, edit one short block, and you're done. You never touch
> the renderer and never touch the chart vocabulary to change what a lesson *says* or
> *shows*. Verified: every screenshot in this build was changed by editing only the
> lesson file (e.g. shortening a callout label was a one-line edit in the beat).

---

## File shape

```js
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/05_trending_markets'] = {
  id:            'course1/05_trending_markets',
  course:        'Course1_Laying_The_Foundation',
  module:        '05_Trending_Markets',
  title:         'Trending Markets',
  source_video:  'fLM29ArLZsI',   // provenance only — never played
  beats: [ /* ...one block per beat, in play order... */ ]
};
```

Each lesson **registers itself** into the `window.LT_LESSONS` map under its `id`. A
single-module page grabs one entry; a course hub (e.g. `course1.html`) lists every
registered lesson and loads the selected one into the renderer. Everything
teaching-related lives in `beats`; the renderer reads nothing else.

---

## A beat

Every beat has a `type` and a `say`. Visual beats add a chart/candle reference and a
`show` list. That's the whole surface.

| field    | applies to        | meaning |
|----------|-------------------|---------|
| `id`     | all               | stable slug for the beat (editor reference; optional) |
| `type`   | all               | `CONCEPT` \| `CHART` \| `CANDLE` |
| `say`    | all               | **rewritten, spoken-ready narration** — the script the future voiceover reads. Inline emphasis: `*teal*`, `**white**`. |
| `panel`  | CONCEPT           | `{ kicker?, title?, lines[] }` — text revealed line-by-line |
| `chart`  | CHART             | a **vocabulary move name** (e.g. `liquidity_sweep_bullish`) |
| `stage`  | CHART             | which reveal checkpoint of that move to show (e.g. `setup` \| `sweep` \| `reversal`). Defaults to the move's last stage. |
| `candle` | CANDLE            | a **vocabulary candle name** (e.g. `bullish_sweep`) |
| `heading`| CHART / CANDLE    | optional on-chart title |
| `show`   | CHART / CANDLE    | annotations to draw this beat (see below) |
| `dwell`  | all (optional)    | ms to hold in autoplay; default is estimated from `say` length |
| `audio`  | all (optional)    | path to a per-beat narration clip; **future** — see "Audio-ready" |

### The three beat types

- **CONCEPT** — text only. A `panel` with an optional kicker, an optional title, and
  `lines[]` that reveal one at a time. No chart.
- **CHART** — a named price structure from the vocabulary, revealed up to `stage`,
  annotated by `show`.
- **CANDLE** — a single named candle drawn large with wick/body callouts.

### Annotations (`show`)

Each `show` item is declarative and references the move's **named anchors** — never an
index, a price, or a pixel. The vocabulary owns the geometry; the lesson owns the words.

**On a CHART beat:**

```js
{ kind: 'level',     at: 'support',          label: 'Key Support', side: 'left' }
{ kind: 'zone',      side: 'below', of: 'support', label: 'liquidity below — long stops' }
{ kind: 'marker',    at: 'sweepLow', label: 'the sweep',  style: 'sweep',   place: 'below' }
{ kind: 'note',      at: 'firstTest', label: 'support holds — first test',   place: 'below' }
{ kind: 'trendline', from: 'touch1', to: 'touch3', style: 'support', label: 'rising support' }
{ kind: 'zone',      side: 'below', of: 'entry', depth: 5, tone: 'risk', label: 'risk = 1R' }
```

| kind        | required | optional | draws |
|-------------|----------|----------|-------|
| `level`     | `at` (a *level* anchor) | `label`, `side` (`left`\|`right`) | horizontal dashed line + label |
| `zone`      | `of` (a *level* anchor), `side` (`above`\|`below`) | `label`, `depth` (price units), `tone` (`risk`\|`reward`) | translucent band + label |
| `marker`    | `at` (any anchor) | `label`, `style` (`sweep`\|`reversal`\|`dot`), `place` (`above`\|`below`) | dot + label (edge-aware, never clips) |
| `note`      | `at` (any anchor) | `label`, `place` | label only (no dot) |
| `trendline` | `from`, `to` (two *point* anchors) | `label`, `style` (`support`\|`resistance`), `extend` | a diagonal line through the two points |

**On a CANDLE beat:**

```js
{ kind: 'region', of: 'lowerWick', label: 'the sweep — long lower wick' }   // a price band of the candle
{ kind: 'marker', at: 'low',       label: '...' }                            // a named point on the candle
```

The set of anchor names (`support`, `sweepLow`, `reclaim`, …) and region names
(`lowerWick`, `body`) for each move is listed in **CHART_VOCABULARY.md**. If you
reference a name a move doesn't expose, the renderer throws a clear error naming it —
you find the typo immediately instead of getting a silently wrong chart.

---

## The one rule that makes charts evolve instead of multiply

**Consecutive CHART beats that name the *same* `chart` are ONE evolving chart.** The
renderer keeps the chart on screen, animates only the newly-revealed candles for the
new `stage`, and *accumulates* the `show` annotations across those beats. A different
`chart` value (or any CONCEPT/CANDLE beat) starts a fresh chart.

This is how a lesson does "one coherent chart that gains annotations" — the old
system's core failure (a new disconnected chart per sentence) is structurally
impossible here. To stage a chart, you simply write consecutive beats with the same
`chart` and advancing `stage`s. Example (abbreviated):

```js
{ type:'CHART', chart:'liquidity_sweep_bullish', stage:'setup',    show:[ /* support, first-test */ ] },
{ type:'CHART', chart:'liquidity_sweep_bullish', stage:'sweep',    show:[ /* liquidity zone, sweep */ ] },
{ type:'CHART', chart:'liquidity_sweep_bullish', stage:'reversal', show:[ /* reclaim */ ] },
```

By beat 3 the chart shows support + first-test + zone + sweep + reclaim, all on the
same candles — verified in this build (beat 6 cumulative anchors:
`support, firstTest, sweepLow→zone+marker, reclaim`).

---

## Audio-ready (no re-authoring when TTS arrives)

`say` is already the spoken script. When per-beat ElevenLabs clips exist, add one
field per beat:

```js
{ type:'CONCEPT', say:'Welcome back...', audio:'audio/intro.mp3', panel:{ ... } }
```

The renderer plays `beat.audio` when the beat starts and advances on its `ended`
event (falling back to the dwell timer when there's no clip). Nothing else about the
lesson changes — the beat boundaries you authored *are* the audio cue points.

---

## Authoring method (how beats are decided)

1. **Segment by visual change, not by ASR sentence.** A new on-screen visual = a new
   beat. (For the test module the source's evolving charts and slides defined the 13
   boundaries; ASR timing was ignored.)
2. **Decide narration + type + visual together,** so they cannot disagree. A beat that
   says "sweep below support" must set a move + `show` that renders exactly that.
3. **Rewrite the narration** into clean, spoken-ready prose. Keep the subject and
   teaching order; never paste raw ASR; no "see below / as shown" phrasing (the ear
   can't see).
4. **Visual beats reference the vocabulary by name.** Idealized, ticker-free. Prefer
   one evolving chart per concept (same `chart`, advancing `stage`) over many charts.

---

## Worked example (one real beat from the test module)

```js
{
  id: 'long-sweep',
  type: 'CHART',
  chart: 'liquidity_sweep_bullish',   // vocabulary move (geometry lives there)
  stage: 'sweep',                     // reveal the candles through the sweep
  // narration (spoken-ready) and the visual were authored together, so they agree:
  say: "A couple of weeks pass and price drifts back down to the level. Then, instead "
     + "of bouncing, it breaks straight through — just for a moment. That dip below "
     + "support triggers all those long stop-losses and tempts breakout sellers to "
     + "short the breakdown. In one move, a pool of liquidity is handed to whoever is "
     + "waiting below.",
  show: [
    { kind: 'zone',   side: 'below', of: 'support', label: 'liquidity below — long stops + breakout sellers' },
    { kind: 'marker', at: 'sweepLow', label: 'the sweep', style: 'sweep', place: 'below' }
  ]
}
```

To fix this beat later: edit the `say`, or add/remove a `show` line. You never open
`renderer.js` or `chart-vocabulary.js` to do it.
