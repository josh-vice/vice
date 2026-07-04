/* Course2 · 07 — Price Action Examples                 (v2 lesson)
   Source provenance (read-only): YouTube (Course2/07_Price_Action_Examples).
   Formations applied at levels, with volume confirmation. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/07_price_action_examples'] = {
  id: 'course2/07_price_action_examples',
  course: 'Course2_Building_Your_Toolbox',
  module: '07_Price_Action_Examples',
  title: 'Price Action Examples',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Let's put the formations to work and read them the way you would on a live chart. Two rules carry through everything here: only trade a formation once the candle has closed, and use volume to confirm it. A pattern with conviction behind it is worth far more than one without.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Formations in the Wild',
        lines: [
          'Spot formations at key support and resistance',
          'Only act once the candle **closes**',
          'Use **volume** to confirm the move'
        ]
      }
    },
    {
      id: 'engulf-volume',
      type: 'CHART',
      chart: 'engulfing_bullish',
      params: { volume: true },
      stage: 'all',
      heading: 'Engulfing, Confirmed by Volume',
      say: "Here's a bullish engulfing after a down session. But look at the panel below: the engulfing candle prints on roughly double the volume of the day before. That volume spike is the confirmation — it tells us buyers stepped in with real force, not a half-hearted bounce. Formation plus volume equals confluence.",
      show: [
        { kind: 'marker', at: 'prior',  label: 'low-volume down day', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'engulf', label: 'engulfing on 2× volume', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'morning',
      type: 'CHART',
      chart: 'morning_star',
      stage: 'all',
      heading: 'A Morning Star at Support',
      say: "Now a three-candle read: a morning star. A down candle, then indecision, then a strong up candle that closes back past the first candle's midpoint. Spotted at a support level, this is a high-quality reversal trigger — and notice we waited for that third candle to close before calling it.",
      show: [ { kind: 'level', at: 'support', side: 'left', label: 'support — spotted here', tone: 'support' },
        { kind: 'level', at: 'midpoint', side: 'right', label: 'first candle\'s midpoint' },
        { kind: 'marker', at: 'star',    label: 'indecision', style: 'dot', place: 'below' },
        { kind: 'marker', at: 'confirm', label: 'reversal confirmed on close', style: 'reversal', place: 'above' }
      ]
    },
    {
      id: 'crows',
      type: 'CHART',
      chart: 'three_black_crows',
      stage: 'all',
      heading: 'Three Black Crows — Continuation Down',
      say: "And the most in-your-face of all: three black crows. A first down candle, a second whose body dwarfs it, and a third with a large impulse lower — sellers flexing session after session. What follows is trend continuation to the downside. The more obvious the formation, the more traders see it — and the more it can become a self-fulfilling move.",
      show: [
        { kind: 'marker', at: 'crow1', label: 'one', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'crow2', label: 'two', style: 'dot', place: 'above' },
        { kind: 'marker', at: 'crow3', label: 'three — continuation down', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So as you scan charts, hunt for these formations at your levels — and let two things gate every trade: a closed candle, and supporting volume. Formation, level, and volume stacked together is exactly the confluence the LTE method is built on. Up next, Trip takes us deeper into volume itself.",
      panel: {
        title: 'Examples — Recap',
        lines: [
          'Find formations **at your levels**',
          'Wait for the **close** — never jump the gun',
          'Confirm with **volume**',
          'Formation + level + volume = confluence'
        ]
      }
    }
  ]
};
