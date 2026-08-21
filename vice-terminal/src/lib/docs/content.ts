export type DocSection = {
	id: string;
	title: string;
	body: string[];
	steps?: string[];
	points?: string[];
};

export type DocTopic = {
	slug: string;
	group: string;
	label: string;
	title: string;
	description: string;
	kicker: string;
	visual?: {
		src: string;
		alt: string;
		caption: string;
	};
	mediaSlots?: {
		kind: 'screenshot' | 'video';
		label: string;
		purpose: string;
	}[];
	sections: DocSection[];
};

export const docGroups = [
	{
		label: 'Welcome',
		items: [
			['overview', '🖥️ Vice Terminal', false],
			['why-vice', '🚀 Product vision', false],
			['account-access', '✍️ Account access', false],
			['security-model', '🔑 Security', false],
			['faq', '❔ Frequently asked questions', false],
			['legal-disclosures', '🏛️ Legal & risk disclosures', false],
			['launch-roadmap', 'Launch roadmap', false]
		]
	},
	{
		label: 'Setup',
		items: [
			['connect-wallet', 'Connect a wallet', false],
			['enable-trading', 'Enable trading', false],
			['add-hyperliquid', 'Adding Hyperliquid', false],
			['add-venue-credentials', 'Adding venue credentials', false],
			['sync-devices', 'Synchronize across devices', false],
			['pwa-guide', 'Progressive Web App guide', false],
			['stream-deck', 'Stream Deck setup', false],
			['self-hosted-runner', 'Self-hosted runner setup', false]
		]
	},
	{
		label: 'Application elements',
		items: [
			['interface-overview', 'UI overview', false],
			['performance', 'Performance', false],
			['workspace-modes', 'Workspace modes', false],
			['multi-account', 'Multi account', true],
			['linked-panels', 'Link system', false],
			['layouts-hotkeys', 'Hotkeys', true],
			['desktop-mode', 'Desktop mode', false],
			['mobile-companion', 'Mobile mode', false],
			['header-controls', 'Header controls', false],
			['chart-trading', 'Interactive chart', false],
			['tradingview-chart', 'TradingView chart', true],
			['orderbook', 'Orderbook', false],
			['trades-liquidations', 'Trades + liquidations', false],
			['instruments', 'Tickers / instruments', false],
			['activity', 'Activity', false],
			['orders', 'Orders', false],
			['position-controls', 'Positions', false],
			['dom-ladder', 'DOM', false],
			['pnl-cards', 'PnL cards', false],
			['aggregated-tape', 'Aggregated tape', false],
			['balances', 'Balances', false],
			['workspace-layouts', 'Layouts', false],
			['basket-trading', 'Basket trading', false],
			['market-panel', 'Market', false],
			['news', 'News', false],
			['privacy-sound', 'Privacy & sound', false]
		]
	},
	{
		label: 'Execution panel',
		items: [
			['order-entry', 'Place order overview', false],
			['size-slider', 'Size input / slider', false],
			['reduce-only', 'Reduce-only switch', false],
			['tp-sl', 'TP / SL switch', false],
			['buy-sell', 'Buy / sell controls', false],
			['margin-leverage', 'Margin / leverage control', false]
		]
	},
	{
		label: 'Limit & advanced',
		items: [
			['limit-order', 'Limit', false],
			['stop-limit', 'Stop limit', false],
			['click-placement', 'Click placement', false],
			['chase', 'Chase', false],
			['scale', 'Scale', false],
			['scale-side', 'Scale side', false],
			['advanced-orders', 'Advanced order library', false]
		]
	},
	{
		label: 'Market',
		items: [
			['market-order', 'Market', false],
			['stop-market', 'Stop market order', false],
			['swarm', 'Swarm', false],
			['twap', 'TWAP', false]
		]
	},
	{
		label: 'Automation',
		items: [
			['automation', 'Overview', false],
			['automation-setup', 'Setup', false],
			['self-hosted-execution', 'Self-hosted execution', false],
			['automation-twap', 'TWAP execution', false],
			['conditional-orders', 'Conditional orders', false],
			['trigger-types', 'Trigger types', false],
			['automation-history', 'Activity and order history', false]
		]
	},
	{
		label: 'Terminal CLI',
		items: [
			['terminal-cli', 'Overview', false],
			['cli-constants', 'Constant values', false],
			['cli-variables', 'User-defined variables', false],
			['cli-general', 'General commands', false],
			['cli-chaining', 'Chaining', false],
			['cli-repeat', 'Repeat', false],
			['cli-shortcuts', 'Shortcut / hotkeys', false],
			['cli-aliases', 'Alias', false],
			['cli-ui-control', 'UI control', false],
			['cli-simple-orders', 'Simple ordering', false],
			['cli-stops', 'Stops', false],
			['cli-orders-with-stops', 'Ordering with stops', false],
			['cli-cancel', 'Cancel orders', false],
			['cli-close', 'Close position', false],
			['cli-reverse', 'Reverse position', false],
			['cli-scale', 'Scale orders', false],
			['cli-chase', 'Chase orders', false],
			['cli-swarm', 'Swarm order', false],
			['cli-twap', 'TWAP order', false],
			['cli-twap-chase', 'TWAP chase order', false]
		]
	},
	{
		label: 'Venues',
		items: [
			['hyperliquid', 'Hyperliquid', false],
			['hip3-spot', 'HIP-3 & spot', false],
			['multi-venue', 'Multi-venue expansion', false],
			['market-data', 'Market data architecture', false],
			['alerts-signals', 'Alerts & signals', false]
		]
	}
] as const;

