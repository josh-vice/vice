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
      say: "Here's how. We anchor the tool from the swing high to the swing low of the impulse — high to low, that's the convention — and it fans out horizontal levels at the key ratios: 23.6, 38.2, 50 and 61.8 percent. Each level marks how much of the move price has retraced. The two we focus on: the 50 and the 61.8.",
      show: [ { kind: 'marker', at: 'swingHigh', style: 'dot', place: 'above', label: 'swing high — anchor first' }, { kind: 'marker', at: 'swingLow', style: 'dot', place: 'below', label: 'swing low — anchor second' },
        { kind: 'level', at: 'fib382', label: '0.382', side: 'left' },
        { kind: 'level', at: 'fib500', label: '0.5', side: 'left' },
        { kind: 'level', at: 'fib618', label: '0.618', side: 'left' }
      ]
    },
    {
      id: 'bounce',
      type: 'CHART',
      chart: 'fibonacci',
      stage: 'all',
      heading: 'The Retrace Finds the 61.8',
      say: "Now watch what price does. It pulls back from the swing high, sinks through the shallower ratios, and finds the 61.8 percent retracement — then bounces to continue the trend. The higher fib levels like this one can provide the best risk-to-reward: you're buying deep, with invalidation close by and the whole move above you.",
      show: [
        { kind: 'level',  at: 'fib618', label: '0.618', side: 'left' },
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
          'Anchor from the swing **high to the swing low**',
          'The **golden pocket** (~0.618) is the prime zone',
          'Trade it with confluence, not in isolation',
          'A precision layer on top of structure'
        ]
      }
    }
  ]
};
