<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { optionChain, demoFixturesEnabled } from '$lib/stores';
	import type { OptionContract } from '$lib/types';
	import { X, Plus, TrendingUp, TrendingDown, Zap, Minus, BarChart2, ChevronRight } from 'lucide-svelte';

	export let isOpen = false;

	const dispatch = createEventDispatcher();

	// Step 1 = outlook picker, Step 2 = full builder
	let step: 1 | 2 = 1;
	let selectedOutlook: Outlook | null = null;

	$: if (!isOpen) { step = 1; selectedOutlook = null; }

	type Outlook = 'bullish' | 'bearish' | 'volatile' | 'neutral' | 'yield';

	interface OptionLeg {
		type: 'call' | 'put';
		strikeOffset: number;
		side: 'buy' | 'sell';
		quantity: number;
	}

	interface Strategy {
		key: string;
		name: string;
		legs: OptionLeg[];
		outlook: Outlook[];
	}

	const outlooks: { id: Outlook; label: string; icon: typeof TrendingUp }[] = [
		{ id: 'bullish',  label: 'Bullish',  icon: TrendingUp },
		{ id: 'bearish',  label: 'Bearish',  icon: TrendingDown },
		{ id: 'volatile', label: 'Volatile', icon: Zap },
		{ id: 'neutral',  label: 'Neutral',  icon: Minus },
		{ id: 'yield',    label: 'Yield',    icon: BarChart2 },
	];

	// Payoff sparkline paths (viewBox 0 0 40 20, breakeven y=13)
	const payoffPaths: Record<string, { d: string; color: string }> = {
		long_call:        { d: 'M0,14 L16,14 L32,3',                          color: '#22c55e' },
		short_put:        { d: 'M0,14 L16,8 L32,8',                           color: '#22c55e' },
		bull_call_spread: { d: 'M0,15 L12,15 L24,5 L40,5',                    color: '#22c55e' },
		bull_put_spread:  { d: 'M0,6 L14,6 L26,15 L40,15',                    color: '#22c55e' },
		risk_reversal:    { d: 'M0,17 L14,13 L28,5 L40,3',                    color: '#22c55e' },
		butterfly:        { d: 'M0,17 L10,17 L20,4 L30,17 L40,17',           color: '#a3a3a3' },
		straddle:         { d: 'M0,3 L18,15 L36,3',                           color: '#3b82f6' },
		strangle:         { d: 'M0,4 L12,15 L20,15 L28,15 L40,4',            color: '#3b82f6' },
	};

	interface Strategy {
		key: string;
		name: string;
		description: string;
		legs: OptionLeg[];
		outlook: Outlook[];
	}

	const strategies: Record<string, Strategy> = {
		long_call:        { key: 'long_call',        name: 'Long Call',        description: 'Buy a call option to profit from price increases',                     legs: [{ type: 'call', strikeOffset: 0,    side: 'buy',  quantity: 1 }],                                                                                                                                     outlook: ['bullish'] },
		short_put:        { key: 'short_put',         name: 'Short Put',        description: 'Sell a put to collect premium if price stays flat or rises',           legs: [{ type: 'put',  strikeOffset: 0,    side: 'sell', quantity: 1 }],                                                                                                                                     outlook: ['bullish'] },
		bull_call_spread: { key: 'bull_call_spread',  name: 'Bull Call Spread', description: 'Buy a call, sell a higher strike call to reduce cost and cap profit',  legs: [{ type: 'call', strikeOffset: 0,    side: 'buy',  quantity: 1 }, { type: 'call', strikeOffset: 200,  side: 'sell', quantity: 1 }],                                                                   outlook: ['bullish'] },
		bull_put_spread:  { key: 'bull_put_spread',   name: 'Bull Put Spread',  description: 'Sell a put and buy a lower strike put, collect net credit',            legs: [{ type: 'put',  strikeOffset: 0,    side: 'sell', quantity: 1 }, { type: 'put',  strikeOffset: -200, side: 'buy',  quantity: 1 }],                                                                   outlook: ['bullish'] },
		risk_reversal:    { key: 'risk_reversal',     name: 'Risk Reversal',    description: 'Buy an OTM call and sell an OTM put for directional exposure',         legs: [{ type: 'call', strikeOffset: 200,  side: 'buy',  quantity: 1 }, { type: 'put',  strikeOffset: -200, side: 'sell', quantity: 1 }],                                                                   outlook: ['bullish'] },
		long_put:         { key: 'long_put',          name: 'Long Put',         description: 'Buy a put option to profit from price decreases',                      legs: [{ type: 'put',  strikeOffset: 0,    side: 'buy',  quantity: 1 }],                                                                                                                                     outlook: ['bearish'] },
		bear_put_spread:  { key: 'bear_put_spread',   name: 'Bear Put Spread',  description: 'Buy a put and sell a lower strike put, profitable if price falls',     legs: [{ type: 'put',  strikeOffset: 0,    side: 'buy',  quantity: 1 }, { type: 'put',  strikeOffset: -200, side: 'sell', quantity: 1 }],                                                                   outlook: ['bearish'] },
		bear_call_spread: { key: 'bear_call_spread',  name: 'Bear Call Spread', description: 'Sell a call and buy a higher strike call to cap downside risk',        legs: [{ type: 'call', strikeOffset: 0,    side: 'sell', quantity: 1 }, { type: 'call', strikeOffset: 200,  side: 'buy',  quantity: 1 }],                                                                   outlook: ['bearish'] },
		straddle:         { key: 'straddle',          name: 'Long Straddle',    description: 'Buy a call and put at the same strike, profit from big moves either way', legs: [{ type: 'call', strikeOffset: 0,    side: 'buy',  quantity: 1 }, { type: 'put',  strikeOffset: 0,    side: 'buy',  quantity: 1 }],                                                               outlook: ['volatile'] },
		strangle:         { key: 'strangle',          name: 'Long Strangle',    description: 'Buy OTM call and put, cheaper than straddle but needs a bigger move',  legs: [{ type: 'call', strikeOffset: 200,  side: 'buy',  quantity: 1 }, { type: 'put',  strikeOffset: -200, side: 'buy',  quantity: 1 }],                                                                   outlook: ['volatile'] },
		butterfly:        { key: 'butterfly',         name: 'Butterfly',        description: 'Limited risk, limited reward — profits when price stays near center', legs: [{ type: 'call', strikeOffset: -200, side: 'buy',  quantity: 1 }, { type: 'call', strikeOffset: 0,    side: 'sell', quantity: 2 }, { type: 'call', strikeOffset: 200, side: 'buy', quantity: 1 }], outlook: ['neutral'] },
		iron_condor:      { key: 'iron_condor',       name: 'Iron Condor',      description: 'Sell OTM call spread and put spread, profit in a range',               legs: [{ type: 'call', strikeOffset: 200,  side: 'sell', quantity: 1 }, { type: 'call', strikeOffset: 400,  side: 'buy',  quantity: 1 }, { type: 'put', strikeOffset: -200, side: 'sell', quantity: 1 }, { type: 'put', strikeOffset: -400, side: 'buy', quantity: 1 }], outlook: ['neutral'] },
		covered_call:     { key: 'covered_call',      name: 'Covered Call',     description: 'Sell a call against a long position to generate income',               legs: [{ type: 'call', strikeOffset: 200,  side: 'sell', quantity: 1 }],                                                                                                                                     outlook: ['yield'] },
		short_straddle:   { key: 'short_straddle',    name: 'Short Straddle',   description: 'Sell both a call and put at ATM — profit from low volatility',         legs: [{ type: 'call', strikeOffset: 0,    side: 'sell', quantity: 1 }, { type: 'put',  strikeOffset: 0,    side: 'sell', quantity: 1 }],                                                                   outlook: ['yield'] },
	};

	const strategyButtons = ['long_call', 'bull_call_spread', 'bull_put_spread', 'risk_reversal', 'butterfly', 'straddle', 'strangle', 'iron_condor'];

	// Current working legs (editable)
	interface WorkingLeg {
		type: 'call' | 'put';
		side: 'buy' | 'sell';
		expiry: string;
		strike: number;
		quantity: number;
	}

	let selectedStrategyKey: string = 'long_call';
	let workingLegs: WorkingLeg[] = [];
	let amount = 1;

	// Derived from option chain
	$: spot = $optionChain.spotPrice;
	$: underlying = $optionChain.underlying;
	$: expiryDates = $optionChain.expiryDates ?? [];
	$: strikes = $optionChain.strikes ?? [];
	$: defaultExpiry = expiryDates[0] ?? '';

	// ATM strike
	$: atmStrike = strikes.length
		? strikes.reduce((c, s) => Math.abs(s - spot) < Math.abs(c - spot) ? s : c, strikes[0])
		: spot;

	function expiryLabel(e: string): string {
		return new Date(e).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function buildLegs(key: string): WorkingLeg[] {
		const s = strategies[key];
		if (!s) return [];
		const sorted = [...strikes].sort((a, b) => a - b);
		const atmIdx = sorted.indexOf(atmStrike) >= 0
			? sorted.indexOf(atmStrike)
			: sorted.findIndex(s => s >= atmStrike);
		const safeAtmIdx = Math.max(0, Math.min(atmIdx, sorted.length - 1));

		return s.legs.map(leg => {
			let strike: number;
			if (leg.strikeOffset === 0) {
				strike = sorted[safeAtmIdx] ?? atmStrike;
			} else {
				// Offset by N strikes above/below ATM, not by dollar amount
				const stepsPerUnit = 200; // each 200 offset = 1 strike step
				const steps = Math.round(leg.strikeOffset / stepsPerUnit);
				const targetIdx = Math.max(0, Math.min(sorted.length - 1, safeAtmIdx + steps));
				strike = sorted[targetIdx] ?? atmStrike;
			}
			return { type: leg.type, side: leg.side, expiry: defaultExpiry, strike, quantity: leg.quantity };
		});
	}

	// Strategies filtered by selected outlook (for step 1)
	$: filteredStrategies = selectedOutlook
		? Object.values(strategies).filter(s => s.outlook.includes(selectedOutlook!))
		: [];

	function pickStrategy(key: string) {
		selectedStrategyKey = key;
		workingLegs = buildLegs(key);
		step = 2;
	}

	function selectStrategy(key: string) {
		selectedStrategyKey = key;
		workingLegs = buildLegs(key);
	}

	// Build on open
	$: if (isOpen && step === 2 && workingLegs.length === 0) {
		workingLegs = buildLegs(selectedStrategyKey);
	}

	function addLeg() {
		workingLegs = [...workingLegs, { type: 'call', side: 'buy', expiry: defaultExpiry, strike: atmStrike, quantity: 1 }];
	}

	function removeLeg(i: number) {
		workingLegs = workingLegs.filter((_, idx) => idx !== i);
	}

	// ---- Payoff chart ----
	const chartW = 460;
	const chartH = 300;
	$: priceMin = spot * 0.65;
	$: priceMax = spot * 1.35;

	function legPayoff(leg: WorkingLeg, S: number): number {
		const intrinsic = leg.type === 'call' ? Math.max(S - leg.strike, 0) : Math.max(leg.strike - S, 0);
		// Rough premium estimate: 1.5% of spot for ATM, scaling with moneyness
		const moneyness = Math.abs(leg.strike - spot) / spot;
		const premium = spot * (0.015 - moneyness * 0.01);
		const p = Math.max(0.5, premium);
		return (leg.side === 'buy' ? intrinsic - p : p - intrinsic) * leg.quantity * amount;
	}

	$: payoffPoints = (() => {
		if (workingLegs.length === 0) return [] as { s: number; pnl: number }[];
		const pts: { s: number; pnl: number }[] = [];
		for (let i = 0; i <= 80; i++) {
			const S = priceMin + ((priceMax - priceMin) * i) / 80;
			const pnl = workingLegs.reduce((sum, leg) => sum + legPayoff(leg, S), 0);
			pts.push({ s: S, pnl });
		}
		return pts;
	})();

	$: pnlValues = payoffPoints.map(p => p.pnl);
	$: pnlMin = Math.min(0, ...pnlValues);
	$: pnlMax = Math.max(0, ...pnlValues);
	$: pnlRange = pnlMax - pnlMin || 1;

	function xPos(s: number) { return ((s - priceMin) / (priceMax - priceMin)) * chartW; }
	function yPos(pnl: number) { return chartH - ((pnl - pnlMin) / pnlRange) * chartH; }

	$: zeroY = yPos(0);
	$: spotX = xPos(spot);
	$: linePath = payoffPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.s).toFixed(1)} ${yPos(p.pnl).toFixed(1)}`).join(' ');
	$: maxProfit = pnlValues.length ? Math.max(...pnlValues) : 0;
	$: maxLoss = pnlValues.length ? Math.min(...pnlValues) : 0;
	$: profitUnbounded = payoffPoints.length > 2 && payoffPoints[payoffPoints.length-1].pnl > payoffPoints[payoffPoints.length-2].pnl + 0.01;
	$: breakEvens = (() => {
		const bes: number[] = [];
		for (let i = 1; i < payoffPoints.length; i++) {
			const a = payoffPoints[i-1], b = payoffPoints[i];
			if ((a.pnl <= 0 && b.pnl >= 0) || (a.pnl >= 0 && b.pnl <= 0)) {
				const t = a.pnl === b.pnl ? 0 : a.pnl / (a.pnl - b.pnl);
				bes.push(a.s + (b.s - a.s) * t);
			}
		}
		return bes;
	})();

	// ---- Tabs ----
	let activeTab: 'payoff' | 'greeks' | 'trades' | 'book' = 'payoff';

	// ---- Submit ----
	function submit() {
		const legs = workingLegs.map(leg => {
			const contract: OptionContract = {
				symbol: `${underlying}-${leg.strike}-${leg.type === 'call' ? 'C' : 'P'}`,
				underlying,
				optionType: leg.type,
				strike: leg.strike,
				expiry: leg.expiry,
				bid: Math.random() * 50 + 10,
				ask: Math.random() * 50 + 15,
				iv: Math.random() * 0.5 + 0.2,
				delta: leg.type === 'call' ? Math.random() * 0.8 : -Math.random() * 0.8,
				gamma: Math.random() * 0.01,
				vega: Math.random() * 5,
				theta: -Math.random() * 2,
				rho: Math.random() * 3
			};
			return { contract, side: leg.side, quantity: leg.quantity };
		});
		dispatch('strategySelected', legs);
		isOpen = false;
	}

	function fmtUsd(v: number) {
		return `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
	}

	// Price axis labels
	$: priceLabels = [0, 0.25, 0.5, 0.75, 1].map(t => priceMin + (priceMax - priceMin) * t);

	// PnL axis labels
	$: pnlAxisValues = [pnlMin, pnlMin + pnlRange * 0.5, pnlMax];