const coreTopics: Record<string, DocTopic> = {
	'why-vice': {
		slug: 'why-vice',
		group: 'Welcome',
		label: 'Why Vice',
		title: 'A terminal built around trader control',
		description: 'Vice compresses the entire trading loop into one fast, legible workspace while preserving custody, execution truth, and exact market identity.',
		kicker: 'Product philosophy',
		sections: [
			{
				id: 'one-workspace',
				title: 'One workspace, one execution standard',
				body: ['Charts, order tickets, the DOM, hotkeys, the CLI, position controls, and automation all resolve through the same market identity and execution boundary. A trade behaves consistently regardless of where it starts.'],
				points: ['No floating-window maze', 'No separate execution rules per surface', 'No display-symbol routing']
			},
			{
				id: 'speed-with-proof',
				title: 'Speed with proof',
				body: ['Vice treats latency as a product contract. Feed receipt, state updates, frame readiness, and signed dispatch are measured independently so performance can be improved without weakening execution safety.'],
				points: ['Receipt-to-store timing', 'One-frame frame-ready target', 'Signed-dispatch latency budget']
			},
			{
				id: 'economics',
				title: 'Aligned economics',
				body: ['The platform is designed around transparent venue economics, explicit attribution, and a materially lower Hyperliquid builder fee than incumbent terminals. Fees are disclosed before trading authority is enabled.']
			}
		]
	},
	'security-model': {
		slug: 'security-model',
		group: 'Welcome',
		label: 'Security model',
		title: 'Non-custodial by architecture',
		description: 'The wallet establishes account identity. A wallet-approved device-local agent signs trades. Vice-hosted services never hold the trading key.',
		kicker: 'Trust & custody',
		sections: [
			{
				id: 'authority',
				title: 'Where trading authority lives',
				body: ['A device-local agent key is generated in the browser, approved by the connected wallet, encrypted at rest, and unlocked with a deterministic wallet signature. The master wallet remains the source of account authority.'],
				points: ['Encrypted device-local agent', 'Wallet-bound unlock', 'Account and network isolation']
			},
			{
				id: 'execution',
				title: 'How an order is protected',
				body: ['Every order uses an exact venue asset identity, deterministic client order IDs, bounded retry, and an absolute expiry. An uncertain venue outcome blocks duplicate mutations until reconciliation establishes what actually happened.'],
				steps: ['Validate live market and account state', 'Reserve a unique command identity', 'Sign locally with an expiry', 'Transmit once with bounded retry', 'Reconcile uncertain outcomes']
			},
			{
				id: 'fail-closed',
				title: 'Fail-closed product behavior',
				body: ['Stale data, wallet mismatches, incomplete product terms, or unresolved commands disable unsafe actions. Cancellation and reconciliation remain available whenever they can be performed safely.']
			}
		]
	},
	'launch-roadmap': {
		slug: 'launch-roadmap',
		group: 'Welcome',
		label: 'Launch roadmap',
		title: 'From Hyperliquid-native to cross-venue command',
		description: 'The delivery plan grows outward from a complete Hyperliquid workflow while preserving one execution and certification standard.',
		kicker: 'Delivery vision',
		sections: [
			{ id: 'phase-one', title: 'Phase 01 — Hyperliquid-native', body: ['Complete perps, spot, HIP-3, chart trading, advanced execution, market intelligence, and position management in one non-custodial workspace.'] },
			{ id: 'phase-two', title: 'Phase 02 — Trader operating system', body: ['Add the full DOM, richer automation, programmable workflows, mobile continuity, and native-performance rendering.'] },
			{ id: 'phase-three', title: 'Phase 03 — Multi-venue command', body: ['Certify additional DEX and CEX adapters, unify workflows across venues, and introduce cross-venue execution without compromising custody clarity.'] }
		]
	},
	'connect-wallet': {
		slug: 'connect-wallet',
		group: 'Getting started',
		label: 'Connect a wallet',
		title: 'Connect your trading account',
		description: 'Use an EVM wallet to establish the account whose balances, positions, orders, fills, and trading authority Vice will manage locally.',
		kicker: 'Setup',
		sections: [
			{ id: 'connect', title: 'Connect', body: ['Select Connect in the terminal header and approve read access in your wallet. Connecting identifies the account; it does not grant trading authority.'], steps: ['Open the account control', 'Select the wallet provider', 'Confirm the displayed account', 'Wait for ACCOUNT to report LIVE'] },
			{ id: 'network', title: 'Choose a network', body: ['Testnet is the safe default. Network identity is isolated throughout feeds, account state, local storage, agent authority, and command history.'] },
			{ id: 'disconnect', title: 'Disconnect safely', body: ['Disconnecting immediately clears private account surfaces. Public market data can remain live while positions, orders, fills, and balances return to an offline state.'] }
		]
	},
	'enable-trading': {
		slug: 'enable-trading',
		group: 'Getting started',
		label: 'Enable trading',
		title: 'Create a device-local trading agent',
		description: 'Enable fast order signing without transferring custody to Vice or repeatedly confirming every order in the master wallet.',
		kicker: 'Setup',
		sections: [
			{ id: 'create-agent', title: 'Create the agent', body: ['Vice generates a new agent key locally and asks the connected master wallet to approve it for the current account and network. The ticket shows each step of this lifecycle as it happens instead of a generic spinner: verifying the wallet account, checking existing authority, waiting for your wallet approval, waiting for the venue confirmation, then synchronizing your account.'], steps: ['Review the custody disclosure', 'Review the builder fee', 'Approve the agent in your wallet', 'Wait for the venue confirmation', 'Confirm your account is synchronized'] },
			{ id: 'unlock', title: 'Unlock on return', body: ['On a returning device, sign the deterministic unlock message. Vice verifies that the decrypted agent address matches the approved address before enabling any mutation.'] },
			{ id: 'revoke', title: 'Revoke authority', body: ['Use the wallet or venue controls to revoke the agent, then remove the local encrypted vault. The kill switch can halt new place and modify actions while retaining recovery controls.'] },
			{ id: 'enablement-failures', title: 'If enablement does not complete', body: ['Enablement failures are labeled honestly rather than shown as a generic error. A rejected wallet signature is not the same as a venue rate limit, a timed-out network read, a stale account snapshot, or the wallet switching accounts mid-prompt.'], steps: ['Review the labeled error in the ticket', 'For rejection or a wallet switch, re-confirm the correct account and retry', 'For a venue rate limit, wait for the bounded countdown to finish, then retry', 'For a timeout, offline, or stale account, retry to re-read the current state', 'Dismiss to return the ticket to a ready state at any point'] }
		]
	},
	'interface-overview': {
		slug: 'interface-overview',
		group: 'Getting started',
		label: 'Interface overview',
		title: 'The Vice workspace',
		description: 'Every important action stays visible inside a fixed information hierarchy designed for rapid scanning and low interaction cost.',
		kicker: 'Application elements',
		visual: { src: '/docs/vice-workspace-overview.png', alt: 'Vice Terminal desktop workspace', caption: 'The desktop workspace keeps markets, price action, execution, and account state visible together.' },
		sections: [
			{ id: 'market-scan', title: '1. Market scan', body: ['Search the available universe, filter product classes, and switch exact market identities without losing the workspace context.'] },
			{ id: 'price-action', title: '2. Price action', body: ['The chart, order book, trades, and market statistics form one synchronized public-data surface. Health labels distinguish live, stale, degraded, and offline state.'] },
			{ id: 'execution', title: '3. Execution', body: ['The order ticket exposes direct orders, advanced strategies, risk sizing, leverage, persistence class, and local safety controls.'] },
			{ id: 'account', title: '4. Account command center', body: ['Positions, orders, fills, algorithms, TWAP activity, bulk controls, PnL, and dead-man state share the lower account surface.'] }
		]
	},
	'order-entry': {
		slug: 'order-entry',
		group: 'Trading',
		label: 'Order entry',
		title: 'Place a direct order',
		description: 'The ticket combines clear order intent, exact venue formatting, risk controls, and persistence disclosure before anything is signed.',
		kicker: 'Execution panel',
		visual: { src: '/docs/vice-order-entry.png', alt: 'Vice Terminal order ticket in the right workspace column', caption: 'The order ticket keeps side, type, size, price, leverage, and risk controls together.' },
		sections: [
			{ id: 'choose-type', title: 'Choose an order type', body: ['Start with Market, Limit, Stop, Stop Limit, or Bracket. Advanced strategies appear in the same ticket, preserving a single workflow as execution complexity grows.'] },
			{ id: 'define-risk', title: 'Define size and risk', body: ['Enter base or quote size, use percentage presets, or size from risk-to-stop distance. Local order-notional and position-notional limits are checked before signing.'] },
			{ id: 'review-submit', title: 'Review and submit', body: ['Vice shows side, price logic, reduce-only behavior, persistence class, fee attribution, and the active account before submission.'], steps: ['Select buy or sell', 'Choose order type', 'Enter size and price rules', 'Review persistence and fee disclosure', 'Submit through the local signer'] },
			{ id: 'outcomes', title: 'Understand the outcome', body: ['Accepted, rejected, partial, and uncertain outcomes are distinct. Uncertain results enter reconciliation and cannot silently produce a duplicate order.'] }
		]
	},
	'chart-trading': {
		slug: 'chart-trading',
		group: 'Trading',
		label: 'Chart trading',
		title: 'Trade directly from price action',
		description: 'Create, preview, place, and modify orders without separating analysis from execution.',
		kicker: 'Interactive chart',
		visual: { src: '/docs/vice-chart-trading.png', alt: 'Vice Terminal interactive chart', caption: 'The chart keeps price action and working context legible beside live market depth.' },
		sections: [
			{ id: 'place', title: 'Place from the chart', body: ['Arm click placement, choose the intended field or order mode, and click the price level. The chart never treats an exploratory click as consent to trade.'], steps: ['Arm click placement', 'Select side and order behavior', 'Click the target price', 'Review the draft', 'Confirm the order'] },
			{ id: 'designer', title: 'Preview with Designer', body: ['Designer mode renders draft entry, stop, take-profit, and risk geometry before submission. It is a planning surface until the trader explicitly confirms.'] },
			{ id: 'modify', title: 'Drag to modify', body: ['Drag a live order overlay to a new level. Trigger orders preserve trigger semantics, and every modification passes through identity, expiry, journal, and reconciliation checks.'] },
			{ id: 'overlays', title: 'Read account overlays', body: ['Orders, positions, liquidation levels, drafts, and strategy state are rendered only when the private account snapshot is authoritative.'] }
		]
	},
	'advanced-orders': {
		slug: 'advanced-orders',
		group: 'Trading',
		label: 'Advanced order suite',
		title: 'Express complex execution without scripting',
		description: 'Vice turns institutional execution patterns into visible, restart-aware strategies with shared safety and reconciliation.',
		kicker: 'Advanced execution',
		sections: [
			{ id: 'library', title: 'Strategy library', body: ['Scale, Chase, Swarm, Iceberg, OCO, Ping-Pong, Trailing Stop, Break-Even, TWAP, adaptive TWAP, VWAP, POV, maker routing, and conditional ladders are designed as first-class order workflows.'], points: ['Atomic Scale with 2–100 levels', 'Native and adaptive TWAP', 'Volume-aware VWAP and POV', 'Maker-first Chase and routing'] },
			{ id: 'lifecycle', title: 'Lifecycle controls', body: ['Local strategies expose child orders, progress, pause reason, recovery status, and emergency actions. Strategy ticks are serialized per job so reconnects or slow venue acknowledgements do not create duplicate children.'] },
			{ id: 'persistence', title: 'Persistence classes', body: ['Venue-native orders survive the browser. Device-local strategies restore and reconcile on the same device. An optional self-hosted runner extends local authority into a headless runtime.'] },
			{ id: 'dead-man', title: 'Dead-man protection', body: ['Long-running strategies can maintain venue-side schedule-cancel protection so known open orders are removed if the local runtime stops refreshing its lease.'] }
		]
	},
	'dom-ladder': {
		slug: 'dom-ladder',
		group: 'Trading',
		label: 'DOM ladder',
		title: 'Trade the depth of market',
		description: 'A low-latency ladder joins price, liquidity, working orders, position context, and one-click execution in a single vertical surface.',
		kicker: 'Depth of market',
		sections: [
			{ id: 'read', title: 'Read the ladder', body: ['Bid and ask depth, grouped prices, recent trade activity, working orders, average entry, and position size align to exact price rows.'] },
			{ id: 'click', title: 'Click to trade', body: ['Armed row clicks place limits at the selected price. Shift-click creates stops. Quick-size presets and local risk caps apply before signing.'], steps: ['Choose a quick size', 'Arm ladder trading', 'Click a price for a limit', 'Shift-click for a stop', 'Use the row control to cancel or reprice'] },
			{ id: 'manage', title: 'Manage from the row', body: ['Cancel individual orders, cancel a side, drag to reprice, flatten, or reverse while keeping authoritative outcomes aligned with the row.'] },
			{ id: 'rendering', title: 'Rendering model', body: ['The DOM is the primary candidate for Vice’s native-performance rendering layer: bounded updates, visibility culling, and a direct data-to-paint path.'] }
		]
	},
	'position-controls': {
		slug: 'position-controls',
		group: 'Trading',
		label: 'Position controls',
		title: 'Manage risk in one action',
		description: 'Close, reverse, flatten, protect, and reconcile positions across markets from the account command center.',
		kicker: 'Positions',
		sections: [
			{ id: 'quick-close', title: 'Quick close', body: ['Close at market, place a reduce-only limit at the executable quote, distribute a Scale close, or start a native TWAP close.'] },
			{ id: 'reverse', title: 'Reverse safely', body: ['Vice closes the current position, waits for an exact flat account snapshot, and only then opens the opposite side. A rejected second leg reports flat-with-error rather than retrying silently.'] },
			{ id: 'bulk', title: 'Bulk controls', body: ['Cancel all bids, asks, or both. Close all longs, shorts, or all positions. Each market produces its own authoritative outcome so a partial fan-out never looks complete.'] },
			{ id: 'protection', title: 'Automatic protection', body: ['Configure risk-based size, maximum order and position notionals, break-even behavior, trailing protection, and reduce-only Scale take-profit ranges.'] }
		]
	},
	'market-data': {
		slug: 'market-data',
		group: 'Intelligence',
		label: 'Market data',
		title: 'A high-signal view of the market',
		description: 'Vice combines live price formation, market context, product identity, and feed health without presenting synthetic data as live.',
		kicker: 'Market intelligence',
		sections: [
			{ id: 'surfaces', title: 'Data surfaces', body: ['All-mids, candles, order book, recent trades, funding, open interest, spread, 24-hour volume, index, and mark price share the selected market identity.'] },
			{ id: 'health', title: 'Truthful feed health', body: ['Every surface distinguishes connecting, live, stale, degraded, error, offline, and unavailable. Stale public data may remain visible with a veil; stale private overlays disappear.'] },
			{ id: 'multi-tab', title: 'Shared data plane', body: ['An origin-wide worker coalesces compatible public subscriptions across tabs, isolates testnet from mainnet, validates frames, and fans out only the exact data each tab requested.'] },
			{ id: 'analytics', title: 'Market analytics', body: ['The roadmap adds grouping, imbalance, pull/stack behavior, update rate, aggregated tape, liquidation context where authoritative data exists, and cross-venue comparison.'] }
		]
	},
	'alerts-signals': {
		slug: 'alerts-signals',
		group: 'Intelligence',
		label: 'Alerts & signals',
		title: 'Stay responsive without staring at every market',
		description: 'Price, strategy, fill, and market-state alerts keep the trader informed while respecting local privacy.',
		kicker: 'Notifications',
		sections: [
			{ id: 'price-alerts', title: 'Price alerts', body: ['Create above, below, cross, and revisit alerts against exact markets. Alerts pause when the required feed is stale and never fire from cached values.'] },
			{ id: 'sounds', title: 'Sound controls', body: ['Configure fills, order events, strategy events, and alerts independently, with a global mute for streaming and shared environments.'] },
			{ id: 'signals', title: 'Signal inputs', body: ['A shared fail-closed trigger engine defines price-cross, candle-close, candle-volume, time, and synthetic-pair inputs. Each is wired only to the uncertified conditional ladder and pauses when its required live input is unavailable.'] }
		]
	},
	'automation': {
		slug: 'automation',
		group: 'Intelligence',
		label: 'Automation',
		title: 'Automation without custody ambiguity',
		description: 'Vice chooses the most durable execution primitive available while making runtime and persistence visible before submission.',
		kicker: 'Automation',
		sections: [
			{ id: 'ladder', title: 'Persistence ladder', body: ['Venue-native stops, brackets, and native TWAP survive every Vice runtime. Device-local jobs persist and reconcile on reopen. A user-run headless runner is planned but unavailable; Vice hosts no signing service.'] },
			{ id: 'triggers', title: 'Conditional triggers', body: ['Price-cross, candle-close, candle-volume, time, and synthetic-pair triggers are wired only to the uncertified conditional ladder. Stale inputs pause; missed crossings never fire later. Device-local telemetry records fire, pause, and miss counts without strategy values.'] },
			{ id: 'recovery', title: 'Restart and reconnect', body: ['Jobs restore their progress, reconcile every known child, check dead-man state, and resume only after market and account inputs are authoritative.'] },
			{ id: 'controls', title: 'Operator controls', body: ['Pause, resume, cancel, inspect child orders, review trigger state, and emergency-stop the local runtime from a unified automation panel.'] }
		]
	},
	'terminal-cli': {
		slug: 'terminal-cli',
		group: 'Intelligence',
		label: 'Terminal CLI',
		title: 'Command the terminal at typing speed',
		description: 'The CLI turns orders, algorithms, position controls, variables, aliases, and UI actions into a composable power-user surface.',
		kicker: 'Terminal CLI',
		sections: [
			{ id: 'commands', title: 'Command families', body: ['Place and cancel orders, start advanced strategies, inspect positions and balances, switch markets, focus panels, and invoke certified risk controls.'] },
			{ id: 'composition', title: 'Compose workflows', body: ['Use variables, aliases, repeat, and semicolon chaining. Chained commands execute in order and stop at the first failure with a result for every attempted step.'], steps: ['Define $size and $risk', 'Create a reusable alias', 'Chain setup and execution', 'Bind the alias to a hotkey'] },
			{ id: 'safety', title: 'Same safety boundary', body: ['The CLI cannot bypass identity checks, certification, consent, custody, stale-state gates, or local signing. It is a faster input surface, not a second execution engine.'] }
		]
	},
	'layouts-hotkeys': {
		slug: 'layouts-hotkeys',
		group: 'Workspace',
		label: 'Layouts & hotkeys',
		title: 'A focused workspace that adapts',
		description: 'Vice provides a dockable, saved desktop workspace while keeping execution identity explicit and input paths shared.',
		kicker: 'Workspace',
		sections: [
			{ id: 'presets', title: 'Saved layouts', body: ['Default, Chart Max, and Data Dense are named local starting layouts. A workspace restores its own docked, resized, tabbed, or floating panel arrangement after validation.'] },
			{ id: 'panels', title: 'Panel controls', body: ['Dock panels, resize groups, create tabs, or use supported floating/popout controls. Layouts contain only presentation state; the chart and ticket still use exact shared market and account identity.'] },
			{ id: 'hotkeys', title: 'Programmable hotkeys', body: ['Bind side, size presets, timeframes, click placement, CLI, panel focus, and certified position actions. Conflict detection prevents ambiguous bindings and typing fields suppress global actions.'] }
		]
	},
	'mobile-companion': {
		slug: 'mobile-companion',
		group: 'Workspace',
		label: 'Mobile companion',
		title: 'Carry the essential workflow',
		description: 'The mobile surface preserves market discovery, chart context, account visibility, and intentional order entry in a compact layout.',
		kicker: 'Mobile',
		sections: [
			{ id: 'navigation', title: 'Focused navigation', body: ['Markets and Trade form the primary tabs. Order book and recent trades remain available without recreating the desktop density.'] },
			{ id: 'entry', title: 'Intentional order entry', body: ['The order ticket opens as a dedicated sheet, giving size, order logic, disclosures, and confirmation the space they need.'] },
			{ id: 'continuity', title: 'Account continuity', body: ['Network, account, feed health, positions, orders, fills, privacy preferences, and local safety state remain consistent with desktop semantics.'] }
		]
	},
	'privacy-sound': {
		slug: 'privacy-sound',
		group: 'Workspace',
		label: 'Privacy & sound',
		title: 'Control what the room can see and hear',
		description: 'Streaming-safe privacy controls and configurable sound notifications adapt Vice to shared workspaces without altering account state.',
		kicker: 'Preferences',
		sections: [
			{ id: 'privacy', title: 'Privacy mode', body: ['Mask balances, position sizes, order sizes, wallet identity, and PnL across the terminal. Privacy mode changes presentation only; signing and reconciliation continue against the real values.'] },
			{ id: 'sound', title: 'Sound profile', body: ['Choose sounds for fills, strategy events, price alerts, and risk events. A master mute is always available in the header.'] },
			{ id: 'local', title: 'Local preferences', body: ['Privacy, sound, layouts, bindings, aliases, variables, and panel choices are stored locally and restore without restoring private account snapshots.'] }
		]
	},
	'hyperliquid': {
		slug: 'hyperliquid',
		group: 'Venues',
		label: 'Hyperliquid',
		title: 'Hyperliquid-native from the start',
		description: 'Vice begins with a deep, non-custodial Hyperliquid integration rather than a shallow lowest-common-denominator venue layer.',
		kicker: 'Venues',
		sections: [
			{ id: 'coverage', title: 'Product coverage', body: ['Core perpetuals, HIP-3 DEX markets, spot, and official prediction outcomes share one catalog and exact market identity model.'] },
			{ id: 'execution', title: 'Native execution', body: ['Local wallet-approved agents, venue precision, deterministic client order IDs, native TWAP, schedule-cancel, referral state, fee state, and builder attribution integrate directly with Hyperliquid APIs.'] },
			{ id: 'economics', title: 'Builder economics', body: ['Vice targets a transparent 0.1 bp Hyperliquid builder fee with explicit opt-in. Native venue features that do not support builder metadata remain untagged.'] }
		]
	},
	'hip3-spot': {
		slug: 'hip3-spot',
		group: 'Venues',
		label: 'HIP-3 & spot',
		title: 'One terminal across Hyperliquid product classes',
		description: 'Vice gives spot, core perps, HIP-3 markets, RWAs, and prediction outcomes explicit product identity instead of flattening them into ticker strings.',
		kicker: 'Market coverage',
		sections: [
			{ id: 'identity', title: 'Exact product identity', body: ['Every instrument carries its venue API coin, asset identifier, display symbol, quote, product class, and market key. Account and execution paths never infer routing from presentation text.'] },
			{ id: 'hip3', title: 'HIP-3 markets', body: ['The catalog discovers all supported HIP-3 DEXs and hydrates exact account entities, enabling broad perp coverage without symbol collisions.'] },
			{ id: 'specialized', title: 'Specialized products', body: ['RWA and prediction-market interfaces expose product-specific context and block trading whenever authoritative lot, tick, settlement, or execution terms are incomplete.'] }
		]
	},
	'multi-venue': {
		slug: 'multi-venue',
		group: 'Venues',
		label: 'Multi-venue expansion',
		title: 'A certified path beyond one venue',
		description: 'Vice expands through deliberate adapter families so custody, identity, execution, and recovery remain clear across DEXs and CEXs.',
		kicker: 'Venue roadmap',
		sections: [
			{ id: 'dex', title: 'DEX expansion', body: ['Lighter and Nado follow the wallet-native venue family, reusing non-custodial local authority and shared execution contracts where their official APIs support them.'] },
			{ id: 'cex', title: 'CEX expansion', body: ['BloFin and Binance introduce a distinct encrypted-local API credential model, with explicit permissions and no silent migration into hosted custody.'] },
			{ id: 'certification', title: 'Per-venue certification', body: ['Each adapter must prove product catalog identity, feed behavior, precision, place, modify, cancel, partial fill, reconnect, restart, reconciliation, and attribution before its navigation is enabled.'] },
			{ id: 'unified', title: 'Unified workflows', body: ['Certified venues join shared watchlists, order entry, position management, baskets, market comparison, and cross-venue automation while retaining venue-specific constraints.'] }
		]
	}
};

