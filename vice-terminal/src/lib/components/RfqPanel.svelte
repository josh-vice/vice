<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { optionChain, isConnected, connectWallet, demoFixturesEnabled } from '$lib/stores';
	import type { OptionContract } from '$lib/types';
	import { X, Maximize2, SlidersHorizontal, ChevronDown } from 'lucide-svelte';
	import StrategyBuilder from './StrategyBuilder.svelte';

	export let spreadLegs: { contract: OptionContract; side: 'buy' | 'sell'; quantity: number }[] = [];

	const dispatch = createEventDispatcher();

	let mode: 'RFQ' | 'Book' = 'RFQ';
	let amount = 1;
	let activeTab: 'payoff' | 'greeks' | 'trades' | 'book' = 'payoff';
	let showStrategyBuilder = false;

	function legLabel(c: OptionContract): string {
		const type = c.optionType === 'call' ? 'Call' : 'Put';
		const exp = new Date(c.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		return `${c.underlying} $${c.strike.toLocaleString()} ${type} ${exp}`;
	}

	function toggleSide(i: number) {
		dispatch('toggleSide', i);
	}
	function setRatio(i: number, value: number) {
		dispatch('setRatio', { index: i, value: Math.max(1, Math.round(value || 1)) });
	}
	function removeLeg(i: number) {
		dispatch('removeFromSpread', i);
	}

	function handleStrategySelected(event: CustomEvent) {
		const strategyLegs = event.detail;
		dispatch('strategiesSelected', strategyLegs);
	}

	// Per-leg signed premium (buy pays ask, sell receives bid)
	$: netPremium = spreadLegs.reduce((sum, leg) => {
		const price = leg.side === 'buy' ? leg.contract.ask : leg.contract.bid;
		return sum + (leg.side === 'buy' ? price : -price) * leg.quantity * amount;
	}, 0);

	// Net greeks
	$: greeks = {
		delta: spreadLegs.reduce((s, l) => s + l.contract.delta * l.quantity * amount * (l.side === 'buy' ? 1 : -1), 0),
		gamma: spreadLegs.reduce((s, l) => s + l.contract.gamma * l.quantity * amount * (l.side === 'buy' ? 1 : -1), 0),
		vega: spreadLegs.reduce((s, l) => s + l.contract.vega * l.quantity * amount * (l.side === 'buy' ? 1 : -1), 0),
		theta: spreadLegs.reduce((s, l) => s + l.contract.theta * l.quantity * amount * (l.side === 'buy' ? 1 : -1), 0),
		rho: spreadLegs.reduce((s, l) => s + (l.contract.rho ?? 0) * l.quantity * amount * (l.side === 'buy' ? 1 : -1), 0)
	};

	// Payoff at expiry across a price range
	function legPayoff(leg: { contract: OptionContract; side: 'buy' | 'sell'; quantity: number }, S: number): number {
		const { strike, optionType } = leg.contract;
		const intrinsic = optionType === 'call' ? Math.max(S - strike, 0) : Math.max(strike - S, 0);
		const premium = leg.side === 'buy' ? leg.contract.ask : leg.contract.bid;
		const qty = leg.quantity * amount;
		// buy: intrinsic - premium ; sell: premium - intrinsic
		return (leg.side === 'buy' ? intrinsic - premium : premium - intrinsic) * qty;
	}

	$: spot = $optionChain.spotPrice;
	$: priceMin = spot * 0.6;
	$: priceMax = spot * 1.4;

	$: payoffPoints = (() => {
		if (spreadLegs.length === 0) return [] as { s: number; pnl: number }[];
		const pts: { s: number; pnl: number }[] = [];
		const steps = 60;
		for (let i = 0; i <= steps; i++) {
			const S = priceMin + ((priceMax - priceMin) * i) / steps;
			const pnl = spreadLegs.reduce((sum, leg) => sum + legPayoff(leg, S), 0);
			pts.push({ s: S, pnl });
		}
		return pts;
	})();

	$: maxProfit = payoffPoints.length ? Math.max(...payoffPoints.map((p) => p.pnl)) : 0;
	$: maxLoss = payoffPoints.length ? Math.min(...payoffPoints.map((p) => p.pnl)) : 0;
	// Detect unbounded profit (long call / naked) by checking slope at the far right
	$: profitUnbounded = payoffPoints.length > 2 &&
		payoffPoints[payoffPoints.length - 1].pnl > payoffPoints[payoffPoints.length - 2].pnl + 0.01;
	$: lossUnbounded = payoffPoints.length > 2 &&
		payoffPoints[payoffPoints.length - 1].pnl < payoffPoints[payoffPoints.length - 2].pnl - 0.01 &&
		payoffPoints[payoffPoints.length - 1].pnl < 0;

	// Break-even points (zero crossings)
	$: breakEvens = (() => {
		const bes: number[] = [];
		for (let i = 1; i < payoffPoints.length; i++) {
			const a = payoffPoints[i - 1];
			const b = payoffPoints[i];
			if ((a.pnl <= 0 && b.pnl >= 0) || (a.pnl >= 0 && b.pnl <= 0)) {
				const t = a.pnl === b.pnl ? 0 : a.pnl / (a.pnl - b.pnl);
				bes.push(a.s + (b.s - a.s) * t);
			}
		}
		return bes;
	})();

	// SVG geometry for payoff curve
	const chartW = 280;
	const chartH = 150;
	$: pnlMin = payoffPoints.length ? Math.min(0, ...payoffPoints.map((p) => p.pnl)) : 0;
	$: pnlMax = payoffPoints.length ? Math.max(0, ...payoffPoints.map((p) => p.pnl)) : 0;
	$: pnlRange = pnlMax - pnlMin || 1;

	function xPos(s: number): number {
		return ((s - priceMin) / (priceMax - priceMin)) * chartW;
	}
	function yPos(pnl: number): number {
		return chartH - ((pnl - pnlMin) / pnlRange) * chartH;
	}
	$: zeroY = yPos(0);
	$: spotX = xPos(spot);

	// Split path into profit (green) and loss (red) segments
	$: linePath = payoffPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.s).toFixed(1)} ${yPos(p.pnl).toFixed(1)}`).join(' ');

	function fmtUsd(v: number): string {
		return `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
	}
