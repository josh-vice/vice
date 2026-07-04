/* Course1 · 02 — Understanding Price Action            (v2 lesson)
   Source provenance (read-only): YouTube hbQ6Pvauixs.
   Candle-heavy: anatomy + single-candle psychology + reading a sequence. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course1/02_understanding_price_action'] = {
  id: 'course1/02_understanding_price_action',
  course: 'Course1_Laying_The_Foundation',
  module: '02_Understanding_Price_Action',
  title: 'Understanding Price Action',
  source_video: 'hbQ6Pvauixs',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's talk about price action. Price action is the most basic building block of price, and it's how we read the psychology of buyers and sellers — who's in control, where price is going, and why. It underpins everything that follows: supply and demand, and support and resistance.",
      panel: {
        kicker: 'Course 1 · Foundations',
        title: 'Understanding Price Action',
        lines: [
          'The building block of every price move',
          'Reads the psychology of **buyers** and **sellers**',
          'Underpins supply & demand and support & resistance'
        ]
      }
    },
    {
      id: 'three-charts',
      type: 'CONCEPT',
      say: "Line, bar, and candlestick charts all tell the same story — price rises, pulls back, and resumes. The difference is detail. A line only shows the closing price; bars and candles show the open, high, low, and close. We'll use Japanese candlesticks, because their bodies and wicks make the buyer-versus-seller battle easy to read.",
      panel: {
        title: 'Same Story, More Detail',
        lines: [
          'Line, bar, and candle charts tell the **same** story',
          'A line shows only the close; candles show open, high, low, close',
          'We read **Japanese candlesticks** — bodies and wicks reveal control'
        ]
      }
    },
    {
      id: 'anatomy-body',
      type: 'CANDLE',
      candle: 'anatomy',
      heading: 'Anatomy of a Candle — the Body',
      say: "Every candle has four components — open, high, low, and close. Start with the body: it runs between the open and the close. And colour is the convention: a green candle closed above its open — the buyers won the session; a red candle closed below its open — the sellers did.",
      show: [ { kind: 'marker', at: 'open', place: 'left', label: 'open' }, { kind: 'marker', at: 'close', place: 'right', label: 'close' },
        { kind: 'region', of: 'body', label: 'body — open to close · green = closed above the open' }
      ]
    },
    {
      id: 'anatomy-wicks',
      type: 'CANDLE',
      candle: 'anatomy',
      heading: 'Anatomy of a Candle — the Wicks',
      say: "The thin lines above and below the body are the wicks, or shadows. The upper wick reaches the high — the highest point price touched during the session. The lower wick reaches the low. Body plus wicks: those four points are the whole story of one session.",
      show: [
        { kind: 'marker', at: 'high',  label: 'high', place: 'above' },
        { kind: 'region', of: 'upperWick', label: 'upper wick — up to the high' },
        { kind: 'region', of: 'lowerWick', label: 'lower wick — down to the low' },
        { kind: 'marker', at: 'low',   label: 'low', place: 'below' }
      ]
    },
    {
      id: 'body-control',
      type: 'CANDLE',
      candle: 'marubozu_bullish',
      heading: 'The Body Shows Who Won',
      say: "The body tells you who controlled the session. A large body means strong, confident buying or selling. This is a marubozu — a full body with almost no wick. Price opened at the bottom and closed at the top, so the buyers were in complete control. Flip it over and a full red body would mean the sellers ran the session.",
      show: [ { kind: 'marker', at: 'open', place: 'below', label: 'opens at the bottom' }, { kind: 'marker', at: 'close', place: 'above', label: 'closes at the top' },
        { kind: 'region', of: 'body', label: 'full body — buyers in control' }
      ]
    },
    {
      id: 'indecision',
      type: 'CANDLE',
      candle: 'doji',
      heading: 'A Small Body = Indecision',
      say: "A small body is the opposite: very little net buying or selling. This is a doji — the open and close are almost the same, with wicks on both sides. Neither buyers nor sellers won the session. It's a sign of indecision, and often a hint that the trend is pausing.",
      show: [
        { kind: 'region', of: 'upperWick', label: 'wick above' },
        { kind: 'region', of: 'body', label: 'tiny body — neither side wins' },
        { kind: 'region', of: 'lowerWick', label: 'wick below' }
      ]
    },
    {
      id: 'lower-wick',
      type: 'CANDLE',
      candle: 'long_lower_wick',
      heading: 'Long Lower Wick = Buyers Step In',
      say: "Now the wicks. A long lower wick means sellers pushed price down hard during the session, but buyers stepped in and shoved it back up before the close. That's seller exhaustion — the buyers are taking over. You'll hear this shape called a hammer.",
      show: [
        { kind: 'region', of: 'lowerWick', label: 'long lower wick — sellers exhausted' },
        { kind: 'region', of: 'body',      label: 'closes high — buyers step in' }
      ]
    },
    {
      id: 'upper-wick',
      type: 'CANDLE',
      candle: 'long_upper_wick',
      heading: 'Long Upper Wick = Sellers Step In',
      say: "The mirror image is a long upper wick. Buyers drove price up during the session, but sellers overwhelmed them and forced it back down before the close. That's buyer exhaustion — the sellers are taking control. This shape is the shooting star.",
      show: [
        { kind: 'region', of: 'upperWick', label: 'long upper wick — buyers exhausted' },
        { kind: 'region', of: 'body',      label: 'closes low — sellers step in' }
      ]
    },
    {
      id: 'trend-position',
      type: 'CANDLE',
      candle: 'long_lower_wick',
      heading: 'Same Shape, Different Name',
      say: "Here's the twist: what a candle means depends on where it appears in the trend. This long-lower-wick shape at the bottom of a decline is the hammer — buyers stepping in. Print the exact same candle at the top of a rally and it's the hanging man — a warning. Likewise the long upper wick: at the top it's the shooting star, at the bottom it's the inverted hammer.",
      show: [
        { kind: 'region', of: 'lowerWick', label: 'at a bottom: hammer' },
        { kind: 'region', of: 'body',      label: 'at a top, same candle: hanging man' }
      ]
    },
    {
      id: 'doji-family',
      type: 'CONCEPT',
      say: "The doji has a whole family. The gravestone doji — long upper wick, virtually no body — says sellers are in control; a negative sign. Its flip side, the dragonfly doji, has the long wick below: buyers would be in control. The long-legged doji wicks both ways — pure indecision, so wait for the next candle. And the rare four-price doji, where all four prices match, shows up mostly on one-minute charts.",
      panel: {
        title: 'The Doji Family',
        lines: [
          '**Gravestone** — long upper wick, no body → sellers in control',
          '**Dragonfly** — long lower wick → buyers in control',
          '**Long-legged** — wicks both sides → indecision; wait for the next candle',
          '**Four-price** — all four prices equal; rare, tiny timeframes'
        ]
      }
    },
    {
      id: 'story-down',
      type: 'CHART',
      chart: 'candle_story',
      stage: 'down',
      heading: 'Reading the Story',
      say: "Now string them together into a story. It opens with a doji at the top — indecision, nobody sure what happens next. Then a strong red marubozu hands control to the sellers, and another impulse follows it down.",
      show: [ { kind: 'marker', at: 'topDoji', style: 'dot', place: 'above', label: 'doji at the top — indecision' },
        { kind: 'marker', at: 'sellers1', label: 'sellers take control', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'story-reversal',
      type: 'CHART',
      chart: 'candle_story',
      stage: 'reversal',
      say: "Down at the bottom, look what prints: a long lower wick. Sellers tried to keep pushing, buyers absorbed them and shoved the close back up — and the move reverses higher.",
      show: [
        { kind: 'marker', at: 'buyers1',  label: 'buyers step in', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'story-rejection',
      type: 'CHART',
      chart: 'candle_story',
      stage: 'rejection',
      say: "The recovery runs until, near the highs, a long upper wick appears — buyers exhausted, sellers stepping back in. Control changes hands again and price turns down.",
      show: [
        { kind: 'marker', at: 'sellers2', label: 'sellers return', style: 'dot', place: 'above' }
      ]
    },
    {
      id: 'story-pause',
      type: 'CHART',
      chart: 'candle_story',
      stage: 'all',
      say: "A doji pauses the slide — indecision again — and the next move begins. Read each candle like this and you can piece together the whole conversation between buyers and sellers.",
      show: [
        { kind: 'marker', at: 'pause', style: 'dot', place: 'below', label: 'doji pauses' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So to recap: price action is market psychology drawn as candlesticks. The body tells you who controlled the session and how confidently; the wicks tell you where one side got exhausted and the other stepped in. As you look at any chart, ask what each candle is telling you about the buyers and the sellers — that's the skill the rest of the course is built on.",
      panel: {
        title: 'Price Action — Recap',
        lines: [
          'Price action = market psychology, drawn as candles',
          'The **body** = who controlled the session, and how confidently',
          'The **wicks** = where one side exhausted and the other stepped in',
          'Read the candles to anticipate where price goes next'
        ]
      }
    }
  ]
};