function guide(
	slug: string,
	group: string,
	label: string,
	description: string,
	steps: string[],
	points: string[],
	media?: [string, string]
): DocTopic;
function guide(
	slug: string,
	group: string,
	label: string,
	title: string,
	description: string,
	steps: string[],
	points: string[],
	media?: [string, string]
): DocTopic;
function guide(
	slug: string,
	group: string,
	label: string,
	titleOrDescription: string,
	descriptionOrSteps: string | string[],
	stepsOrPoints: string[],
	pointsOrMedia?: string[] | [string, string],
	maybeMedia?: [string, string]
): DocTopic {
	const legacyForm = Array.isArray(descriptionOrSteps);
	const title = legacyForm ? label : titleOrDescription;
	const description = legacyForm ? titleOrDescription : descriptionOrSteps;
	const steps = legacyForm ? descriptionOrSteps : stepsOrPoints;
	const points = legacyForm ? stepsOrPoints : pointsOrMedia;
	const media = (legacyForm ? pointsOrMedia : maybeMedia) ?? ['Interface screenshot', 'Short workflow video'];

	return {
		slug,
		group,
		label,
		title,
		description,
		kicker: group,
		mediaSlots: [
			{ kind: 'screenshot', label: media[0], purpose: `Show the ${label.toLowerCase()} interface and annotate its primary controls.` },
			{ kind: 'video', label: media[1], purpose: `Demonstrate the complete ${label.toLowerCase()} workflow from setup through outcome.` }
		],
		sections: [
			{
				id: 'overview',
				title: 'Overview',
				body: [
					description,
					'This specification describes the intended production behavior across desktop and supported mobile surfaces. The same identity, custody, stale-state, and reconciliation rules apply wherever the capability can create or manage an order.'
				]
			},
			{
				id: 'workflow',
				title: 'How to use it',
				body: ['Follow this workflow from left to right. Vice keeps the current account, network, exact market, and feed health visible before any execution-bearing step.'],
				steps
			},
			{
				id: 'behavior',
				title: 'Behavior and safeguards',
				body: ['The interface distinguishes configuration, preview, submission, venue acknowledgement, and authoritative reconciliation. A later stage never inherits consent from an earlier stage.'],
				points: points as string[]
			},
			{
				id: 'visual-guide',
				title: 'Visual guide',
				body: ['This article is prepared for a final interface screenshot and a concise task video. When supplied, media can be attached without changing the navigation, article structure, captions, or accessibility contract.']
			}
		]
	};
}

