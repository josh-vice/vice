/* Course2 · 12 — Fibonacci                             (v2 lesson) */
(window.LT_LESSONS = window.LT_LESSONS || {})['course2/12_fibonacci'] = {
  id: 'course2/12_fibonacci',
  course: 'Course2_Building_Your_Toolbox',
  module: '12_Fibonacci',
  title: 'Fibonacci',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Time for one of my favourite tools: Fibonacci. After a strong move, price rarely runs in a straight line — it pulls back before continuing. Fibonacci retracements give us a map of where those pullbacks tend to find support or resistance, based on ratios that show up again and again in markets.",
      panel: {
        kicker: 'Course 2 · Building Your Toolbox',
        title: 'Fibonacci',
        lines: [
          'Strong moves **retrace** before continuing',
          'Fib ratios map where pullbacks tend to react',
          'A tool for entries within a trend'
        ]
      }
    },
    {
      id: 'measure',
      type: 'CHART',
      chart: 'fibonacci',
      stage: 'all',
      heading: 'Measure the Swing',
      say: "Here's how. We anchor the tool from the swing low to the swing high of an impulse, and it draws horizontal levels at the key ratios: the 38.2, the 50, the 61.8, and the 78.6 percent retracements. Watch what price does — it pulls back, finds the 61.8 level, and bounces to continue the trend. That zone around 61.8 is the one traders watch most closely.",
      show: [ { kind: 'marker', at: 'swingLow', style: 'dot', place: 'below', label: 'swing low' }, { kind: 'marker', at: 'swingHigh', style: 'dot', place: 'above', label: 'swing high' },
        { kind: 'level', at: 'fib382', label: '0.382', side: 'left' },
        { kind: 'level', at: 'fib500', label: '0.5', side: 'left' },
        { kind: 'level', at: 'fib618', label: '0.618 — golden pocket', side: 'left' },
        { kind: 'level', at: 'fib786', label: '0.786', side: 'left' },
        { kind: 'marker', at: 'bounce', label: 'retrace + bounce', style: 'reversal', place: 'below' }
      ]
    },
    {
      id: 'golden',
      type: 'CONCEPT',
      say: "That 61.8 percent level, give or take, is called the golden pocket — historically the highest-probability spot for a retracement to reverse. But Fibonacci isn't magic on its own. Its real power comes from confluence: when the golden pocket lines up with a support level, a trendline, or a candlestick trigger, that's where the best entries live.",
      panel: {
        title: 'The Golden Pocket',
        lines: [
          '~**0.618** = the golden pocket',
          'Highest-probability retracement reaction',
          'Fib alone isn’t magic — stack it for **confluence**',
          'Best entries: golden pocket **+** a level or trigger'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So use Fibonacci to find where a pullback is likely to end, lean on the golden pocket, and only act when it agrees with the rest of your read. It's a precision tool layered on top of the structure you already know. Next, Zorn's favourite standalone system: the Ichimoku Kinko Hyo.",
      panel: {
        title: 'Fibonacci — Recap',
        lines: [
          'Anchor low→high; read the key ratios',
          'The **golden pocket** (~0.618) is the prime zone',
          'Trade it with confluence, not in isolation',
          'A precision layer on top of structure'
        ]
      }
    }
  ]
};
