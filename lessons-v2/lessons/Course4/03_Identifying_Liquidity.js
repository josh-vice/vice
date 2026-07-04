/* ════════════════════════════════════════════════════════════════════════════
   Course4 · 03 — Identifying Liquidity              (v2 lesson, one editable file)
   ----------------------------------------------------------------------------
   ONE lesson = ONE file. ONE beat = ONE legible block below. To fix a beat six
   months from now: find its block, edit the `say` and/or the `show` list, done.
   No seeds, no generated code, no cache archaeology. The renderer and the chart
   vocabulary are never touched to change what this lesson says or shows.

   Beat types:
     CONCEPT — text only (panel: kicker/title/lines).
     CHART   — a named move from the vocabulary, revealed to `stage`, annotated
               by `show`. Consecutive CHART beats naming the SAME `chart` are ONE
               evolving chart that gains annotations — never a new disconnected one.
     CANDLE  — a single named candle, large, with wick/body callouts.

   Narration (`say`) is rewritten, spoken-ready prose — it is the script the
   future voiceover (ElevenLabs TTS) will read, so it must stand on its own for
   the ear. Inline emphasis: *teal* and **white**.

   Charts are idealized and TICKER-FREE: no coins, no exchanges, no real prices.
   Source provenance (read-only, never played): YouTube hxkdu-ZfmpA.
   ════════════════════════════════════════════════════════════════════════════ */