const supplementalGuides = [
	guide('account-access', 'Welcome', 'Account access', 'Access Vice without a custodial account', 'Vice uses a connected wallet as the primary account identity. Optional profiles add preferences and device metadata without moving trading authority to Vice.', ['Open Vice Terminal', 'Connect the intended wallet', 'Confirm network and account', 'Restore or create local preferences', 'Enable trading separately when needed'], ['Wallet connection is not trading approval', 'Private account state clears on disconnect', 'Profiles cannot sign orders']),
	guide('faq', 'Welcome', 'Frequently asked questions', 'Answers to the most common questions about custody, fees, supported markets, automation, mobile access, and the Vice delivery roadmap.', ['Choose a topic from the page index', 'Review the short answer', 'Open the linked detailed guide', 'Use the safety or venue page for edge cases'], ['Answers distinguish current product behavior from the complete specification', 'Fee and custody answers link to authoritative disclosures', 'Unsupported venue behavior is never implied']),
	guide('legal-disclosures', 'Welcome', 'Legal & risk disclosures', 'A central reference for trading risk, non-custodial responsibility, builder fees, third-party venue terms, data availability, and product-stage disclosures.', ['Review jurisdiction and venue eligibility', 'Review trading and leverage risk', 'Review local custody responsibilities', 'Review fee disclosures', 'Acknowledge required product-stage notices'], ['No promise of profit or execution outcome', 'Third-party venue terms remain controlling', 'Planned capabilities are labeled as product specification']),
	guide('add-hyperliquid', 'Setup', 'Adding Hyperliquid', 'Connect a wallet, select Hyperliquid testnet or mainnet, load public markets, and establish an authoritative account snapshot.', ['Select Hyperliquid from venue setup', 'Choose testnet or mainnet', 'Connect the wallet that owns the account', 'Wait for DATA and ACCOUNT health', 'Create a local agent only when ready to trade'], ['Testnet is the safe default', 'Public and private health are independent', 'Mainnet remains gated by release policy']),
	guide('add-venue-credentials', 'Setup', 'Adding venue credentials', 'Add approved CEX API credentials or DEX wallet authority through a venue-specific setup flow with explicit permissions and local encryption.', ['Choose the venue', 'Review required permissions', 'Create a trade-only key at the venue', 'Paste credentials into the local encrypted vault', 'Run read-only and trading capability checks'], ['Withdrawal permission is rejected', 'Credentials remain encrypted locally', 'Each venue is certified independently'], ['Credential setup screenshots', 'Venue credential setup video']),
	guide('sync-devices', 'Setup', 'Synchronize across devices', 'Move workspace preferences and encrypted configuration between trusted devices without silently copying active trading authority.', ['Export the encrypted Vice profile', 'Choose which preference classes to include', 'Transfer through the approved encrypted channel', 'Import on the destination device', 'Re-authorize trading authority on that device'], ['Trading keys are never synced in plaintext', 'Account identity is verified after import', 'Device-local authority is separately revocable']),
	guide('pwa-guide', 'Setup', 'Progressive Web App guide', 'Install Vice as a desktop or mobile Progressive Web App for an app-like launch, dedicated window, and persistent local preferences.', ['Open Vice in a supported browser', 'Choose Install Vice Terminal', 'Confirm the app name and location', 'Launch from the operating system', 'Reconnect the wallet and verify health'], ['Installation does not bypass browser security', 'Updates preserve local encrypted state', 'Offline mode never presents cached markets as live']),
	guide('stream-deck', 'Setup', 'Stream Deck setup', 'Bind certified Vice actions, panel focus, presets, and CLI aliases to a Stream Deck while preserving the same consent and safety boundaries.', ['Install the Vice action profile', 'Connect the local command bridge', 'Assign non-trading and trading actions', 'Confirm trading actions require the configured consent mode', 'Test on testnet'], ['Input-focused suppression remains active', 'Uncertified actions cannot be bound', 'Every trading action uses the shared execution path']),
	guide('self-hosted-runner', 'Setup', 'Self-hosted runner setup', 'This planned integration is not yet available. Vice does not run a hosted signing or execution service.', ['Use venue-native orders for durable behavior', 'Use device-local strategies only while their runtime is available', 'Do not grant a third party withdrawal access', 'Wait for an audited runner release and testnet certification'], ['No runner is currently shipped', 'Hosted Vice signing remains prohibited', 'Future runner authority must be trade-only and revocable']),

	guide('performance', 'Application elements', 'Performance', 'Understand Vice latency targets, feed-to-state timing, rendering budgets, signed-dispatch measurement, and release evidence.', ['Open the performance panel', 'Select public data, rendering, or execution timing', 'Review current percentiles and health', 'Export evidence for a release gate'], ['Synthetic evidence is rejected', 'Measurements exclude network time when stated', 'Performance never overrides stale-state safety']),
	guide('workspace-modes', 'Application elements', 'Workspace modes', 'Start from Default, Chart Max, or Data Dense, then arrange dockable desktop panels without changing execution identity.', ['Open the workspace selector', 'Choose a named starting layout', 'Dock, resize, or tab supported panels', 'Adjust panel visibility', 'Restore the local layout'], ['The chart remains a shared market surface', 'Execution controls retain exact context', 'Layouts restore without private account data']),
	guide('multi-account', 'Application elements', 'Multi account', 'Operate multiple approved accounts with explicit active-account identity, isolated private state, and clear aggregation boundaries.', ['Add an account profile', 'Authorize its wallet or venue credentials', 'Choose the active execution account', 'Optionally enable read-only aggregation', 'Confirm account before each bulk action'], ['Orders never fan out without explicit basket intent', 'Local vaults are account-scoped', 'Aggregation does not merge signing authority']),
	guide('linked-panels', 'Application elements', 'Link system', 'Color-coded cyan, amber, and violet groups synchronize an exact public market and timeframe across read-only snapshots. Charts, books, tickets, DOMs, accounts, crosshairs, and execution remain unlinked.', ['Open and set a public link from a workspace tab', 'Open a linked read-only snapshot', 'Use Set link to return the group to that snapshot', 'Explicitly choose a linked market for the shared workspace when needed'], ['Links persist only public market/timeframe context', 'Execution keeps the single exact selected-market identity', 'Linked execution and account contexts are not shipped', 'Unsupported products remain fail-closed']),
	guide('desktop-mode', 'Application elements', 'Desktop mode', 'Use a dockable desktop workspace optimized for long trading sessions, keyboard control, and dense account visibility.', ['Launch the desktop workspace', 'Choose a layout preset', 'Dock or resize panels', 'Configure hotkeys and privacy', 'Restore local preferences'], ['All major controls are keyboard reachable', 'Density never hides health state', 'Preferences remain device-local']),
	guide('header-controls', 'Application elements', 'Header controls', 'Use the header to manage venue, network, account, workspace, panels, hotkeys, privacy, sound, CLI, data health, and connection state.', ['Confirm venue and network', 'Confirm the active account', 'Choose the workspace preset', 'Review DATA and ACCOUNT health', 'Open connection or recovery controls'], ['Trading context remains visible', 'Health is split by responsibility', 'Sensitive values respect privacy mode']),
	guide('tradingview-chart', 'Application elements', 'TradingView chart', 'Use a familiar TradingView-style analytical chart alongside Vice execution and account overlays.', ['Select the TradingView chart mode', 'Choose market and timeframe', 'Add supported indicators', 'Enable Vice account overlays', 'Use the ticket or armed chart flow to trade'], ['Chart zoom is preserved', 'Overlays require authoritative private state', 'Indicator state cannot route orders']),
	guide('orderbook', 'Application elements', 'Orderbook', 'Read bid and ask liquidity, spread, grouping, depth, update state, and working-order context for the selected market.', ['Choose the market', 'Select grouping precision', 'Review spread and depth', 'Filter or inspect liquidity analytics', 'Use armed book actions when enabled'], ['Malformed or crossed books are rejected', 'Grouping identity is explicit', 'Stale books are not actionable']),
	guide('trades-liquidations', 'Application elements', 'Trades + liquidations', 'Read the live trade tape, size filters, direction, aggregation, and authoritative liquidation context where the venue supplies it.', ['Select the market', 'Choose minimum trade size', 'Toggle available event types', 'Inspect price, size, side, and time', 'Open the corresponding chart level'], ['Unavailable liquidation data is labeled', 'Trade payloads are privacy-filtered', 'Stale tapes stop alert evaluation']),
	guide('instruments', 'Application elements', 'Tickers / instruments', 'Discover markets across product classes, DEX namespaces, quotes, venues, watchlists, and saved filters.', ['Search by symbol, token, venue, or DEX', 'Filter product class', 'Sort by price, change, volume, or open interest', 'Save a watchlist', 'Select the exact instrument'], ['Display labels never determine routing', 'Unsupported products are visibly blocked', 'Catalog health is separate from price health']),
	guide('activity', 'Application elements', 'Activity', 'Review a unified timeline of order, fill, strategy, trigger, reconciliation, and risk-control events.', ['Open Activity', 'Filter by event family', 'Filter by account or market', 'Expand an event for identity and outcome', 'Jump to the related order or strategy'], ['Sensitive parameters can be masked', 'Uncertain events remain unresolved until reconciled', 'Local and venue timestamps are distinguished']),
	guide('orders', 'Application elements', 'Orders', 'Inspect, filter, modify, and cancel working orders across direct, conditional, strategy-child, and venue-native lifecycles.', ['Open Orders', 'Filter by market, side, or type', 'Select an order', 'Modify or cancel through the shared control', 'Confirm removal from the authoritative snapshot'], ['Cancellation success requires authoritative omission', 'Child orders retain parent strategy identity', 'Unknown products cannot be modified']),
	guide('pnl-cards', 'Application elements', 'PnL cards', 'Create shareable visual summaries of realized and unrealized performance while protecting wallet and position privacy.', ['Choose account and time range', 'Choose realized, unrealized, or combined view', 'Apply privacy options', 'Preview the card', 'Export the image'], ['Cards are display artifacts only', 'Venue values remain the source of truth', 'Private identifiers are hidden by default']),
	guide('aggregated-tape', 'Application elements', 'Aggregated tape', 'Combine certified venue trades into one normalized, filterable tape without obscuring source venue or timestamp.', ['Choose the instrument mapping', 'Select venues', 'Set size and event filters', 'Review normalized flow', 'Open source-venue context when needed'], ['Every print retains venue identity', 'Timestamp quality is disclosed', 'Unmapped products stay separate']),
	guide('balances', 'Application elements', 'Balances', 'Review collateral, spot balances, withdrawable value, margin use, and account health across supported venues.', ['Open Balances', 'Choose account or aggregated view', 'Inspect collateral and margin', 'Filter zero balances', 'Open the venue account for details'], ['No simulated balances in production', 'Aggregation preserves venue source', 'Privacy mode masks values globally']),
	guide('workspace-layouts', 'Application elements', 'Layouts', 'Save and restore versioned local Dockview arrangements for the supported named layouts and panel visibility.', ['Arrange supported panels', 'Choose Default, Chart Max, or Data Dense', 'Adjust supported panel visibility', 'Allow the local layout save', 'Restore on the intended device'], ['Layouts never contain live private snapshots', 'Malformed layouts fall back safely', 'Execution context must be reconfirmed']),
	guide('basket-trading', 'Application elements', 'Basket trading', 'Build and execute multi-leg baskets with explicit per-leg venue, account, side, size, and outcome.', ['Create a basket', 'Add and weight each leg', 'Choose execution mode', 'Review per-leg risk and fees', 'Submit and monitor authoritative outcomes'], ['Partial acceptance is never reported as complete', 'Each leg uses exact market identity', 'Emergency controls operate per leg']),
	guide('market-panel', 'Application elements', 'Market', 'Inspect a focused market profile containing contract terms, product class, venue, price statistics, funding, open interest, and available actions.', ['Select a market', 'Review identity and contract terms', 'Inspect live statistics', 'Open chart, DOM, or ticket', 'Save to a watchlist'], ['Incomplete execution terms block trading', 'Statistics carry feed-health state', 'Product class is explicit']),
	guide('news', 'Application elements', 'News', 'Follow market-relevant headlines, venue announcements, listings, economic events, and saved topic filters inside the workspace.', ['Choose news providers', 'Select markets or topics', 'Set priority filters', 'Open a headline in context', 'Create an alert when supported'], ['Provider availability is disclosed', 'News never triggers an order without a configured rule', 'Simulated headlines are excluded from production']),

	guide('size-slider', 'Execution panel', 'Size input / slider', 'Enter order size in base, quote, percentage, or risk terms and move quickly among locally configured presets.', ['Choose the size unit', 'Type an amount or use the slider', 'Review available balance and margin', 'Check estimated notional', 'Continue to order review'], ['Venue precision is applied before signing', 'Risk caps use formatted values', 'Privacy mode masks displayed size']),
	guide('reduce-only', 'Execution panel', 'Reduce-only switch', 'Guarantee that an eligible order can reduce or close a position but cannot increase exposure or flip direction.', ['Choose an order type', 'Enable Reduce only', 'Confirm the selected position side', 'Enter size and price logic', 'Submit and review venue acknowledgement'], ['Orders larger than the position follow venue semantics', 'Unsupported combinations are blocked', 'Quick-close paths enable it automatically']),
	guide('tp-sl', 'Execution panel', 'TP / SL switch', 'Attach take-profit and stop-loss protection to an entry with explicit trigger, order, size, and persistence behavior.', ['Enable TP / SL', 'Set take-profit trigger and order behavior', 'Set stop-loss trigger and order behavior', 'Review reduce-only sizing', 'Submit the bracket'], ['Partial child acceptance becomes uncertain', 'Protection never silently exceeds position size', 'Trigger data must be live']),
	guide('buy-sell', 'Execution panel', 'Buy / sell controls', 'Submit the fully reviewed ticket as a buy or sell while preserving side clarity across order types and product classes.', ['Review market and account', 'Review order type and size', 'Review price, trigger, and flags', 'Select Buy or Sell', 'Read the immediate and reconciled outcome'], ['Side color is not the only signal', 'Keyboard actions respect focus suppression', 'Submission allocates one command identity']),
	guide('margin-leverage', 'Execution panel', 'Margin / leverage control', 'Inspect or change supported leverage and margin mode with clear liquidation and collateral implications.', ['Select the perp market', 'Review current leverage and margin mode', 'Choose the new setting', 'Review liquidation impact', 'Confirm through the appropriate authority'], ['Spot markets hide leverage controls', 'Account mismatch blocks changes', 'Venue limits remain authoritative']),

	guide('limit-order', 'Limit & advanced', 'Limit', 'Place an order at a chosen price with optional post-only, reduce-only, time-in-force, and attached protection.', ['Choose Limit', 'Enter price and size', 'Choose post-only, IOC, or standard behavior', 'Review optional TP / SL', 'Submit'], ['Post-only and IOC are mutually exclusive', 'Price and size use venue precision', 'Uncertain outcomes reconcile by client order ID']),
	guide('stop-limit', 'Limit & advanced', 'Stop limit', 'Create a trigger that submits a limit order at a separately defined execution price.', ['Choose Stop Limit', 'Choose trigger direction', 'Enter trigger price', 'Enter limit price and size', 'Review and submit'], ['Trigger and limit fields remain distinct', 'Modifications preserve trigger semantics', 'Stale trigger inputs block local evaluation']),
	guide('click-placement', 'Limit & advanced', 'Click placement', 'Use chart or DOM clicks to fill ticket prices or create a reviewed order draft at the selected level.', ['Arm click placement', 'Choose the target field or order mode', 'Click the chart or DOM price', 'Review the populated draft', 'Confirm submission'], ['Unarmed clicks remain analytical', 'A click does not inherit old consent', 'Exact selected-market identity is retained']),
	guide('chase', 'Limit & advanced', 'Chase', 'Maintain a maker or near-touch order as the market moves while bounding reprices, slippage, duration, and cancellation.', ['Choose Chase', 'Set side, size, and price reference', 'Set reprice distance and limits', 'Choose completion or timeout behavior', 'Start and monitor the strategy'], ['Only one tick runs per job', 'Lost acknowledgements pause for reconciliation', 'Dead-man protection can cancel exposed children']),
	guide('scale', 'Limit & advanced', 'Scale', 'Distribute an order across 2–100 price levels with configurable range, size distribution, skew, and atomic submission rules.', ['Choose Scale', 'Set start and end prices', 'Choose level count', 'Choose distribution and total size', 'Preview and submit'], ['Every child has deterministic identity', 'Partial batch acceptance is uncertain', 'Reduce-only Scale respects position size']),
	guide('scale-side', 'Limit & advanced', 'Scale side', 'Build a scale whose range and side adapt around the market or position while retaining explicit boundary prices.', ['Choose Scale Side', 'Select entry or reduce-only use', 'Set near and far offsets', 'Choose levels and distribution', 'Preview then start'], ['The terminal never invents a close range', 'Side and position intent are explicit', 'Range changes create a new reviewed draft']),

	guide('market-order', 'Market', 'Market', 'Execute immediately against available liquidity with an explicit size, side, slippage expectation, and risk cap.', ['Choose Market', 'Enter size', 'Review spread and estimated notional', 'Choose Buy or Sell', 'Submit and reconcile fills'], ['Live book and account state are required', 'Maximum notional is checked locally', 'Venue fill price is authoritative']),
	guide('stop-market', 'Market', 'Stop market order', 'Create a stop trigger that submits a market order when the configured price condition is met.', ['Choose Stop', 'Choose trigger direction', 'Enter trigger and size', 'Choose reduce-only when protecting a position', 'Submit'], ['Venue-native triggers are preferred', 'Trigger source is disclosed', 'Local triggers pause on stale inputs']),
	guide('swarm', 'Market', 'Swarm', 'Break a larger intent into a rapid, controlled sequence of smaller child orders with bounded concurrency and participation.', ['Choose Swarm', 'Set total size and child range', 'Choose cadence and concurrency', 'Set slippage and stop conditions', 'Start and monitor'], ['Child ticks are serialized per job', 'Partial outcomes remain visible', 'Emergency stop cancels known open children']),
	guide('twap', 'Market', 'TWAP', 'Execute a target size across a selected duration using venue-native TWAP when available or a certified local adaptive strategy.', ['Choose TWAP', 'Set total size and duration', 'Choose native or adaptive mode', 'Review reduce-only and persistence class', 'Start and monitor'], ['Native TWAP survives the browser', 'Local TWAP reconciles before resume', 'Builder attribution follows venue support']),

	guide('automation-setup', 'Automation', 'Setup', 'Prepare local authority and dead-man policy before starting a certified device-local strategy. User-run headless execution is not yet available.', ['Enable local trading authority', 'Choose venue-native or device-local runtime', 'Choose dead-man protection', 'Run a testnet dry run', 'Confirm the certification state'], ['Runtime class is shown before submission', 'Hosted Vice signing remains prohibited', 'Stale inputs pause evaluation']),
	guide('self-hosted-execution', 'Automation', 'Self-hosted execution', 'This planned feature has no shipped runner or hosted executor. Do not treat device-local jobs as headless automation.', ['Use venue-native orders where available', 'Keep device-local runtime available for certified jobs', 'Use dead-man protection', 'Wait for audited runner and testnet evidence'], ['No divergent execution engine', 'No hosted Vice signing', 'Future authority must be trade-only and revocable']),
	guide('automation-twap', 'Automation', 'TWAP execution', 'Schedule time-weighted execution as a durable venue-native action or a richer local strategy with visible child progress.', ['Choose total size and duration', 'Choose native or adaptive mode', 'Set participation and price limits when available', 'Select runtime and dead-man policy', 'Start and monitor'], ['Runtime persistence is explicit', 'Restart reconciliation precedes the next child', 'Cancel outcomes are authoritative']),
	guide('conditional-orders', 'Automation', 'Conditional orders', 'Price-cross, completed candle close/volume, future local time, and exact synthetic pairs can power the uncertified conditional ladder.', ['Use exact source identities', 'Keep every source live', 'Choose a future local time when scheduling', 'Treat a missed crossing as non-executable'], ['Triggers never evaluate from stale inputs', 'Missed events are reported', 'Resulting orders remain certification-gated']),
	guide('trigger-types', 'Automation', 'Trigger types', 'The uncertified conditional ladder supports price-cross, completed candle close/volume, future local time, and ratio/spread pairs with a distinct exact reference market.', ['Use exact market identities', 'Keep both pair legs live', 'Use a future local time', 'Treat a missed crossing as non-executable'], ['Source health is visible', 'Crossings are edge-aware', 'Synthetic pairs preserve both market identities']),
	guide('automation-history', 'Automation', 'Activity and order history', 'Audit strategy creation, trigger evaluation, child orders, pauses, restarts, cancellations, and reconciled outcomes.', ['Open Automation Activity', 'Filter by runtime, strategy, or outcome', 'Expand a lifecycle event', 'Inspect related child orders', 'Export a privacy-safe report'], ['History distinguishes local and venue facts', 'Uncertain events remain prominent', 'Sensitive strategy values may be masked']),

	guide('cli-constants', 'Terminal CLI', 'Constant values', 'Use built-in values for current market, account, quote, side, balance, position, bid, ask, mark, and time in CLI commands.', ['Open the CLI reference', 'Choose a built-in constant', 'Insert it into a command', 'Preview the resolved command', 'Run it through the shared executor'], ['Constants resolve at execution time', 'Private constants require live account state', 'Stale values fail closed']),
	guide('cli-variables', 'Terminal CLI', 'User-defined variables', 'Store bounded local values such as size, risk, entry offset, duration, and favorite market for reusable commands.', ['Define a variable name', 'Assign a bounded value', 'Reference it with $name', 'Preview expansion', 'Save locally'], ['Secrets are rejected', 'Expansion has length limits', 'Variables cannot bypass parsing']),
	guide('cli-general', 'Terminal CLI', 'General commands', 'Navigate markets, inspect account state, focus panels, manage preferences, and request help without leaving the CLI.', ['Open CLI', 'Type help or a command family', 'Use autocomplete', 'Review parsed intent', 'Execute'], ['Read-only and trading commands are visually distinct', 'Unknown commands do nothing', 'Account data follows privacy mode']),
	guide('cli-chaining', 'Terminal CLI', 'Chaining', 'Run semicolon-separated commands in sequence with a visible result for each attempted step.', ['Write the first command', 'Add a semicolon', 'Add subsequent commands', 'Preview the sequence', 'Run and inspect step results'], ['Execution stops at the first failure', 'Each trading step gets its own command identity', 'Later steps never run after uncertainty']),
	guide('cli-repeat', 'Terminal CLI', 'Repeat', 'Repeat an eligible command a bounded number of times or on a supported schedule without duplicating ambiguous mutations.', ['Choose an eligible command', 'Set repeat count or schedule', 'Set interval and stop conditions', 'Review expanded behavior', 'Start'], ['Counts and intervals are bounded', 'Uncertain child outcomes pause repeats', 'Repeated trading requires explicit confirmation']),
	guide('cli-shortcuts', 'Terminal CLI', 'Shortcut / hotkeys', 'Bind a validated CLI alias or command to a programmable hotkey or supported hardware key.', ['Create and test the alias', 'Open Hotkeys', 'Choose an unassigned binding', 'Select the alias', 'Test on testnet'], ['Typing targets suppress global keys', 'Conflicts are rejected', 'Trading actions retain consent rules']),
	guide('cli-aliases', 'Terminal CLI', 'Alias', 'Create readable local names for longer Vice commands and strategy templates.', ['Enter alias add', 'Choose a valid alias name', 'Enter the command template', 'Preview variable expansion', 'Save and test'], ['Recursive aliases are rejected', 'Aliases have bounded length', 'Certification is checked after expansion']),
	guide('cli-ui-control', 'Terminal CLI', 'UI control', 'Switch markets, choose layouts, toggle panels, focus surfaces, arm placement, and manage privacy or sound through commands.', ['Open CLI', 'Choose a UI command', 'Use autocomplete for valid targets', 'Execute', 'Confirm the visible state change'], ['UI commands cannot forge execution context', 'Trading placement remains separately armed', 'Unsupported panels are rejected']),
	guide('cli-simple-orders', 'Terminal CLI', 'Simple ordering', 'Place direct market or limit orders with concise, readable commands.', ['Enter side and size', 'Choose market or limit', 'Enter price when required', 'Add supported flags', 'Preview and submit'], ['Exact market resolution is mandatory', 'Size and price use venue precision', 'Submission uses the local signer']),
	guide('cli-stops', 'Terminal CLI', 'Stops', 'Create stop-market and stop-limit orders from explicit trigger and execution parameters.', ['Choose stop or stop-limit', 'Enter side, size, and trigger', 'Add limit price when required', 'Choose reduce-only', 'Preview and submit'], ['Trigger direction is explicit', 'Trigger and limit fields remain distinct', 'Stale local triggers pause']),
	guide('cli-orders-with-stops', 'Terminal CLI', 'Ordering with stops', 'Place an entry with attached take-profit and stop-loss protection in one reviewed CLI intent.', ['Enter the entry order', 'Add TP parameters', 'Add SL parameters', 'Preview child relationships and size', 'Submit the bracket'], ['Partial batch acceptance becomes uncertain', 'Protection is reduce-only', 'Every child retains parent identity']),
	guide('cli-cancel', 'Terminal CLI', 'Cancel orders', 'Cancel one order, one market, one side, one strategy, or all known orders through exact identity filters.', ['Choose cancel scope', 'Resolve account and market filters', 'Preview matched orders', 'Confirm bulk scope', 'Run and reconcile'], ['Only known authoritative orders are targeted', 'Bulk outcomes are reported per order', 'Success requires refreshed omission']),
	guide('cli-close', 'Terminal CLI', 'Close position', 'Close a position at market, quote, Scale, or TWAP using an exact reduce-only intent.', ['Choose the position market', 'Choose close mode', 'Set size or all', 'Review reduce-only behavior', 'Submit and reconcile'], ['Position identity must be complete', 'Scale and TWAP require their certification', 'Close success requires authoritative state']),
	guide('cli-reverse', 'Terminal CLI', 'Reverse position', 'Close the current position and open the same size in the opposite direction through a guarded two-leg workflow.', ['Choose the exact position', 'Enter reverse', 'Review both legs', 'Confirm', 'Monitor flat snapshot then open leg'], ['The open leg waits for exact flat state', 'No silent retry after second-leg rejection', 'Partial state remains visible']),
	guide('cli-scale', 'Terminal CLI', 'Scale orders', 'Create a multi-level Scale strategy from range, levels, size, distribution, and side parameters.', ['Enter scale side and total size', 'Set start and end', 'Set levels and distribution', 'Preview children', 'Start'], ['Level count is bounded', 'Every child is deterministic', 'Partial acceptance blocks progression']),
	guide('cli-chase', 'Terminal CLI', 'Chase orders', 'Start a Chase strategy using side, size, reference, reprice limits, timeout, and completion behavior.', ['Enter chase side and size', 'Choose price reference', 'Set reprice and timeout limits', 'Preview', 'Start and monitor'], ['One in-flight tick per job', 'Reprice count is bounded', 'Dead-man protection is available']),
	guide('cli-swarm', 'Terminal CLI', 'Swarm order', 'Start a Swarm strategy with total size, child-size range, cadence, concurrency, and slippage limits.', ['Enter total size and side', 'Set child range', 'Set cadence and concurrency', 'Set stop conditions', 'Start'], ['Concurrency is bounded', 'Uncertain children pause the swarm', 'Emergency stop cancels known children']),
	guide('cli-twap', 'Terminal CLI', 'TWAP order', 'Start a native or adaptive TWAP with total size, duration, interval policy, and reduce-only behavior.', ['Enter side and total size', 'Set duration', 'Choose native or adaptive mode', 'Preview persistence class', 'Start'], ['Native TWAP follows venue lifecycle', 'Local TWAP reconciles on restart', 'Fee attribution is mode-aware']),
	guide('cli-twap-chase', 'Terminal CLI', 'TWAP chase order', 'Combine scheduled slices with maker-aware Chase behavior to pursue completion without uncontrolled crossing.', ['Enter total size and duration', 'Choose slice policy', 'Set chase distance and timeout', 'Set slippage ceiling', 'Start and monitor'], ['Each slice owns deterministic children', 'Timeout behavior is explicit', 'Uncertain slices pause the parent'])
] as const;

