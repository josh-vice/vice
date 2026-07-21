/* Course2 · 14 — Ichimoku Market Scenario             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/14_ichimoku_market_scenario'] = {
  id: 'course2/14_ichimoku_market_scenario',
  course: 'Course2_Building_Your_Toolbox',
  module: '14_Ichimoku_Market_Scenario',
  title: 'Ichimoku Market Scenario',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's put Ichimoku to work in a scenario, the way you'd trade it live: a Kumo-breakout long, from checklist to entry to exit. The system is strict — four prerequisites before any trade — and then the lines themselves hand us the entry and the trailing stop.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'An Ichimoku Scenario',
        lines: [
          'Trade the system, step by step',
          'Four prerequisites → entry → trailing exit',
          'The lines hand you the whole trade plan'
        ]
      }
    },
    {
      id: 'checklist',
      type: 'CONCEPT',
      say: "Before any Kumo-breakout trade, four prerequisites — follow them religiously. One: price closes above the cloud, or below it for shorts. Two: price closes above the Kijun — the trend setter. Three: a bullish Kumo twist, giving us a bullish future cloud. Four: the Chikou span above price. Miss even one, and the likelihood of a favorable trade diminishes greatly.",
      panel: {
        title: 'Kumo Breakout — Four Prerequisites',
        lines: [
          '1 · Price **closes above** the cloud (below, for shorts)',
          '2 · Price closes above the **Kijun** — the trend setter',
          '3 · A **bullish Kumo twist** — a bullish future cloud',
          '4 · **Chikou span** above price (below, for shorts)',
          'Adhere strictly — miss one and the odds drop'
        ]
      }
    },
    {
      id: 'bias',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'All Four Prerequisites Met',
      say: "Now the checklist against the chart. Price has closed above a green Kumo — check. It's above the Kijun — check. The cloud ahead is bullish — check. And the Chikou span sits clear above the price from thirty periods back — check. All four prerequisites met: an uptrend has started, our bias is long, and we are not looking for shorts here.",
      show: [
        { kind: 'note',  at: 'cloudThick', label: 'the Kumo — green = bullish', place: 'below' },
        { kind: 'level', at: 'kijunLevel', label: 'Kijun — the trend setter', side: 'left' },
        { kind: 'note',  at: 'aboveCloud', label: 'above cloud + above Kijun → bias long', place: 'above' }
      ]
    },
    {
      id: 'entry',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Entry Option 1: Bid the Tenkan',
      say: "Entry Option One: don't chase — rest your bid on the Tenkan. The conversion line hugs the trend closest, so a routine dip can fill you at a good price. One caution from the live example: price came close, never quite touched it, and ran — blind bids at these lines risk being front-run. Predefine the risk either way: stop below the Kijun, or below the cloud for more room.",
      show: [
        { kind: 'level', at: 'tenkanLevel', label: 'Tenkan — rest your bid here', side: 'left' },
        { kind: 'note',  at: 'pullback', label: 'the dip toward the lines', place: 'below' },
        { kind: 'level', at: 'kijunLevel', label: 'Kijun — stop just below', side: 'left' },
        { kind: 'level', at: 'stop', label: 'deeper stop — below the cloud', side: 'left', tone: 'stop' }
      ]
    },
    {
      id: 'entry2',
      type: 'CHART',
      chart: 'sr_flip',
      stage: 'run',
      heading: 'Entry Option 2: The S/R-Flip Retest',
      say: "Missed the bid? No problem — Entry Option Two. Price set a higher high, so we look left for the minor resistance it just broke and expect an S/R flip. The retest comes, a dragonfly doji holds the level — a clean trigger — and we enter on that candle close, stop tucked below the Kijun. In the live walkthrough, this was the entry that actually filled.",
      show: [
        { kind: 'level',  at: 'level', label: 'broken resistance → support', side: 'left' },
        { kind: 'marker', at: 'breakout', label: 'higher high — the break', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'retest', label: 'retest + doji trigger → entry', style: 'dot', place: 'below' },
        { kind: 'level',  at: 'stop', label: 'stop', side: 'left', tone: 'stop' }
      ]
    },
    {
      id: 'exit',
      type: 'CHART',
      chart: 'ichimoku',
      stage: 'all',
      heading: 'Exit: Trail the Kijun, Exit on a Close Below',
      say: "Exits. Ichimoku is a trend-following system, so we trail instead of target. The Kijun is the trailing stop: each new higher high drags it up, locking in profit behind the trend. The rule: exit on a close below the Kijun — not a touch. In the walkthrough a wick stabbed through it and snapped back; the close held, so the trade survived the fakeout.",
      show: [
        { kind: 'level', at: 'kijunLevel', label: 'Kijun — the trailing stop', side: 'left' },
        { kind: 'note',  at: 'pullback', label: 'wick tags the Kijun — no close below, no exit', place: 'below' },
        { kind: 'note',  at: 'aboveCloud', label: 'trend resumes — keep trailing', place: 'above' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "And that's the rhythm: run the four-part checklist, take the entry — a bid at the Tenkan, or the S/R-flip retest — and trail your stop below the Kijun, moving it up with the trend. You're out only when price closes below the Kijun. Remember the one rule above all — this only works in a trending market. Spot a range, and you set Ichimoku aside.",
      panel: {
        title: 'Ichimoku Scenario — Recap',
        lines: [
          'Four prerequisites — checked **religiously**',
          'Entry 1: bid the **Tenkan** · Entry 2: **S/R-flip** retest',
          'Trail the stop below the **Kijun**',
          'Exit only on a **close** below the Kijun',
          'Trending markets only'
        ]
      }
    }
  ]
};
