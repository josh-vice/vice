/* Course2 · 04 — Entering Trades (the LTE methodology)  (v2 lesson)
   Source provenance (read-only): YouTube (Course2/04_Entering_Trades). */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/04_entering_trades'] = {
  id: 'course2/04_entering_trades',
  course: 'Course2_Building_Your_Toolbox',
  module: '04_Entering_Trades',
  title: 'Entering Trades',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's lock in a consistent way to approach every single setup, no matter your style. It's called the LTE methodology — Level, Trigger, Entry. Think of it as ready, set, go. Premeditating your trade this way is the skill that separates self-sufficient traders from gamblers.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'The LTE Methodology',
        lines: [
          '**L**evel · **T**rigger · **E**ntry',
          'Ready · Set · Go',
          'One repeatable framework for every setup'
        ]
      }
    },
    {
      id: 'lte',
      type: 'CONCEPT',
      say: "Here's what each letter means. The Level is a clearly defined zone you expect to act as support or resistance — diagonal, horizontal, or a zone. The Trigger is an obvious price-action reaction at that level: a bullish engulfing candle, a hammer, a shooting star. And the Entry is the order you place once the trigger fires. Remember the rule: a trigger can be your entry, but your entry can never be the trigger.",
      panel: {
        title: 'Level · Trigger · Entry',
        lines: [
          '**Level** — a defined S/R zone you’ll watch',
          '**Trigger** — an obvious candle reaction at it',
          '**Entry** — the order you place after the trigger',
          'A trigger can be the entry; the entry can’t be the trigger'
        ]
      }
    },
    {
      id: 'level',
      type: 'CHART',
      chart: 'horizontal_sr',
      params: { as: 'support' },
      stage: 'hold',
      heading: 'Ready — Mark the Level',
      say: "Ready. First we mark our level — a zone we believe will act as support if price returns to it. We don't trade yet; we just identify it and wait patiently for price to come back and test it. A clean, defined level is the whole foundation of the trade.",
      show: [
        { kind: 'level',  at: 'level', label: 'our level — expected support', side: 'left' },
        { kind: 'marker', at: 'touch1', label: 'wait for price to return', style: 'dot', place: 'below' }
      ]
    },
    {
      id: 'trigger',
      type: 'CANDLE',
      candle: 'long_lower_wick',
      heading: 'Set — Wait for the Trigger',
      say: "Set. Price retests our level — now we wait for a trigger. Here it comes: a strong reaction candle with a long lower wick, buyers aggressively bidding the level. A bullish engulfing or a hammer like this tells us the level is holding and demand is real. That's our confirmation.",
      show: [
        { kind: 'region', of: 'lowerWick', label: 'sellers absorbed' },
        { kind: 'region', of: 'body',      label: 'buyers dominate — the trigger' }
      ]
    },
    {
      id: 'entry',
      type: 'CHART',
      chart: 'trade_setup_long',
      stage: 'plan',
      heading: 'Go — Entry Option 1: the Higher Low',
      say: "Go. With the level confirmed and the trigger fired, we execute the entry. The first way in: wait for a higher low from the trigger — it green-lights the setup — then enter with a market or limit order. The stop goes just below the level — our invalidation — and the target sits at the next level up.",
      show: [
        { kind: 'level', at: 'entry',  label: 'Entry — the higher low', side: 'left' },
        { kind: 'level', at: 'stop',   label: 'Stop — below the level', side: 'left' },
        { kind: 'level', at: 'target', label: 'Target', side: 'left' },
        { kind: 'zone',  side: 'below', of: 'entry', depth: 5,  tone: 'risk',   label: 'risk' },
        { kind: 'zone',  side: 'above', of: 'entry', depth: 10, tone: 'reward', label: 'reward' }
      ]
    },
    {
      id: 'entry2',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Go — Entry Option 2: the S/R-Flip Retest',
      say: "Same level, same trigger — a second way in. This time we wait for a higher high: price trades and closes above a minor resistance level. We set limit orders expecting an S/R flip, and enter on the retest once we get more confirmation. Stop below, at our invalidation; same target as before.",
      show: [
        { kind: 'level',  at: 'level', label: 'minor resistance → support', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'close above — S/R flip', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'retest', label: 'limit entry on the retest', style: 'dot', place: 'below' },
        { kind: 'level',  at: 'stop', label: 'Stop — invalidation', side: 'left' }
      ]
    },
    {
      id: 'management',
      type: 'CONCEPT',
      say: "Before managing anything, establish your bias — your view on the direction of the trend. Bullish or bearish, and for how long? Then identify the First Barrier, or FB: a minor S/R zone, the earliest indication your thesis may be wrong. Finally, invalidation — a predefined level that, when violated, changes your bias. Invalidation is the stop loss. Stay disciplined: arbitrarily moving it only bruises ego and portfolio.",
      panel: {
        title: 'Trade Management Fundamentals',
        lines: [
          '**Bias** — your view on the direction of the trend',
          '**First Barrier (FB)** — minor S/R; the earliest warning the thesis is wrong',
          '**Invalidation** — predefined level; when violated, exit — this is the stop loss',
          'Never move invalidation — the goalpost stays put'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "That's LTE. Mark a level, wait for a trigger to add confluence, then execute your entry — never the other way around. It forces patience and premeditation into every trade. Next we'll use the very same logic in reverse, to exit.",
      panel: {
        title: 'Entering Trades — Recap',
        lines: [
          'Level → Trigger → Entry, in that order',
          'The trigger adds **confluence** to your level',
          'Two entries: the **higher low** or the **S/R-flip retest**',
          'Bias → First Barrier → Invalidation (= the stop)',
          'Same logic, reversed, gives you the **exit**'
        ]
      }
    }
  ]
};