</script>

{#if !$demoFixturesEnabled}
	<div class="h-full flex items-center justify-center px-4 text-center text-2xs text-terminal-text-muted">
		Options/RFQ trading is unavailable: no authoritative Hyperliquid options feed is connected.
	</div>
{:else}
<div class="h-full flex flex-col bg-terminal-bg-panel overflow-hidden">
	<!-- Header -->
	<div class="h-10 flex items-center px-3 border-b border-terminal-border flex-shrink-0">
		<span class="text-xs font-semibold">Trade Form</span>
		<div class="ml-auto flex items-center gap-2">
			<button
				class="flex items-center gap-1 px-2 py-0.5 text-2xs rounded border border-terminal-border text-terminal-text-secondary hover:text-terminal-text"
				onclick={() => (mode = mode === 'RFQ' ? 'Book' : 'RFQ')}
			>
				{mode}
				<ChevronDown class="w-3 h-3" />
			</button>
		</div>
	</div>

	<div class="flex-1 overflow-y-auto">
		{#if spreadLegs.length === 0}
			<div class="p-6 text-center text-2xs text-terminal-text-muted space-y-4">
				<p>Click bid (sell) or ask (buy) prices in the options chain to build your trade. The RFQ panel will price it in real time.</p>
				<button
					class="w-full px-4 py-2 bg-terminal-green/20 border border-terminal-green text-terminal-green rounded hover:bg-terminal-green/30 transition-colors text-xs font-medium"
					onclick={() => (showStrategyBuilder = true)}
				>
					Strategy Builder
				</button>
			</div>
		{:else}
			<!-- Legs table: Direction / Instrument / Ratio -->
			<div class="px-3 pt-3">
				<div class="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 gap-y-2 items-center text-2xs">
					<div class="text-terminal-text-muted uppercase tracking-wide">Direction</div>
					<div class="text-terminal-text-muted uppercase tracking-wide">Instrument</div>
					<div class="text-terminal-text-muted uppercase tracking-wide text-right">Ratio</div>
					<div></div>

					{#each spreadLegs as leg, i}
						<!-- Direction toggle -->
						<div class="flex rounded overflow-hidden border border-terminal-border">
							<button
								class="px-2 py-1 text-2xs font-medium {leg.side === 'buy' ? 'bg-terminal-green/20 text-terminal-green' : 'text-terminal-text-muted hover:text-terminal-text'}"
								onclick={() => leg.side !== 'buy' && toggleSide(i)}
							>Buy</button>
							<button
								class="px-2 py-1 text-2xs font-medium {leg.side === 'sell' ? 'bg-terminal-red/20 text-terminal-red' : 'text-terminal-text-muted hover:text-terminal-text'}"
								onclick={() => leg.side !== 'sell' && toggleSide(i)}
							>Sell</button>
						</div>
						<!-- Instrument -->
						<div class="font-mono text-terminal-text truncate">{legLabel(leg.contract)}</div>
						<!-- Ratio -->
						<input
							type="number"
							min="1"
							class="w-12 bg-terminal-bg border border-terminal-border rounded px-1.5 py-1 text-2xs text-right font-mono focus:border-terminal-cyan outline-none"
							value={leg.quantity}
							onchange={(e) => setRatio(i, parseInt(e.currentTarget.value))}
						/>
						<!-- Remove -->
						<button class="text-terminal-text-muted hover:text-terminal-red" onclick={() => removeLeg(i)}>
							<X class="w-3.5 h-3.5" />
						</button>
					{/each}
				</div>
			</div>

			<!-- Amount -->
			<div class="px-3 pt-4">
				<div class="text-2xs text-terminal-text-muted uppercase tracking-wide mb-1">Amount</div>
				<div class="flex items-center gap-2">
					<input
						type="number"
						min="0"
						step="0.1"
						bind:value={amount}
						class="flex-1 bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-xs font-mono focus:border-terminal-cyan outline-none"
					/>
					<button class="p-1.5 rounded border border-terminal-border text-terminal-text-muted hover:text-terminal-text" aria-label="Filters">
						<SlidersHorizontal class="w-3.5 h-3.5" />
					</button>
					<button class="p-1.5 rounded border border-terminal-border text-terminal-text-muted hover:text-terminal-text" aria-label="Expand">
						<Maximize2 class="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			<!-- Action button -->
			<div class="px-3 pt-4">
				{#if $isConnected}
					<button class="w-full py-2.5 rounded bg-terminal-cyan text-terminal-bg font-semibold text-sm hover:opacity-90 transition-opacity">
						{mode === 'RFQ' ? 'Request Quote' : 'Place Order'}
					</button>
				{:else}
					<button
						class="w-full py-2.5 rounded bg-terminal-text text-terminal-bg font-semibold text-sm hover:opacity-90 transition-opacity"
						onclick={connectWallet}
					>
						Connect a Wallet
					</button>
				{/if}
			</div>

			<!-- Estimate summary -->
			<div class="px-3 pt-4 space-y-1.5 text-2xs">
				<div class="flex items-center justify-between">
					<span class="font-semibold {netPremium <= 0 ? 'text-terminal-green' : 'text-terminal-text'}">Est. {netPremium <= 0 ? 'Received' : 'Cost'}</span>
					<span class="font-mono {netPremium <= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{fmtUsd(netPremium)}</span>
				</div>
				<div class="flex items-center justify-between text-terminal-text-secondary">
					<span>Margin Required</span>
					<span class="font-mono text-terminal-text">{fmtUsd(Math.abs(maxLoss))}</span>
				</div>
				<div class="flex items-center justify-between text-terminal-text-secondary">
					<span>Buying Power</span>
					<span class="font-mono text-terminal-text">$126,786.95</span>
				</div>
				<div class="flex items-center justify-between text-terminal-text-secondary">
					<span class="underline decoration-dotted">Est. Fee</span>
					<span class="font-mono text-terminal-text">{fmtUsd(spreadLegs.reduce((s, l) => s + l.quantity * amount * 0.5, 0))}</span>
				</div>
				<div class="flex items-center justify-between text-terminal-text-secondary">
					<span class="underline decoration-dotted">Est. Rewards</span>
					<span class="font-mono text-terminal-cyan">0 DRV</span>
				</div>
			</div>

			<!-- Tabs -->
			<div class="px-3 pt-4 border-t border-terminal-border mt-4">
				<div class="flex items-center gap-4 text-2xs">
					{#each ['payoff', 'greeks', 'trades', 'book'] as tab}
						<button
							class="py-2 capitalize border-b-2 transition-colors {activeTab === tab ? 'border-terminal-cyan text-terminal-text' : 'border-transparent text-terminal-text-muted hover:text-terminal-text'}"
							onclick={() => (activeTab = tab)}
						>{tab}</button>
					{/each}
				</div>
			</div>

			<!-- Tab content -->
			<div class="px-3 py-3">
				{#if activeTab === 'payoff'}
					<!-- Max Loss / Break Even / Max Profit -->
					<div class="grid grid-cols-3 gap-2 text-2xs mb-3">
						<div>
							<div class="text-terminal-text-muted mb-0.5">Max Loss</div>
							<div class="font-mono text-terminal-red">{lossUnbounded ? 'Unlimited' : fmtUsd(maxLoss)}</div>
						</div>
						<div class="text-center">
							<div class="text-terminal-text-muted mb-0.5">Break Even</div>
							<div class="font-mono text-terminal-text">
								{breakEvens.length ? breakEvens.map((b) => `$${b.toLocaleString(undefined, { maximumFractionDigits: 0 })}`).join(', ') : '—'}
							</div>
						</div>
						<div class="text-right">
							<div class="text-terminal-text-muted mb-0.5">Max Profit</div>
							<div class="font-mono text-terminal-green">{profitUnbounded ? 'Infinity' : fmtUsd(maxProfit)}</div>
						</div>
					</div>

					<!-- Payoff chart -->
					<div class="relative">
						<div class="text-2xs text-terminal-text-muted text-center mb-1">{$optionChain.underlying} ${spot.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
						<svg viewBox="0 0 {chartW} {chartH}" class="w-full" style="height: 150px" preserveAspectRatio="none">
							<!-- zero line -->
							<line x1="0" y1={zeroY} x2={chartW} y2={zeroY} stroke="#1e2733" stroke-width="1" stroke-dasharray="3 3" />
							<!-- spot marker -->
							<line x1={spotX} y1="0" x2={spotX} y2={chartH} stroke="#484f58" stroke-width="0.75" stroke-dasharray="2 3" opacity="0.6" />
							<!-- profit fill -->
							<path d="{linePath} L {chartW} {zeroY} L 0 {zeroY} Z" fill="#00d26a" opacity="0.12" />
							<!-- payoff line -->
							<path d={linePath} fill="none" stroke="#00d26a" stroke-width="1.5" />
						</svg>
						<div class="flex justify-between text-3xs text-terminal-text-muted mt-1 font-mono">
							<span>${(priceMin / 1000).toFixed(1)}k</span>
							<span>${(spot / 1000).toFixed(1)}k</span>
							<span>${(priceMax / 1000).toFixed(1)}k</span>
						</div>
					</div>
				{:else if activeTab === 'greeks'}
					<div class="grid grid-cols-4 gap-3 text-2xs">
						<div>
							<div class="text-terminal-text-muted mb-0.5">Delta</div>
							<div class="font-mono {greeks.delta >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{greeks.delta.toFixed(5)}</div>
						</div>
						<div>
							<div class="text-terminal-text-muted mb-0.5">Gamma</div>
							<div class="font-mono text-terminal-text">{greeks.gamma.toFixed(5)}</div>
						</div>
						<div>
							<div class="text-terminal-text-muted mb-0.5">Vega</div>
							<div class="font-mono text-terminal-text">{greeks.vega.toFixed(5)}</div>
						</div>
						<div>
							<div class="text-terminal-text-muted mb-0.5">Theta</div>
							<div class="font-mono text-terminal-red">{greeks.theta.toFixed(5)}</div>
						</div>
						<div class="col-span-4">
							<div class="text-terminal-text-muted mb-0.5">Rho</div>
							<div class="font-mono text-terminal-text">{greeks.rho.toFixed(5)}</div>
						</div>
					</div>
				{:else if activeTab === 'trades'}
					<table class="w-full text-2xs">
						<thead>
							<tr class="text-terminal-text-muted uppercase">
								<th class="text-left font-normal pb-1">Time</th>
								<th class="text-left font-normal pb-1">Instrument</th>
								<th class="text-right font-normal pb-1">Amount</th>
								<th class="text-right font-normal pb-1">Price</th>
							</tr>
						</thead>
						<tbody class="font-mono">
							{#each spreadLegs as leg, i}
								{@const mins = (i + 1) * 7}
								<tr class="border-t border-terminal-border/30">
									<td class="py-1 text-terminal-text-secondary">23:{(59 - mins + 60) % 60}</td>
									<td class="py-1 truncate max-w-[110px]">{legLabel(leg.contract)}</td>
									<td class="py-1 text-right {leg.side === 'buy' ? 'text-terminal-green' : 'text-terminal-red'}">{leg.side === 'buy' ? '+' : '-'}{leg.quantity * amount}</td>
									<td class="py-1 text-right">${(leg.side === 'buy' ? leg.contract.ask : leg.contract.bid).toFixed(2)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else if activeTab === 'book'}
					<table class="w-full text-2xs">
						<thead>
							<tr class="text-terminal-text-muted uppercase">
								<th class="text-right font-normal pb-1">Bid Size</th>
								<th class="text-right font-normal pb-1">Bid</th>
								<th class="text-right font-normal pb-1">Ask</th>
								<th class="text-right font-normal pb-1">Ask Size</th>
							</tr>
						</thead>
						<tbody class="font-mono">
							{#each Array(6) as _, i}
								{@const net = Math.abs(netPremium) || 10}
								<tr class="border-t border-terminal-border/30">
									<td class="py-1 text-right text-terminal-text-secondary">{(Math.random() * 50 + 10).toFixed(1)}</td>
									<td class="py-1 text-right text-terminal-green">${(net - (i + 1) * 0.5).toFixed(2)}</td>
									<td class="py-1 text-right text-terminal-red">${(net + (i + 1) * 0.5).toFixed(2)}</td>
									<td class="py-1 text-right text-terminal-text-secondary">{(Math.random() * 50 + 10).toFixed(1)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		{/if}
	</div>
</div>
{/if}

<StrategyBuilder bind:isOpen={showStrategyBuilder} on:strategySelected={handleStrategySelected} />