</script>

{#if $demoFixturesEnabled && isOpen && step === 1}
	<!-- Step 1: Outlook Picker Modal -->
	<div
		class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Strategy Builder"
	>
		<div class="bg-[#111418] border border-terminal-border rounded-lg w-full max-w-[480px] shadow-2xl overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-5 py-4 border-b border-terminal-border">
				<h2 class="text-sm font-semibold text-terminal-text">Strategy Builder</h2>
				<button data-action-id="ui.src.lib.components.strategybuilder.button.hc3c2eabe1f"
					class="text-terminal-text-muted hover:text-terminal-text transition-colors"
					onclick={() => (isOpen = false)}
					aria-label="Close"
				><X class="w-4 h-4" /></button>
			</div>

			<div class="p-5 space-y-5">
				<!-- Asset display -->
				<div>
					<div class="text-2xs text-terminal-text-muted uppercase tracking-wide mb-2">Select Asset</div>
					<div class="flex items-center gap-2 px-3 py-2 bg-terminal-bg-secondary border border-terminal-border rounded text-sm font-medium w-full">
						<span class="text-terminal-yellow text-xs font-bold">₿</span>
						<span>{underlying}</span>
						<span class="text-terminal-text-muted font-mono ml-1">${spot.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
						<ChevronRight class="w-3.5 h-3.5 text-terminal-text-muted ml-auto rotate-90" />
					</div>
				</div>

				<!-- Outlook buttons -->
				<div>
					<div class="text-2xs text-terminal-text-muted uppercase tracking-wide mb-2">{"What's your market outlook?"}</div>
					<div class="flex gap-2">
						{#each outlooks as o}
							{@const active = selectedOutlook === o.id}
							<button data-action-id="ui.src.lib.components.strategybuilder.button.hd5b072b784"
								class="flex-1 flex flex-col items-center gap-1.5 py-3 rounded border transition-all text-xs font-medium
									{active
										? 'bg-terminal-green/15 border-terminal-green text-terminal-green'
										: 'bg-terminal-bg-secondary border-terminal-border text-terminal-text-muted hover:border-terminal-border-light hover:text-terminal-text'}"
								onclick={() => (selectedOutlook = o.id)}
							>
								<div class="w-7 h-7 rounded-full flex items-center justify-center
									{active ? 'bg-terminal-green text-terminal-bg' : 'bg-terminal-bg text-terminal-text-muted'}">
									<svelte:component this={o.icon} class="w-3.5 h-3.5" />
								</div>
								{o.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Strategy list (only when outlook selected) -->
				{#if selectedOutlook && filteredStrategies.length > 0}
					<div>
						<div class="text-2xs text-terminal-text-muted uppercase tracking-wide mb-2">Select a strategy</div>
						<div class="space-y-1.5">
							{#each filteredStrategies as s}
								{@const path = payoffPaths[s.key]}
								<button data-action-id="ui.src.lib.components.strategybuilder.button.hb408866474"
									class="w-full flex items-center gap-3 px-3 py-3 rounded border border-terminal-border bg-terminal-bg-secondary hover:border-terminal-border-light hover:bg-terminal-bg-hover transition-all text-left"
									onclick={() => pickStrategy(s.key)}
								>
									<!-- Payoff sparkline -->
									<div class="flex-shrink-0 w-10 h-6">
										{#if path}
											<svg viewBox="0 0 40 20" width="40" height="20" preserveAspectRatio="none" aria-hidden="true">
												<line x1="0" y1="13" x2="40" y2="13" stroke="#374151" stroke-width="0.5" />
												<path d={path.d} fill="none" stroke={path.color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
											</svg>
										{/if}
									</div>
									<!-- Text -->
									<div class="flex-1 min-w-0">
										<div class="text-xs font-semibold text-terminal-text">{s.name}</div>
										<div class="text-2xs text-terminal-text-muted truncate">{s.description}</div>
									</div>
									<ChevronRight class="w-3.5 h-3.5 text-terminal-text-muted flex-shrink-0" />
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

{:else if $demoFixturesEnabled && isOpen && step === 2}
	<!-- Step 2: Full split-pane builder -->
	<div
		class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
		role="dialog"
		aria-modal="true"
		aria-label="Strategy Builder"
	>
		<div class="bg-[#111418] border border-terminal-border rounded-lg w-full max-w-[1100px] shadow-2xl flex flex-col overflow-hidden" style="height: 90vh; max-height: 820px;">

			<!-- Modal Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-terminal-border flex-shrink-0">
				<div class="flex items-center gap-3">
					<button data-action-id="ui.src.lib.components.strategybuilder.button.hb40be7fde9"
						class="text-terminal-text-muted hover:text-terminal-text transition-colors text-xs flex items-center gap-1"
						onclick={() => { step = 1; }}
					>
						<ChevronRight class="w-3.5 h-3.5 rotate-180" />
						Back
					</button>
					<div class="h-3.5 w-px bg-terminal-border"></div>
					<h2 class="text-base font-semibold text-terminal-text">
						{underlying} ${spot.toLocaleString(undefined, { maximumFractionDigits: 2 })} {strategies[selectedStrategyKey]?.name ?? 'Custom'}
						{defaultExpiry ? ` · ${expiryLabel(defaultExpiry)}` : ''}
					</h2>
				</div>
				<button data-action-id="ui.src.lib.components.strategybuilder.button.hd3e5a67aee"
					class="text-terminal-text-muted hover:text-terminal-text transition-colors"
					onclick={() => (isOpen = false)}
					aria-label="Close"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Body: left config + right chart -->
			<div class="flex flex-1 min-h-0">

				<!-- LEFT: Config panel -->
				<div class="w-[520px] flex-shrink-0 flex flex-col border-r border-terminal-border overflow-y-auto">

					<!-- Market row -->
					<div class="px-5 pt-4 pb-3 border-b border-terminal-border">
						<div class="text-2xs text-terminal-text-muted uppercase tracking-wide mb-1.5">Market</div>
						<div class="flex items-center gap-2">
							<div class="flex items-center gap-2 px-3 py-1.5 bg-terminal-bg-secondary border border-terminal-border rounded text-sm font-medium">
								<span class="text-terminal-yellow text-xs font-bold">₿</span>
								<span>{underlying}</span>
								<span class="text-terminal-text-muted font-mono">${spot.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
								<span class="text-terminal-text-muted text-xs">›</span>
							</div>
						</div>
					</div>

					<!-- Strategy type pills -->
					<div class="px-5 pt-4 pb-3 border-b border-terminal-border">
						<div class="text-2xs text-terminal-text-muted uppercase tracking-wide mb-2">Strategy</div>
						<div class="flex flex-wrap gap-2">
							{#each strategyButtons as key}
								<button data-action-id="ui.src.lib.components.strategybuilder.button.h1f666511b7"
									class="px-3 py-1.5 rounded text-sm font-semibold transition-colors border
										{selectedStrategyKey === key
											? 'bg-terminal-text text-terminal-bg border-terminal-text'
											: 'bg-terminal-bg-secondary text-terminal-text border-terminal-border hover:border-terminal-border-light'}"
									onclick={() => selectStrategy(key)}
								>
									{strategies[key].name}
								</button>
							{/each}
							<button data-action-id="ui.src.lib.components.strategybuilder.button.h46762547cb" class="px-3 py-1.5 rounded text-sm font-semibold border bg-terminal-bg-secondary text-terminal-text border-terminal-border hover:border-terminal-border-light">
								Custom
							</button>
						</div>
					</div>

					<!-- Legs table -->
					<div class="px-5 pt-4 pb-3 flex-1">
						<!-- Header row -->
						<div class="grid gap-x-2 items-center text-2xs text-terminal-text-muted uppercase tracking-wide mb-2" style="grid-template-columns: 110px 70px 90px 80px 60px 24px;">
							<span>Product</span>
							<span>Direction</span>
							<span>Expiry</span>
							<span>Strike</span>
							<span>Ratio</span>
							<span></span>
						</div>

						{#each workingLegs as leg, i}
							<div class="grid gap-x-2 gap-y-1 items-center mb-2" style="grid-template-columns: 110px 70px 90px 80px 60px 24px;">
								<!-- Product -->
								<div class="flex items-center gap-1 text-xs font-medium">
									<span>{underlying} Option</span>
									<span class="text-terminal-text-muted text-xs">›</span>
								</div>

								<!-- Direction toggle -->
								<div class="flex rounded overflow-hidden border border-terminal-border text-2xs">
									<button data-action-id="ui.src.lib.components.strategybuilder.button.h9acaf22e3a"
										class="flex-1 px-1.5 py-1 font-semibold transition-colors
											{leg.side === 'buy' ? 'bg-terminal-green/20 text-terminal-green border-r border-terminal-green/30' : 'text-terminal-text-muted hover:text-terminal-text'}"
										onclick={() => { workingLegs[i] = { ...leg, side: 'buy' }; workingLegs = [...workingLegs]; }}
									>Buy</button>
									<button data-action-id="ui.src.lib.components.strategybuilder.button.hcafe398e32"
										class="flex-1 px-1.5 py-1 font-semibold transition-colors
											{leg.side === 'sell' ? 'bg-terminal-red/20 text-terminal-red' : 'text-terminal-text-muted hover:text-terminal-text'}"
										onclick={() => { workingLegs[i] = { ...leg, side: 'sell' }; workingLegs = [...workingLegs]; }}
									>Sell</button>
								</div>

								<!-- Expiry -->
								<select data-action-id="ui.src.lib.components.strategybuilder.select.h412882e392"
									class="bg-terminal-bg-secondary border border-terminal-border rounded px-2 py-1 text-2xs text-terminal-text focus:border-terminal-cyan outline-none appearance-none"
									value={leg.expiry}
									onchange={(e) => { workingLegs[i] = { ...leg, expiry: e.currentTarget.value }; workingLegs = [...workingLegs]; }}
								>
									{#each expiryDates as exp}
										<option value={exp}>{expiryLabel(exp)}</option>
									{/each}
								</select>

								<!-- Strike -->
								<select data-action-id="ui.src.lib.components.strategybuilder.select.hd316106f08"
									class="bg-terminal-bg-secondary border border-terminal-border rounded px-2 py-1 text-2xs font-mono text-terminal-text focus:border-terminal-cyan outline-none appearance-none"
									value={leg.strike}
									onchange={(e) => { workingLegs[i] = { ...leg, strike: parseFloat(e.currentTarget.value) }; workingLegs = [...workingLegs]; }}
								>
									{#each strikes as s}
										<option value={s}>${s.toLocaleString()}</option>
									{/each}
								</select>

								<!-- Quantity -->
								<input data-action-id="ui.src.lib.components.strategybuilder.input.h5ff9b93a7a"
									type="number"
									min="1"
									class="bg-terminal-bg-secondary border border-terminal-border rounded px-2 py-1 text-2xs font-mono text-terminal-text focus:border-terminal-cyan outline-none w-full"
									value={leg.quantity}
									onchange={(e) => { workingLegs[i] = { ...leg, quantity: parseInt(e.currentTarget.value) || 1 }; workingLegs = [...workingLegs]; }}
								/>

								<!-- Remove -->
								<button data-action-id="ui.src.lib.components.strategybuilder.button.h6d368dadd4"
									class="text-terminal-text-muted hover:text-terminal-red transition-colors flex items-center justify-center"
									onclick={() => removeLeg(i)}
									aria-label="Remove leg"
								>
									<X class="w-3.5 h-3.5" />
								</button>
							</div>
						{/each}

						<!-- Add leg -->
						<button data-action-id="ui.src.lib.components.strategybuilder.button.h070e85fdd3"
							class="flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs border border-terminal-border rounded text-terminal-text-muted hover:text-terminal-text hover:border-terminal-border-light transition-colors"
							onclick={addLeg}
						>
							<Plus class="w-3.5 h-3.5" />
							Add Leg
						</button>
					</div>

					<!-- Amount + Submit -->
					<div class="px-5 pb-5 pt-3 border-t border-terminal-border space-y-3 flex-shrink-0">
						<div>
							<div class="text-2xs text-terminal-text-muted uppercase tracking-wide mb-1.5">Amount</div>
							<input data-action-id="ui.src.lib.components.strategybuilder.input.hf60d550195"
								type="number"
								min="1"
								step="1"
								bind:value={amount}
								class="w-full bg-terminal-bg-secondary border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text focus:border-terminal-cyan outline-none"
							/>
						</div>
						<button data-action-id="ui.src.lib.components.strategybuilder.button.h5f69b0fc9a"
							class="w-full py-3 rounded bg-terminal-text text-terminal-bg font-semibold text-sm hover:opacity-90 transition-opacity"
							onclick={submit}
							disabled={workingLegs.length === 0}
						>
							{workingLegs.length === 0 ? 'Add at least one leg' : 'Build Strategy'}
						</button>
					</div>
				</div>

				<!-- RIGHT: Payoff chart + tabs -->
				<div class="flex-1 flex flex-col min-w-0">

					<!-- Tabs -->
					<div class="h-10 flex items-center px-5 border-b border-terminal-border gap-6 flex-shrink-0">
						{#each ['payoff', 'greeks', 'trades', 'book'] as tab}
							<button data-action-id="ui.src.lib.components.strategybuilder.button.h5c1881c02a"
								class="py-2.5 text-sm capitalize border-b-2 transition-colors -mb-px
									{activeTab === tab ? 'border-terminal-text text-terminal-text font-medium' : 'border-transparent text-terminal-text-muted hover:text-terminal-text'}"
								onclick={() => (activeTab = tab)}
							>{tab}</button>
						{/each}
					</div>

					{#if activeTab === 'payoff'}
						<!-- Stats row -->
						<div class="flex items-start gap-8 px-6 pt-4 pb-2 flex-shrink-0">
							<div>
								<div class="text-2xs text-terminal-text-muted mb-0.5">Max Loss</div>
								<div class="font-mono text-sm text-terminal-red">{fmtUsd(maxLoss)}</div>
							</div>
							<div>
								<div class="text-2xs text-terminal-text-muted mb-0.5">Break Even</div>
								<div class="font-mono text-sm text-terminal-text">
									{breakEvens.length ? breakEvens.slice(0, 2).map(b => `$${b.toLocaleString(undefined, { maximumFractionDigits: 0 })}`).join(' / ') : '—'}
								</div>
							</div>
							<div class="ml-auto text-right">
								<div class="text-2xs text-terminal-text-muted mb-0.5">Max Profit</div>
								<div class="font-mono text-sm text-terminal-green">{profitUnbounded ? 'Infinity' : fmtUsd(maxProfit)}</div>
							</div>
						</div>

						<!-- Spot label -->
						<div class="px-6 text-center">
							<span class="text-xs text-terminal-text-muted">{underlying} ${spot.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
						</div>

						<!-- Chart -->
						<div class="flex-1 px-6 pb-4 min-h-0">
							<svg
								viewBox="0 0 {chartW} {chartH}"
								class="w-full h-full"
								preserveAspectRatio="none"
							>
								<!-- Horizontal grid lines -->
								{#each pnlAxisValues as pnlV}
									<line x1="0" y1={yPos(pnlV)} x2={chartW} y2={yPos(pnlV)} stroke="#1e2733" stroke-width="1" />
								{/each}

								<!-- Zero line -->
								<line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#374151" stroke-width="1" stroke-dasharray="4 3" />

								<!-- Spot vertical dashed line -->
								<line x1={spotX} y1="0" x2={spotX} y2={chartH} stroke="#484f58" stroke-width="0.75" stroke-dasharray="3 3" opacity="0.7" />

								{#if payoffPoints.length > 1}
									<!-- Profit fill (green above zero) -->
									<clipPath id="profit-clip">
										<rect x="0" y="0" width={chartW} height={zeroY} />
									</clipPath>
									<clipPath id="loss-clip">
										<rect x="0" y={zeroY} width={chartW} height={chartH - zeroY} />
									</clipPath>

									<path d="{linePath} L {xPos(priceMax).toFixed(1)} {zeroY} L {xPos(priceMin).toFixed(1)} {zeroY} Z"
										fill="#16a34a" opacity="0.18" clip-path="url(#profit-clip)" />
									<path d="{linePath} L {xPos(priceMax).toFixed(1)} {zeroY} L {xPos(priceMin).toFixed(1)} {zeroY} Z"
										fill="#dc2626" opacity="0.12" clip-path="url(#loss-clip)" />

									<!-- Profit portion of line -->
									<path d={linePath} fill="none" stroke="#22c55e" stroke-width="2" clip-path="url(#profit-clip)" stroke-linecap="round" stroke-linejoin="round" />
									<!-- Loss portion of line -->
									<path d={linePath} fill="none" stroke="#ef4444" stroke-width="2" clip-path="url(#loss-clip)" stroke-linecap="round" stroke-linejoin="round" />
								{/if}
							</svg>

							<!-- X-axis price labels -->
							<div class="flex justify-between text-2xs text-terminal-text-muted font-mono mt-1">
								{#each priceLabels as p}
									<span>${(p / 1000).toFixed(1)}k</span>
								{/each}
							</div>
						</div>

						<!-- Bottom stats row -->
						<div class="border-t border-terminal-border px-6 py-3 flex-shrink-0 grid grid-cols-4 gap-4 text-2xs">
							<div>
								<div class="text-terminal-text-muted mb-0.5">Buying Power</div>
								<div class="font-mono text-terminal-text">—</div>
							</div>
							<div>
								<div class="text-terminal-text-muted mb-0.5">Est. Margin</div>
								<div class="font-mono text-terminal-text">{fmtUsd(Math.abs(maxLoss) * amount)}</div>
							</div>
							<div>
								<div class="text-terminal-text-muted underline decoration-dotted mb-0.5">Est. Fee</div>
								<div class="font-mono text-terminal-text">{fmtUsd(workingLegs.length * amount * 0.5)}</div>
							</div>
							<div>
								<div class="text-terminal-text-muted underline decoration-dotted mb-0.5">Est. Rewards</div>
								<div class="font-mono text-terminal-cyan">0 DRV</div>
							</div>
						</div>

					{:else if activeTab === 'greeks'}
						<div class="p-6 grid grid-cols-3 gap-6 text-sm">
							{#each [['Delta','Δ','0.0000'],['Gamma','Γ','0.0000'],['Vega','V','0.0000'],['Theta','Θ','0.0000'],['Rho','ρ','0.0000']] as [label, sym, val]}
								<div class="bg-terminal-bg-secondary rounded p-3">
									<div class="text-2xs text-terminal-text-muted mb-1">{label} ({sym})</div>
									<div class="font-mono text-terminal-text">{val}</div>
								</div>
							{/each}
						</div>
					{:else if activeTab === 'trades'}
						<div class="p-6 text-2xs text-terminal-text-muted text-center mt-8">No recent trades</div>
					{:else if activeTab === 'book'}
						<div class="p-6 text-2xs text-terminal-text-muted text-center mt-8">Select legs to see book data</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