const supplementalTopics = Object.fromEntries(supplementalGuides.map((topic) => [topic.slug, topic])) as Record<string, DocTopic>;

export const topics: Record<string, DocTopic> = {
	...coreTopics,
	...supplementalTopics,
	faq: {
		slug: 'faq',
		group: 'Welcome',
		label: 'Frequently asked questions',
		title: 'Frequently asked questions',
		description: 'Straight answers about custody, access, fees, supported markets, automation, persistence, performance, and the Vice roadmap.',
		kicker: 'Help center',
		mediaSlots: [{ kind: 'video', label: 'Vice in five minutes', purpose: 'Give a concise narrated overview of the terminal, custody model, and primary workflow.' }],
		sections: [
			{ id: 'custody', title: 'Does Vice hold my funds or keys?', body: ['No. Funds remain at the connected venue. On Hyperliquid, the master wallet approves a device-local agent that signs in the browser. Vice-hosted services do not hold that signing key.'] },
			{ id: 'account', title: 'Do I need to create a Vice account?', body: ['A connected wallet is the primary account identity. Optional profiles can synchronize preferences and approved metadata, but trading authority remains separate and device-scoped.'] },
			{ id: 'fees', title: 'What does Vice cost?', body: ['The product specification targets transparent subscription and venue-attribution economics. Hyperliquid builder attribution is designed around an explicit 0.1 bp opt-in and is shown before trading authority is enabled.'] },
			{ id: 'markets', title: 'Which markets will Vice support?', body: ['The launch focus is Hyperliquid core perps, HIP-3 markets, spot, RWAs, and prediction outcomes. The certified expansion path adds Lighter, Nado, BloFin, and Binance.'] },
			{ id: 'automation', title: 'Do strategies keep running when I close the tab?', body: ['Venue-native orders survive independently. Device-local strategies restore and reconcile when Vice reopens. The planned self-hosted runner is not available, and Vice does not host signing.'] },
			{ id: 'status', title: 'Is every documented feature available today?', body: ['These docs describe the complete product specification for the pitch and delivery roadmap. Production releases expose capabilities only after their code, safety boundaries, venue lifecycle, and release evidence are ready.'] }
		]
	},
	'legal-disclosures': {
		slug: 'legal-disclosures',
		group: 'Welcome',
		label: 'Legal & risk disclosures',
		title: 'Legal, venue, and trading-risk disclosures',
		description: 'The operating assumptions and responsibilities that apply when using Vice with leveraged and spot crypto markets.',
		kicker: 'Disclosures',
		sections: [
			{ id: 'trading-risk', title: 'Trading and leverage risk', body: ['Crypto markets are volatile. Leverage can amplify losses, liquidation can occur rapidly, and an order type or automated strategy cannot guarantee an execution price or profitable outcome.'] },
			{ id: 'non-custodial', title: 'Non-custodial responsibility', body: ['The trader controls wallet access, local agents, API credentials, device security, backups, revocation, and strategy configuration. Vice cannot recover a wallet secret or reverse a venue transaction.'] },
			{ id: 'venues', title: 'Third-party venues', body: ['Availability, eligibility, product terms, maintenance, data quality, fees, and execution ultimately depend on each connected venue and its controlling terms.'] },
			{ id: 'data', title: 'Market data', body: ['Feeds may disconnect, arrive late, omit events, or differ across providers. Vice labels feed health and blocks unsafe local actions, but cannot guarantee uninterrupted third-party data.'] },
			{ id: 'product-stage', title: 'Product-stage disclosure', body: ['The showcase documents the complete intended product. Individual capabilities remain subject to implementation, certification, venue support, security review, and jurisdictional availability before production release.'] }
		]
	}
};