(window.LT_LESSONS = window.LT_LESSONS || {})['course4/03_identifying_liquidity'] = window.LTLesson = {
  id: 'course4/03_identifying_liquidity',
  course: 'Course4_Liquidity_Theory',
  module: '03_Identifying_Liquidity',
  title: 'Identifying Liquidity',
  source_video: 'hxkdu-ZfmpA',   // provenance only

  beats: [

    /* 1 ───────────────────────────────────────────────────────────── intro */
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Welcome back. In this lesson we'll learn the different ways to spot liquidity on a chart — where it pools, how bigger players engineer it, and how to keep your own orders from becoming someone else's fuel.",
      panel: {
        kicker: 'Course 4 · Liquidity Theory',
        title: 'Identifying Liquidity',
        lines: [
          'Where liquidity *pools* on a chart',
          'How bigger players *engineer* it',
          'How to avoid becoming the liquidity'
        ]
      }
    },

    /* 2 ──────────────────────────────────────────────── what a pool is */
    {
      id: 'pools-defined',
      type: 'CONCEPT',
      say: "Let's start with liquidity pools. A liquidity pool is simply an area where many traders have parked the same kind of order — stop-losses on one side, breakout orders on the other. They build up just beyond an obvious support or resistance level, and that concentration of orders is exactly what a larger player can hunt.",
      panel: {
        title: 'Liquidity Pools',
        lines: [
          'Where traders cluster stop-losses and breakout orders',
          'They form just beyond an *obvious* support or resistance level',
          'Which makes them the fuel a bigger player can **engineer**'
        ]
      }
    },

    /* 3 ─────────────────────────────────────────── where pools form (chart) */
    {
      id: 'where-pools-form',
      type: 'CHART',
      chart: 'range_bound',
      stage: 'all',
      heading: 'Where Liquidity Pools Form',
      say: "Picture a simple range. Price keeps bouncing between a high and a low, so almost everyone is watching the same two edges. Below the range low rest the stop-losses of buyers and the orders of breakout sellers. Above the range high rest the stop-losses of sellers and the orders of breakout buyers. Each edge has a pool of liquidity sitting just past it.",
      show: [
        { kind: 'level', at: 'high', label: 'Range High', side: 'left' },
        { kind: 'level', at: 'low',  label: 'Range Low',  side: 'left' },
        { kind: 'zone',  side: 'above', of: 'high', label: 'liquidity — sell stops + breakout buyers' },
        { kind: 'zone',  side: 'below', of: 'low',  label: 'liquidity — long stops + breakout sellers' }
      ]
    },

    /* 4 ───────────────────────────────────── long liquidity — the setup */
    {
      id: 'long-setup',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'setup',
      heading: 'Engineering Long Liquidity',
      say: "Now watch how a bigger player fills a large long position. It begins at a support level that has already held once — price came down, buyers defended it, and price rallied away. Everyone now treats this as solid support, so they tuck their long stop-losses just beneath it.",
      show: [
        { kind: 'level', at: 'support', label: 'Key Support', side: 'left' },
        { kind: 'note',  at: 'firstTest', label: 'support holds — first test', place: 'below' },
        { kind: 'zone',  side: 'below', of: 'support', tone: 'reward', label: 'long stops rest just below' }
      ]
    },

    /* 5 ─────────────────────────────────── long liquidity — the sweep */
    {
      id: 'long-sweep',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'sweep',
      say: "A couple of weeks pass and price drifts back down to the level. Then, instead of bouncing, it breaks straight through — just for a moment. That dip below support triggers all those long stop-losses and tempts breakout sellers to short the breakdown. In one move, a pool of liquidity is handed to whoever is waiting below.",
      show: [
        { kind: 'marker', at: 'sweepLow', label: 'the sweep', style: 'sweep', place: 'below' }
      ]
    },

    /* 6 ─────────────────────────────────── long liquidity — the reversal */
    {
      id: 'long-reversal',
      type: 'CHART',
      chart: 'liquidity_sweep_bullish',
      stage: 'reversal',
      say: "That's the trap. A large buyer fills an even bigger long position right at the lows, then drives price back above support. The trapped sellers are forced to cover, and their buying adds fuel to the move. Price never looked back — what felt like a breakdown was actually the engineering of long liquidity.",
      show: [
        { kind: 'marker', at: 'sweepLow', label: 'large buyer fills at the lows', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'reclaim', label: 'reclaim + reverse up', style: 'reversal', place: 'above' },
        { kind: 'marker', at: 'reversalTop', label: 'shorts squeezed → continuation', style: 'reversal', place: 'above' }
      ]
    },

    /* 7 ────────────────────────────────── the single-candle signature */
    {
      id: 'sweep-candle',
      type: 'CANDLE',
      candle: 'bullish_sweep',
      heading: 'What It Looks Like as One Candle',
      say: "Step back, and that entire liquidity grab is just one candle: a long lower wick that stabs below support and snaps back, finished with a strong bullish body. A long wick into the pool, a decisive close back above the level — that's the footprint to learn to recognise.",
      show: [
        { kind: 'region', of: 'lowerWick', label: 'the sweep — long lower wick' },
        { kind: 'region', of: 'body',      label: 'the reversal — strong bullish close' },
        { kind: 'note',   at: 'level',     label: 'support swept & reclaimed', style: 'reversal' }
      ]
    },

    /* 8 ──────────────────────────────────── short liquidity — the setup */
    {
      id: 'short-setup',
      type: 'CHART',
      chart: 'liquidity_sweep_bearish',
      stage: 'setup',
      heading: 'Engineering Short Liquidity',
      say: "Short liquidity is the mirror image. Here a range high has been acting as resistance — price pushed up into it and got rejected, so traders now treat it as a ceiling and rest their short stop-losses just above it.",
      show: [
        { kind: 'level', at: 'resistance', label: 'Key Resistance — range high', side: 'left' },
        { kind: 'note',  at: 'firstTest', label: 'resistance holds — first test', place: 'above' }
      ]
    },

    /* 9 ─────────────────────────────────── short liquidity — the sweep */
    {
      id: 'short-sweep',
      type: 'CHART',
      chart: 'liquidity_sweep_bearish',
      stage: 'sweep',
      say: "Price drifts back up to the ceiling and briefly pokes above it. Short stops get triggered, and breakout buyers pile in expecting a breakout — handing a large player all the liquidity they need to fill a heavy short right at the highs.",
      show: [
        { kind: 'zone',   side: 'above', of: 'resistance', label: 'liquidity above — short stops + breakout buyers' },
        { kind: 'marker', at: 'sweepHigh', label: 'the sweep', style: 'sweep', place: 'above' }
      ]
    },

    /* 10 ────────────────────────────────── short liquidity — the reversal */
    {
      id: 'short-reversal',
      type: 'CHART',
      chart: 'liquidity_sweep_bearish',
      stage: 'reversal',
      say: "Then the trap springs. That large short drives price back below the level, the breakout buyers are forced to bail, and their selling accelerates the move down. The brief break above fooled everyone — it was short liquidity being engineered.",
      show: [
        { kind: 'marker', at: 'sweepHigh', label: 'large seller fills at the highs', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'reclaim', label: 'rejected — close back below', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'reversalBottom', label: 'longs liquidated → continuation', style: 'reversal', place: 'below' }
      ]
    },

    /* 11 ──────────────────────────────── why it works + SFPs (concept) */
    {
      id: 'why-and-sfp',
      type: 'CONCEPT',
      say: "In both cases one large player manufactured the move: they stopped out one side, trapped the other, and profited from the whole swing. That's the heart of liquidity theory — if you can see who is about to be squeezed out, you can position alongside the bigger player instead of becoming their fuel. When this plays out on a high timeframe, it has a name: a swing failure pattern, or SFP. And a real one takes time — expect multiple days between the first test of a level and the swing failure itself.",
      panel: {
        title: 'Why It Works',
        lines: [
          'One player stops out one side and traps the other',
          'Losses for the crowd become profit for the few',
          "Spot who's squeezed — and ride the bigger player instead",
          'On a high timeframe this is a *Swing Failure Pattern (SFP)*'
        ]
      }
    },

    /* 12 ───────────────────────────────── pools vs SFPs · depletion */
    {
      id: 'pools-vs-sfps',
      type: 'CONCEPT',
      say: "Not every liquidity grab is a high-timeframe SFP. A quick fakeout on a lower timeframe can engineer liquidity inside a range just the same. The real distinction is the depletion factor: a liquidity pool is finite. The first test of a level is usually the most violent, because that's where the resting orders are — once they're swept, that level rarely holds again. So after a pool has been tapped, it becomes a great place to flip your bias when price returns to it.",
      panel: {
        title: "Pools Aren't Always SFPs",
        lines: [
          'Low-timeframe fakeouts can engineer liquidity inside a range too',
          'SFPs live on high timeframes; pools can form on low ones',
          'Pools are **finite** — the first tap usually depletes them',
          'A tapped level rarely holds again — good for flipping bias'
        ]
      }
    },

    /* 13 ───────────────────────────────── protect yourself (outro) */
    {
      id: 'dont-fall-in',
      type: 'CONCEPT',
      say: "So how do you avoid becoming the liquidity? Before every trade, ask one question: is my stop-loss sitting exactly where someone else would love to grab liquidity? If the answer is yes, give it a buffer, or wait for that first violent test to play out before you commit. Protect your stop, and you stop feeding the pool. Thanks for watching — I'll see you in the next lesson.",
      panel: {
        title: "Don't Fall in the Pool",
        lines: [
          'First tests of these areas are often *violent* — respect them',
          'Ask: is my stop-loss someone else’s liquidity?',
          'Leave a buffer, or wait for the first test before committing'
        ]
      }
    }

  ]
};
