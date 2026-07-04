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
      id: 'anatomy',
      type: 'CANDLE',
      candle: 'anatomy',
      heading: 'Anatomy of a Candle',
      say: "Every candle has four components. The body runs between the open and the close. The thin lines above and below are the wicks — the upper wick reaches the high of the session, the lower wick reaches the low. Those four points, open, high, low, and close, are the whole story of one session.",
      show: [
        { kind: 'marker', at: 'high',  label: 'high', place: 'above' },
        { kind: 'region', of: 'upperWick', label: 'upper wick' },
        { kind: 'region', of: 'body',      label: 'body — open to close' },
        { kind: 'region', of: 'lowerWick', label: 'lower wick' },
        { kind: 'marker', at: 'low',   label: 'low', place: 'below' }
      ]
    },
    {
      id: 'body-control',
      type: 'CANDLE',
      candle: 'marubozu_bullish',
      heading: 'The Body Shows Who Won',
      say: "The body tells you who controlled the session. A large body means strong, confident buying or selling. This is a marubozu — a full body with almost no wick. Price opened at the bottom and closed at the top, so the buyers were in complete control. Flip it over and a full red body would mean the sellers ran the session.",
      show: [
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
        { kind: 'region', of: 'body', label: 'tiny body — neither side wins' }
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
      id: 'story',
      type: 'CHART',
      chart: 'candle_story',
      stage: 'all',
      heading: 'Reading the Story',
      say: "Now string them together. A doji at the top shows indecision, then a strong red body hands control to the sellers. Down at the bottom, a long lower wick shows buyers stepping in and the move reverses up. Near the highs a long upper wick hands control back to the sellers, a doji pauses, and the next move begins. Read each candle and you can piece together the whole conversation between buyers and sellers.",
      show: [
        { kind: 'marker', at: 'sellers1', label: 'sellers take control', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'buyers1',  label: 'buyers step in', style: 'reversal', place: 'below' },
        { kind: 'marker', at: 'sellers2', label: 'sellers return', style: 'dot', place: 'above' }
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