for (const group of docGroups) {
	for (const [slug] of group.items) {
		if (slug !== 'overview' && topics[slug]) topics[slug].group = group.label;
	}
}

const visualAssignments: Record<string, NonNullable<DocTopic['visual']>> = {
	'connect-wallet': { src: '/docs/setup/connect-wallet.png', alt: 'Vice Terminal wallet connection walkthrough with wallet provider, network, account identity, and health preview', caption: 'Choose a wallet and verify the network, exact account, requested read-only authority, and private account health before continuing.' },
	'enable-trading': { src: '/docs/setup/enable-trading.png', alt: 'Vice Terminal device-local trading agent approval walkthrough with custody and fee summary', caption: 'The trading-agent review keeps master-wallet identity, device-local authority, builder fee, network scope, and prohibited withdrawal access visible together.' },
	'add-hyperliquid': { src: '/docs/setup/add-hyperliquid.png', alt: 'Vice Terminal Hyperliquid venue setup walkthrough with network, account, and independent health checks', caption: 'Hyperliquid setup verifies the selected environment, connected account, public feeds, private snapshot, and agent state independently.' },
	'add-venue-credentials': { src: '/docs/setup/add-venue-credentials.png', alt: 'Vice Terminal trade-only venue credential walkthrough with encrypted fields, permission scope, and capability checks', caption: 'Venue credentials are encrypted locally after Vice accepts read and trade scope, rejects transfer authority, and verifies account capabilities.' },
	'sync-devices': { src: '/docs/setup/sync-devices.png', alt: 'Vice Terminal encrypted profile transfer walkthrough between a current and destination device', caption: 'Profile transfer includes selected preferences and account identity while excluding the trading key and requiring authority to be re-established on the destination.' },
	'pwa-guide': { src: '/docs/setup/pwa-guide.png', alt: 'Vice Terminal Progressive Web App installation and first-launch walkthrough', caption: 'The PWA flow verifies the application origin, restores local preferences, and keeps account and order actions blocked until the wallet reconnects.' },
	'stream-deck': { src: '/docs/setup/stream-deck.png', alt: 'Vice Terminal Stream Deck setup walkthrough with certified actions and local consent policy', caption: 'A Stream Deck profile distinguishes navigation and trading actions while the local bridge preserves focus suppression, consent, and testnet validation.' },
	'self-hosted-runner': { src: '/docs/setup/self-hosted-runner.png', alt: 'Vice Terminal self-hosted runner pairing walkthrough with encrypted agent, journal recovery, and kill-switch readiness', caption: 'Runner pairing verifies the user-operated environment, dedicated encrypted agent, recovery journal, and reachable kill switch before approval.' },
	'workspace-modes': { src: '/docs/vice-workspace-overview.png', alt: 'Vice Terminal full desktop workspace', caption: 'The complete workspace keeps scanning, analysis, execution, and account management in one operational view.' },
	'desktop-mode': { src: '/docs/vice-workspace-overview.png', alt: 'Vice Terminal desktop mode', caption: 'Desktop mode uses the available width for synchronized market, execution, and account panels.' },
	'header-controls': { src: '/docs/vice-workspace-overview.png', alt: 'Vice Terminal header and workspace controls', caption: 'The header exposes workspace, privacy, sound, command line, connection health, and account controls.' },
	'workspace-layouts': { src: '/docs/vice-workspace-overview.png', alt: 'Vice Terminal multi-panel layout', caption: 'A dense default layout keeps the most important trading context visible without page changes.' },
	'layouts-hotkeys': { src: '/docs/vice-workspace-overview.png', alt: 'Vice Terminal operator workspace', caption: 'Layouts and keyboard controls operate the same synchronized workspace.' },
	'tradingview-chart': { src: '/docs/vice-chart-trading.png', alt: 'Vice Terminal candlestick chart with volume', caption: 'Candles, volume, market state, and working price context share one chart surface.' },
	'click-placement': { src: '/docs/vice-chart-trading.png', alt: 'Vice Terminal chart prepared for click placement', caption: 'Click placement converts a selected chart level into a reviewable order draft.' },
	'orderbook': { src: '/docs/vice-market-depth.png', alt: 'Vice Terminal order book and market trades', caption: 'Grouped depth, spread, quick sizing, and the live tape stay aligned to one exact market.' },
	'trades-liquidations': { src: '/docs/vice-market-depth.png', alt: 'Vice Terminal market trades beside the order book', caption: 'Recent trades appear directly beneath depth with explicit feed limitations and filters.' },
	'dom-ladder': { src: '/docs/vice-market-depth.png', alt: 'Vice Terminal depth-of-market controls', caption: 'The market-depth surface joins grouped liquidity, quick sizing, and direct position controls.' },
	'aggregated-tape': { src: '/docs/vice-market-depth.png', alt: 'Vice Terminal aggregated trade tape', caption: 'The live tape provides side-aware price, size, and time context beside the order book.' },
	'market-data': { src: '/docs/vice-market-depth.png', alt: 'Vice Terminal live market data surfaces', caption: 'Order book and trades illustrate the synchronized public-data plane used throughout Vice.' },
	'size-slider': { src: '/docs/stories/size-slider.jpg', alt: 'Vice Terminal size input workflow with base and quote units, percentage presets, balance, notional, and margin', caption: 'The sizing story shows the selected unit, percentage preset, available collateral, notional, required margin, and local risk result together.' },
	'reduce-only': { src: '/docs/stories/reduce-only.jpg', alt: 'Vice Terminal reduce-only close workflow with current and resulting position size', caption: 'Reduce-only is shown in the context a trader needs: current exposure, close size, resulting position, and explicit flip protection.' },
	'tp-sl': { src: '/docs/stories/tp-sl.jpg', alt: 'Vice Terminal bracket order product specification with take-profit and stop-loss children', caption: 'Product specification: entry, take-profit, stop-loss, protected size, persistence, and reward-to-risk are reviewed as one bracket.' },
	'buy-sell': { src: '/docs/stories/buy-sell.jpg', alt: 'Vice Terminal final buy order review with identity, price, size, fees, and resulting position', caption: 'The final side action resolves into a complete review of account, market, intent, fee, expiry, and resulting exposure.' },
	'margin-leverage': { src: '/docs/stories/margin-leverage.jpg', alt: 'Vice Terminal leverage change preview with collateral and liquidation impact', caption: 'Leverage selection is explained through its practical impact on required margin, available collateral, and estimated liquidation price.' },
	'limit-order': { src: '/docs/stories/limit-order.jpg', alt: 'Vice Terminal limit order ticket with amount, price, time in force, and maker behavior', caption: 'A resting limit order exposes price, size, POST/GTC behavior, expected notional, fee tier, and venue-native persistence.' },
	'stop-limit': { src: '/docs/stories/stop-limit.jpg', alt: 'Vice Terminal stop-limit ticket with separate trigger and execution prices', caption: 'The stop-limit story keeps trigger source, trigger price, limit price, size, and reduce-only behavior visually distinct.' },
	'market-order': { src: '/docs/stories/market-order.jpg', alt: 'Vice Terminal market order ticket with spread, estimated fill, and slippage cap', caption: 'Immediate execution is shown with top-of-book liquidity, estimated fill, explicit slippage ceiling, and notional impact.' },
	'stop-market': { src: '/docs/stories/stop-market.jpg', alt: 'Vice Terminal stop-market close with trigger source and reduce-only result', caption: 'The stop-market story makes the trigger source, protected position, resulting market behavior, and price-risk limitation explicit.' },
	'scale': { src: '/docs/stories/scale.jpg', alt: 'Vice Terminal Scale product specification with range, levels, distribution, and child-order preview', caption: 'Product specification: the trader reviews the complete range, eight deterministic children, distribution, total size, and batch behavior.' },
	'chase': { src: '/docs/stories/chase.jpg', alt: 'Vice Terminal Chase product specification with reference, reprice bounds, timeout, and slippage', caption: 'Product specification: Chase shows the live reference, tick offset, reprice ceiling, timeout, crossing rule, and remainder behavior.' },
	'swarm': { src: '/docs/stories/swarm.jpg', alt: 'Vice Terminal Swarm product specification with child-size range, cadence, concurrency, and slippage ceiling', caption: 'Product specification: Swarm is documented as an operator workflow with total intent, child range, cadence, concurrency, slippage, runtime, and emergency control.' },
	'twap': { src: '/docs/stories/twap.jpg', alt: 'Vice Terminal TWAP product specification with target size, duration, mode, participation, and persistence', caption: 'Product specification: TWAP keeps total size, duration, target slices, execution mode, participation cap, persistence, and remainder policy visible.' },
	'advanced-orders': { src: '/docs/stories/advanced-orders.jpg', alt: 'Vice Terminal advanced order library product specification', caption: 'Product specification: the strategy library separates certified and planned execution modes while keeping them on the shared risk and recovery path.' },
	'position-controls': { src: '/docs/vice-account-command-center.png', alt: 'Vice Terminal positions command center', caption: 'Positions, PnL, leverage, liquidation context, and close controls share one account surface.' },
	'activity': { src: '/docs/vice-account-command-center.png', alt: 'Vice Terminal account activity area', caption: 'Account tabs organize positions, algorithms, orders, TWAP activity, and trade history.' },
	'orders': { src: '/docs/vice-account-command-center.png', alt: 'Vice Terminal open-order and position tabs', caption: 'Open orders sit beside live positions and execution history in the account command center.' },
	'pnl-cards': { src: '/docs/vice-account-command-center.png', alt: 'Vice Terminal position PnL display', caption: 'Per-position and net PnL stay visible beside the controls used to manage risk.' },
	'balances': { src: '/docs/vice-account-command-center.png', alt: 'Vice Terminal account command center', caption: 'Account value and deployable balance feed the sizing and risk surfaces across the terminal.' },
	'automation-history': { src: '/docs/vice-account-command-center.png', alt: 'Vice Terminal account and strategy activity tabs', caption: 'Automation lifecycle and resulting orders remain connected to the authoritative account surface.' },
	'mobile-companion': { src: '/docs/vice-mobile-trade.png', alt: 'Vice Terminal mobile trading workspace', caption: 'The mobile workspace prioritizes chart context, depth, quick sizing, and guarded buy or sell actions.' },
	'terminal-cli': { src: '/docs/vice-cli.png', alt: 'Vice Terminal command line open beneath the workspace', caption: 'The command line opens inside the terminal with help, autocomplete, history, chaining, and shared execution context.' },
	'cli-general': { src: '/docs/stories/cli-general.jpg', alt: 'Vice Terminal CLI help and general command families', caption: 'General commands are shown as a discoverable help surface followed by an authoritative health inspection.' },
	'cli-chaining': { src: '/docs/stories/cli-chaining.jpg', alt: 'Vice Terminal chained CLI commands with per-step results and consent pause', caption: 'A chained workflow reports market and size setup independently, then pauses for explicit order consent before submission.' },
	'cli-simple-orders': { src: '/docs/stories/cli-simple-orders.jpg', alt: 'Vice Terminal CLI simple order with complete review and confirmation result', caption: 'Concise order syntax expands into a complete review of account, market, side, size, price, flags, notional, and persistence.' }
};

