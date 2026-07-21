/* Course3 · 03 — Deposit and Withdraw                  (v2 lesson, concept-only)
   Source was a BitMEX UI walkthrough; distilled here into platform-agnostic mechanics. */
(window.LT_LESSONS = window.LT_LESSONS || {})['course3/03_deposit_and_withdraw'] = {
  id: 'course3/03_deposit_and_withdraw',
  course: 'Course3_Sharpening_Your_Edge',
  module: '03_Deposit_and_Withdraw',
  title: 'Deposit and Withdraw',
  beats: [
    {
      id: 'intro',
      type: 'CONCEPT',
      say: "Before you can trade a single setup, you need capital on the exchange. Every derivatives exchange has the same basic anatomy: a trading area where the action happens, and an account area where your money lives. Let's get comfortable with the account side first.",
      panel: {
        kicker: 'Course 3 · Sharpening Your Edge',
        title: 'Funding Your Account',
        lines: [
          'Trading needs capital **on** the exchange',
          'Two areas: the **trade** view and the **account**',
          'Master the account side first'
        ]
      }
    },
    {
      id: 'wallet',
      type: 'CONCEPT',
      say: "Your account holds a wallet — your balance. You deposit by sending crypto to the exchange's address, and withdraw by sending to a destination address — triple-check it, because crypto transfers are irreversible. Withdrawals are often batched: on some exchanges just once a day at a set cut-off, so know your exchange's windows. Every deposit steps the balance up, every withdrawal steps it down, and every closed trade adds its realized P&L.",
      panel: {
        title: 'The Wallet',
        lines: [
          '**Deposit** in, **withdraw** out — via addresses',
          'Addresses are **irreversible** — triple-check',
          'Withdrawals batch — **know your windows**',
          'Balance steps **up** on deposits, **down** on withdrawals',
          'Closed trades add **realized P&L**'
        ]
      }
    },
    {
      id: 'testnet',
      type: 'CONCEPT',
      say: "Here's the smartest move a new trader can make: practice on a testnet first. Most exchanges offer one — a fully functional clone of the real platform that runs on imaginary money. Use it to learn every button and mechanic with zero risk. By the time you trade real capital, the interface should feel like second nature.",
      panel: {
        title: 'Practice First',
        lines: [
          'Most exchanges offer a **testnet** (demo)',
          'A real interface, with imaginary money',
          'Learn the mechanics at **zero risk** first'
        ]
      }
    },
    {
      id: 'recap',
      type: 'CONCEPT',
      say: "So: fund the account with a deposit, watch the wallet balance reflect your activity, and rehearse on a testnet until the platform is muscle memory. Mechanics like these aren't glamorous, but fumbling them with real money is a costly way to learn. Next, we open up the order book.",
      panel: {
        title: 'Deposit & Withdraw — Recap',
        lines: [
          'Deposit to fund, withdraw to remove',
          'The wallet balance tracks all activity',
          'Rehearse on a **testnet** before going live'
        ]
      }
    }
  ]
};