for (const [slug, visual] of Object.entries(visualAssignments)) {
	if (topics[slug]) topics[slug].visual = visual;
}

type ApplicationElementDetail = {
	visual: NonNullable<DocTopic['visual']>;
	location: string;
	anatomy: string[];
	practical: string;
	steps?: string[];
};

const applicationElementDetails: Record<string, ApplicationElementDetail> = {
	'interface-overview': {
		visual: { src: '/docs/elements/ui-overview.png', alt: 'Vice Terminal complete desktop interface', caption: 'The default workspace places discovery, analysis, execution, and account control in one synchronized operating surface.' },
		location: 'This is the default desktop workspace shown after market data and account state connect.',
		anatomy: ['Header and system-health rail', 'Market and instrument browser', 'Interactive chart workspace', 'Orderbook and live tape', 'Order-entry ticket', 'Account command center'],
		practical: 'Scan from left to right: choose an exact market, validate the chart and depth, prepare the ticket, then verify account impact in the lower command center.',
		steps: ['Confirm DATA, CATALOG, ACCOUNT, and ASSET health', 'Select the exact venue, product, and instrument', 'Review price action, depth, spread, and recent flow', 'Build and review the order in the ticket', 'Confirm the resulting order, fill, position, and risk state']
	},
	performance: {
		visual: { src: '/docs/elements/performance.png', alt: 'Vice Terminal performance and health indicators', caption: 'Separate health domains expose whether public data, catalog metadata, private account state, and asset metadata are ready.' },
		location: 'Performance evidence begins in the health rail and expands into the performance inspector.',
		anatomy: ['DATA feed state', 'CATALOG metadata state', 'ACCOUNT private-state health', 'ASSET metadata health', 'Feed age and latency percentiles', 'Evidence export and degraded-state reason'],
		practical: 'Check the relevant health domain before judging a strategy or execution result; a fast chart does not prove that account state or order dispatch is healthy.'
	},
	'workspace-modes': {
		visual: { src: '/docs/elements/workspace-modes.png', alt: 'Vice Terminal workspace mode controls', caption: 'Curated workspace modes change density and panel emphasis while keeping trading context explicit.' },
		location: 'Workspace modes are selected from the VIEW control in the global header.',
		anatomy: ['VIEW selector', 'Default workspace', 'Chart Max workspace', 'Data Dense workspace', 'Panel-visibility rules', 'Saved local default'],
		practical: 'Use Chart Max for analysis, Data Dense for rapid market scanning, and Default when execution and account monitoring must remain equally visible.'
	},
	'multi-account': {
		visual: { src: '/docs/elements/multi-account.png', alt: 'Vice Terminal multi-account product specification', caption: 'Product specification: active execution identity remains explicit while approved accounts can be monitored together.' },
		location: 'The account selector lives in the header; read-only aggregation is exposed in account surfaces.',
		anatomy: ['Active account identity', 'Venue and network', 'Available balance', 'Read-only aggregation state', 'Account switcher', 'Execution-authority indicator'],
		practical: 'Keep one execution account active at a time. Use aggregation to compare balances and exposure, then explicitly switch identity before placing or modifying an order.'
	},
	'linked-panels': {
		visual: { src: '/docs/elements/linked-panels.png', alt: 'Vice Terminal linked-panel product specification', caption: 'Product specification: matching link colors propagate an exact market descriptor across selected panels.' },
		location: 'Read-only market snapshots open from a workspace tab. Cyan, amber, and violet links synchronize public market/timeframe context only; chart, book, ticket, and account links remain planned.',
		anatomy: ['Read-only pinned exact market snapshot', 'Shared execution market selector', 'Color-coded public link badge', 'Public market/timeframe context', 'Future linked chart/book consumers', 'Future account-aware ticket context'],
		practical: 'Use a linked snapshot to compare public quotes, then explicitly choose its market for the shared workspace if needed. Do not treat a floating or popout panel as an independent trading context.'
	},
	'layouts-hotkeys': {
		visual: { src: '/docs/elements/hotkeys.png', alt: 'Vice Terminal hotkey reference dialog', caption: 'The hotkey dialog documents navigation, panel, privacy, CLI, and guarded execution shortcuts in one searchable surface.' },
		location: 'Open HOTKEYS from the header or use the configured help shortcut.',
		anatomy: ['Shortcut binding', 'Action description', 'Command target', 'Input-focus guard', 'Conflict state', 'Restore-default control'],
		practical: 'Learn navigation and panel shortcuts first. Enable trading bindings only after testing focus suppression and consent behavior in a non-production environment.'
	},
	'desktop-mode': {
		visual: { src: '/docs/elements/desktop-mode.png', alt: 'Vice Terminal desktop workspace', caption: 'Desktop mode uses available width for synchronized market, execution, and account panels.' },
		location: 'Desktop mode is the full-density workspace used on laptop and desktop viewports.',
		anatomy: ['Persistent global header', 'Instrument rail', 'Primary chart', 'Depth and flow column', 'Execution ticket', 'Positions and activity dock'],
		practical: 'Use a stable layout for long sessions so market selection, execution identity, and account risk remain in predictable locations.'
	},
	'mobile-companion': {
		visual: { src: '/docs/elements/mobile-mode.png', alt: 'Vice Terminal mobile trading workspace', caption: 'Mobile mode prioritizes market context, quick sizing, and guarded buy or sell actions.' },
		location: 'The companion workspace activates at supported mobile viewport widths and can be installed as a PWA.',
		anatomy: ['Market header and price', 'Compact chart', 'Book and trades tabs', 'Quick-size presets', 'Buy and sell actions', 'Bottom navigation'],
		practical: 'Use mobile mode for monitoring and deliberate intervention. Review account, market, size, and order type again before submitting from a smaller screen.'
	},
	'header-controls': {
		visual: { src: '/docs/elements/header-controls.png', alt: 'Vice Terminal global header controls', caption: 'The header keeps venue, account, workspace, utilities, health, and connection state continuously visible.' },
		location: 'The global header is fixed above every desktop workspace.',
		anatomy: ['Venue and network selector', 'Active account control', 'VIEW, PANELS, and HOTKEYS', 'Privacy, sound, and CLI controls', 'System-health domains', 'Wallet and recovery state'],
		practical: 'Before acting, read the header as a preflight checklist: correct venue, correct account, healthy state, and intended privacy or notification settings.'
	},
	'chart-trading': {
		visual: { src: '/docs/elements/interactive-chart.png', alt: 'Vice Terminal interactive candlestick chart', caption: 'The interactive chart combines market analysis with armed, reviewable price placement.' },
		location: 'The chart occupies the center of the default workspace and expands in Chart Max mode.',
		anatomy: ['OHLC summary', 'Candlestick plot', 'Volume bars', 'Price and time scales', 'Click-placement state', 'Orders, positions, and trigger overlays'],
		practical: 'Use ordinary clicks for inspection. Arm order placement explicitly, select a price, and review the populated ticket before any command is signed.'
	},
	'tradingview-chart': {
		visual: { src: '/docs/elements/tradingview-chart.png', alt: 'Vice Terminal TradingView-style chart', caption: 'A familiar analytical chart sits beside Vice execution and authoritative account overlays.' },
		location: 'Choose TradingView chart mode from the chart toolbar when the integration is available.',
		anatomy: ['Chart toolbar and timeframe', 'OHLC and instrument identity', 'Price plot and drawings', 'Volume and indicators', 'Price and time axes', 'Vice order and position overlays'],
		practical: 'Use chart studies for analysis, but treat the order ticket and authoritative account surfaces as the source of execution truth.'
	},
	orderbook: {
		visual: { src: '/docs/elements/orderbook.png', alt: 'Vice Terminal orderbook', caption: 'The orderbook shows grouped asks and bids around an explicit last price and spread.' },
		location: 'The orderbook sits to the right of the chart in the default workspace and shares its exact market context.',
		anatomy: ['Ask-price levels', 'Current price and spread', 'Bid-price levels', 'Size and cumulative totals', 'Grouping precision', 'Side-specific cancel controls'],
		practical: 'Confirm grouping and spread before using depth to size an order. A stale, crossed, or incomplete book becomes non-actionable.'
	},
	'trades-liquidations': {
		visual: { src: '/docs/elements/trades-liquidations.png', alt: 'Vice Terminal recent trades and liquidation feed', caption: 'Recent trades retain side, price, size, and time context; liquidation events appear only when authoritative data exists.' },
		location: 'The live tape appears below the orderbook or in a linked standalone panel.',
		anatomy: ['Trade or event filter', 'Buy and sell direction', 'Execution price', 'Trade size', 'Venue timestamp', 'Liquidation-availability state'],
		practical: 'Filter noise by minimum size, then compare aggressive flow with visible depth. Never infer liquidation events when the venue does not supply them.'
	},
	instruments: {
		visual: { src: '/docs/elements/instruments.png', alt: 'Vice Terminal instrument browser', caption: 'The instrument rail provides search, product-group navigation, watch state, price, and change.' },
		location: 'The instrument browser occupies the left rail and can collapse when chart space is prioritized.',
		anatomy: ['Symbol and venue search', 'Alert entry point', 'Product-group filters', 'Favorite or watch state', 'Price and percentage change', 'Catalog result and health state'],
		practical: 'Search by symbol, venue, token, or product class, then verify the exact market descriptor before linking panels or opening an order ticket.'
	},
	activity: {
		visual: { src: '/docs/elements/activity.png', alt: 'Vice Terminal account activity table', caption: 'Activity consolidates order, fill, strategy, reconciliation, and risk-control events.' },
		location: 'Activity is available in the account command center beneath the primary workspace.',
		anatomy: ['Event-family tabs', 'Account and market filters', 'Event type and summary', 'Command or strategy identity', 'Local and venue timestamps', 'Outcome and reconciliation state'],
		practical: 'Use Activity to reconstruct what happened, then open the linked order or strategy when an outcome is pending, partial, rejected, or uncertain.'
	},
	orders: {
		visual: { src: '/docs/elements/orders.png', alt: 'Vice Terminal open orders table', caption: 'Open orders expose identity, market, side, type, size, price, status, and management controls.' },
		location: 'The Orders tab lives beside Positions, algorithms, TWAP activity, and trade history.',
		anatomy: ['Open-order tab and count', 'Market, venue, and side', 'Order and parent identity', 'Type, price, and size', 'Lifecycle status', 'Modify and cancel actions'],
		practical: 'Filter to the intended account and market, inspect parent strategy identity, and treat cancellation as complete only after the authoritative snapshot omits the order.'
	},
	'position-controls': {
		visual: { src: '/docs/elements/positions.png', alt: 'Vice Terminal positions table and controls', caption: 'The positions surface joins exposure, margin, liquidation context, PnL, and guarded close controls.' },
		location: 'Positions is the default tab in the lower account command center.',
		anatomy: ['Market, side, and leverage', 'Position size and notional', 'Entry, mark, and liquidation prices', 'Margin and funding context', 'Realized and unrealized PnL', 'Close, reverse, and protection controls'],
		practical: 'Read size, liquidation distance, and PnL together. Close and reverse workflows reuse the shared execution path and must show an exact reduce-only intent.'
	},
	'dom-ladder': {
		visual: { src: '/docs/elements/dom.png', alt: 'Vice Terminal depth-of-market ladder', caption: 'The DOM presents price-centric liquidity and fast controls without separating them from market and account context.' },
		location: 'Open DOM as a workspace panel and link it to the chart or ticket.',
		anatomy: ['Centered price ladder', 'Bid and ask size columns', 'Cumulative depth', 'Working-order markers', 'Quick-size presets', 'Cancel, flatten, and reverse controls'],
		practical: 'Set size before arming DOM actions. Use side-cancel or flatten only after confirming the active account, exact market, and current position.'
	},
	'pnl-cards': {
		visual: { src: '/docs/elements/pnl-cards.png', alt: 'Vice Terminal PnL card product specification', caption: 'Product specification: shareable performance cards protect sensitive identity while retaining the chosen performance context.' },
		location: 'Create a PnL card from a position, account summary, or performance history.',
		anatomy: ['Realized or unrealized metric', 'Market and position side', 'Entry and mark context', 'Privacy controls', 'Time range and attribution', 'Preview and export action'],
		practical: 'Choose the metric and period deliberately, enable privacy before previewing, and remember that the exported card is a presentation artifact—not an account statement.'
	},
	'aggregated-tape': {
		visual: { src: '/docs/elements/aggregated-tape.png', alt: 'Vice Terminal aggregated market tape', caption: 'The normalized tape combines certified feeds while retaining source venue and timestamp.' },
		location: 'Open Aggregated Tape as a standalone linked panel or beneath compatible orderbooks.',
		anatomy: ['Normalized instrument', 'Source venue', 'Aggressor side', 'Price and size', 'Size and event filters', 'Venue and receive timestamps'],
		practical: 'Select only certified mappings, use size filters to isolate meaningful flow, and open the original venue context before drawing execution conclusions.'
	},
	balances: {
		visual: { src: '/docs/elements/balances.png', alt: 'Vice Terminal balances product specification', caption: 'Product specification: balances preserve venue and asset provenance in both individual and aggregated views.' },
		location: 'Balances opens from the account command center or account selector.',
		anatomy: ['Venue and asset identity', 'Total and available balance', 'Collateral and margin use', 'Account-health state', 'Aggregated-view toggle', 'Venue drill-in'],
		practical: 'Use aggregation to understand deployable capital, then drill into the venue before sizing. Privacy mode masks balance values across every surface.'
	},
	'workspace-layouts': {
		visual: { src: '/docs/elements/layouts.png', alt: 'Vice Terminal panel and layout controls', caption: 'Layouts preserve curated panel visibility and density without carrying live private state. Link groups are planned, not shipped.' },
		location: 'Open PANELS from the header to change visibility; save the resulting arrangement from the workspace selector.',
		anatomy: ['Panel visibility toggles', 'Named layout selector', 'Dockview panel groups', 'Local save status', 'Restore and missing-panel state'],
		practical: 'Start from the closest preset, expose only the panels needed for the task, and reconfirm execution context after restoring on another device.'
	},
	'basket-trading': {
		visual: { src: '/docs/elements/basket-trading.png', alt: 'Vice Terminal basket trading product specification', caption: 'Product specification: every basket leg exposes its own venue, side, weight, size, and execution outcome.' },
		location: 'Basket trading opens from the execution-mode selector or command palette.',
		anatomy: ['Basket name and execution mode', 'Leg instrument and venue', 'Account and side', 'Weight or exact notional', 'Per-leg risk and fee estimate', 'Review and staged-submit control'],
		practical: 'Define every leg explicitly, review combined and per-leg exposure, and monitor partial acceptance as a multi-outcome workflow rather than a single success.'
	},
	'market-panel': {
		visual: { src: '/docs/elements/market-panel.png', alt: 'Vice Terminal focused market panel', caption: 'The market panel combines exact product identity with price, funding, volume, open interest, and routing actions.' },
		location: 'Open Market from an instrument row, chart header, watchlist, or linked workspace panel.',
		anatomy: ['Symbol, venue, and product class', 'Last price and change', 'Bid, ask, and spread', 'Funding and contract terms', 'Volume, open interest, mark, and index', 'Chart, DOM, ticket, and watch actions'],
		practical: 'Use the panel as the identity checkpoint before routing: incomplete tick size, contract, or product metadata blocks execution.'
	},
	news: {
		visual: { src: '/docs/elements/news.png', alt: 'Vice Terminal news panel product specification', caption: 'Product specification: market-relevant headlines remain source-attributed, filterable, and separate from order consent.' },
		location: 'News opens as a workspace panel and can follow a link group or saved topic filter.',
		anatomy: ['Headline and summary', 'Provider and timestamp', 'Market and topic tags', 'Priority state', 'Source and event filters', 'Open, save, and alert actions'],
		practical: 'Filter to markets and sources you trust, open the original item for context, and configure a separate reviewed rule if an event should influence automation.'
	},
	'privacy-sound': {
		visual: { src: '/docs/elements/privacy-sound.png', alt: 'Vice Terminal privacy and sound controls', caption: 'Privacy and sound are global workspace controls with visible state and configurable behavior.' },
		location: 'The privacy and speaker icons appear in the global header.',
		anatomy: ['Global privacy toggle', 'Sound toggle', 'Masked account and wallet state', 'Masked balances, size, and PnL', 'Notification category state', 'Device-local preferences'],
		practical: 'Enable privacy before presenting or screen sharing. Configure sounds by category so critical fills and risk events remain distinct from routine interface feedback.'
	}
};

for (const [slug, detail] of Object.entries(applicationElementDetails)) {
	const topic = topics[slug];
	if (!topic) continue;

	const malformedGuideDescription = Array.isArray(topic.description) ? topic.description as unknown as string[] : undefined;
	const existingSteps = topic.sections.flatMap((section) => section.steps ?? []);
	const existingPoints = topic.sections.flatMap((section) => section.points ?? []);
	const safeguards = malformedGuideDescription ? existingSteps : existingPoints;
	const walkthrough = malformedGuideDescription ?? existingSteps;
	if (malformedGuideDescription) {
		topic.description = topic.title;
		topic.title = topic.label;
	}
	topic.visual = detail.visual;
	topic.mediaSlots = topic.mediaSlots?.filter((slot) => slot.kind !== 'screenshot');
	topic.sections = [
		{
			id: 'what-it-is',
			title: 'What it is',
			body: [topic.description, detail.location]
		},
		{
			id: 'interface-anatomy',
			title: 'Interface anatomy',
			body: ['Use the screenshot above as the visual map for the element. Each region below has a distinct operational responsibility.'],
			points: detail.anatomy
		},
		{
			id: 'walkthrough',
			title: 'Step-by-step walkthrough',
			body: ['Follow this sequence to use the element without losing market, account, or health context.'],
			steps: walkthrough.length > 0 ? walkthrough : detail.steps
		},
		{
			id: 'controls-and-states',
			title: 'Controls and states',
			body: ['Controls expose availability, loading, degraded, blocked, and authoritative states directly. The terminal does not present unavailable data or incomplete authority as ready.'],
			points: safeguards.length > 0 ? safeguards : ['Ready and connected state', 'Loading or reconciling state', 'Degraded or stale state', 'Blocked or unsupported state']
		},
		{
			id: 'practical-use',
			title: 'Practical use',
			body: [detail.practical]
		},
		{
			id: 'production-behavior',
			title: 'Production behavior',
			body: ['The visual documents the complete intended Vice capability. Product-specification screens identify planned UI; production availability remains gated by implementation, venue certification, security review, and end-to-end evidence.']
		}
	];
}

// Older supplemental entries used the guide helper without a separate display title,
// which shifted the description, workflow, and safeguard arguments at runtime.
// Normalize those articles so the user story reads in the intended order.
for (const topic of Object.values(topics)) {
	if (!Array.isArray(topic.description)) continue;

	const intendedDescription = topic.title;
	const intendedWorkflow = topic.description as unknown as string[];
	const overviewSection = topic.sections.find((section) => section.id === 'overview');
	const workflowSection = topic.sections.find((section) => section.id === 'workflow');
	const behaviorSection = topic.sections.find((section) => section.id === 'behavior');
	const intendedSafeguards = workflowSection?.steps ?? [];

	topic.title = topic.label;
	topic.description = intendedDescription;
	if (overviewSection) overviewSection.body = [intendedDescription, ...overviewSection.body.slice(1)];
	if (workflowSection) workflowSection.steps = intendedWorkflow;
	if (behaviorSection) behaviorSection.points = intendedSafeguards;
}

for (const topic of Object.values(topics)) {
	if (!topic.visual) continue;
	const visualGuide = topic.sections.find((section) => section.id === 'visual-guide');
	if (visualGuide) {
		visualGuide.body = ['The screenshot above captures the user story at the point where its primary decisions, controls, and expected outcome are visible together. Select it to inspect the full-size interface.'];
	}
}
