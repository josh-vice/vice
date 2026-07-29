<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { optionChain, selectedExpiry, filteredOptionContracts, demoFixturesEnabled } from '$lib/stores';
	import StrategyBuilder from '$lib/components/StrategyBuilder.svelte';
	import type { OptionContract } from '$lib/types';
	import { SlidersHorizontal } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	let showStrategyBuilder = false;

	// ATM strike
	$: atmStrike = $optionChain.strikes.reduce(
		(closest, s) =>
			Math.abs(s - $optionChain.spotPrice) < Math.abs(closest - $optionChain.spotPrice) ? s : closest,
		$optionChain.strikes[0] ?? 0
	);

	// Group by strike
	$: groupedByStrike = $filteredOptionContracts.reduce(
		(acc, c) => {
			if (!acc[c.strike]) acc[c.strike] = { call: null, put: null };
			acc[c.strike][c.optionType] = c;
			return acc;
		},
		{} as Record<number, { call: OptionContract | null; put: OptionContract | null }>
	);

	$: sortedStrikes = Object.keys(groupedByStrike).map(Number).sort((a, b) => a - b);

	// Selected legs
	interface Leg { contract: OptionContract; side: 'buy' | 'sell' }
	let legs: Leg[] = [];

	function addLeg(contract: OptionContract | null, side: 'buy' | 'sell') {
		if (!contract) return;
		const idx = legs.findIndex(l => l.contract.symbol === contract.symbol && l.side === side);
		if (idx >= 0) {
			legs = legs.filter((_, i) => i !== idx);
		} else {
			legs = [...legs.slice(-3), { contract, side }];
		}
	}

	function hasLeg(contract: OptionContract | null, side: 'buy' | 'sell') {
		return contract && legs.some(l => l.contract.symbol === contract.symbol && l.side === side);
	}

	$: netDebit = legs.reduce((sum, l) => {
		const px = l.side === 'buy' ? l.contract.ask : l.contract.bid;
		return sum + (l.side === 'buy' ? px : -px);
	}, 0);

	$: breakEven =
		legs.length === 1
			? legs[0].side === 'buy'
				? legs[0].contract.strike + legs[0].contract.ask
				: legs[0].contract.strike - legs[0].contract.bid
			: null;

	function formatK(n: number) {
		if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
		return n.toFixed(0);
	}

	function expiryLabel(e: string) {
		const d = new Date(e);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
	}

	function expiryDTE(e: string) {
		return Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000));
	}
</script>

<!--
	touch-action: pan-y  → allows vertical scrolling only; prevents browser
	pinch-zoom from hijacking two-finger gestures on the chain.
	overflow-hidden on the outer shell + overflow-y-auto on the scroll region
	means the page itself never scrolls — only the chain list does.
-->
{#if !$demoFixturesEnabled}
	<div class="flex h-full items-center justify-center px-4 text-center text-2xs text-terminal-text-muted">
		Options markets are unavailable until an authoritative venue feed is connected.
	</div>
{:else}
<div class="flex flex-col h-full bg-terminal-bg overflow-hidden" style="touch-action: pan-y;">

	<!-- Stats bar -->
	<div class="h-9 bg-terminal-bg-secondary border-b border-terminal-border flex items-center px-3 gap-4 overflow-x-auto scrollbar-none flex-shrink-0">
		<div class="flex flex-col leading-none flex-shrink-0">
			<span class="text-3xs text-terminal-text-muted">Spot</span>
			<span class="text-2xs font-mono font-semibold text-terminal-cyan">${$optionChain.spotPrice.toLocaleString()}</span>
		</div>
		<div class="h-3 w-px bg-terminal-border flex-shrink-0"></div>
		<div class="flex flex-col leading-none flex-shrink-0">
			<span class="text-3xs text-terminal-text-muted">OPT VLM</span>
			<span class="text-2xs font-mono text-terminal-text">1.48M</span>
		</div>
		<div class="flex flex-col leading-none flex-shrink-0">
			<span class="text-3xs text-terminal-text-muted">IV Last</span>
			<span class="text-2xs font-mono text-terminal-text">48.8%</span>
		</div>
		<div class="flex flex-col leading-none flex-shrink-0">
			<span class="text-3xs text-terminal-text-muted">IV/Hist</span>
			<span class="text-2xs font-mono text-terminal-text">96.9%</span>
		</div>
		<!-- Strategy Builder button -->
		<button
			class="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-terminal-bg-tertiary border border-terminal-border rounded text-2xs font-medium text-terminal-text hover:border-terminal-cyan/50 hover:text-terminal-cyan transition-colors flex-shrink-0"
			onclick={() => (showStrategyBuilder = true)}
		>
			<SlidersHorizontal class="w-3 h-3" />
			Strategies
		</button>
	</div>

	<!-- Expiry tabs -->
	<div class="h-10 bg-terminal-bg-secondary border-b border-terminal-border flex items-end px-2 gap-0.5 overflow-x-auto scrollbar-none flex-shrink-0">
		{#each $optionChain.expiries.slice(0, 7) as expiry}
			{@const dte = expiryDTE(expiry)}
			{@const active = $selectedExpiry === expiry}
			<button
				class="flex flex-col items-center pb-1.5 px-2.5 flex-shrink-0 border-b-2 transition-colors
					{active ? 'border-terminal-cyan text-terminal-text' : 'border-transparent text-terminal-text-muted'}"
				onclick={() => selectedExpiry.set(expiry)}
			>
				<span class="text-2xs font-semibold whitespace-nowrap leading-none">{expiryLabel(expiry)}</span>
				<span class="text-3xs leading-none mt-0.5 {active ? 'text-terminal-cyan' : 'text-terminal-text-muted'}">{dte}d</span>
			</button>
		{/each}
	</div>

	<!--
		Column layout: 7 equal columns across the full width.
		  col 1-3 = Calls (OI | Bid | Ask)
		  col 4   = Strike (slightly wider via 1.4fr for readability)
		  col 5-7 = Puts  (Bid | Ask | OI)
		All widths use fr units — no fixed px — so they fill the screen evenly.
	-->
	<div class="flex-shrink-0 bg-terminal-bg-secondary border-b border-terminal-border">
		<!-- Section labels -->
		<div class="grid text-3xs font-semibold uppercase tracking-wide" style="grid-template-columns: 1fr 1fr 1fr 1.4fr 1fr 1fr 1fr;">
			<div class="col-span-3 text-center py-1 text-terminal-green/70 border-r border-terminal-border/30">Calls</div>
			<div class="text-center py-1 text-terminal-text-muted"></div>
			<div class="col-span-3 text-center py-1 text-terminal-red/70 border-l border-terminal-border/30">Puts</div>
		</div>
		<!-- Column headers -->
		<div class="grid text-3xs text-terminal-text-muted font-medium border-t border-terminal-border/20" style="grid-template-columns: 1fr 1fr 1fr 1.4fr 1fr 1fr 1fr;">
			<div class="text-right pr-1.5 py-1 text-terminal-green/60">OI</div>
			<div class="text-right pr-1.5 py-1 text-terminal-green/60">Bid</div>
			<div class="text-right pr-1.5 py-1 text-terminal-green/60 border-r border-terminal-border/30">Ask</div>
			<div class="text-center px-1 py-1 text-terminal-text">Strike</div>
			<div class="text-left pl-1.5 py-1 text-terminal-red/60 border-l border-terminal-border/30">Bid</div>
			<div class="text-left pl-1.5 py-1 text-terminal-red/60">Ask</div>
			<div class="text-left pl-1.5 py-1 text-terminal-red/60">OI</div>
		</div>
	</div>

	<!-- Chain rows — scrollable, no pinch zoom -->
	<div class="flex-1 overflow-y-auto overscroll-contain" style="touch-action: pan-y; -webkit-overflow-scrolling: touch;">
		{#each sortedStrikes as strike (strike)}
			{@const g = groupedByStrike[strike]}
			{@const call = g?.call ?? null}
			{@const put = g?.put ?? null}
			{@const isATM = strike === atmStrike}
			{@const callITM = strike < $optionChain.spotPrice}
			{@const putITM = strike > $optionChain.spotPrice}

			{#if isATM}
				<div class="flex items-center gap-2 px-3 py-1 bg-terminal-cyan/5 border-y border-terminal-cyan/25 flex-shrink-0">
					<div class="flex-1 h-px bg-terminal-cyan/30"></div>
					<span class="text-2xs font-mono font-bold text-terminal-cyan whitespace-nowrap">
						{$optionChain.spotPrice.toLocaleString()}
					</span>
					<div class="flex-1 h-px bg-terminal-cyan/30"></div>
				</div>
			{/if}

			<div
				class="grid border-b border-terminal-border/25"
				style="grid-template-columns: 1fr 1fr 1fr 1.4fr 1fr 1fr 1fr; min-height: 42px;"
			>
				<!-- Call OI -->
				<div class="flex flex-col justify-center items-end pr-1.5 py-1 {callITM ? 'bg-terminal-green/5' : ''}">
					<span class="text-2xs font-mono text-terminal-text-muted">{call ? formatK(call.openInterest) : '—'}</span>
				</div>

				<!-- Call Bid → sell -->
				<button
					class="flex flex-col justify-center items-end pr-1.5 py-1 active:bg-terminal-green/20 transition-colors
						{callITM ? 'bg-terminal-green/5' : ''}
						{hasLeg(call, 'sell') ? 'ring-1 ring-inset ring-terminal-green bg-terminal-green/20' : ''}"
					onclick={() => addLeg(call, 'sell')}
					tabindex="-1"
				>
					<span class="text-xs font-mono font-semibold text-terminal-green">{call ? call.bid.toFixed(1) : '—'}</span>
					<span class="text-3xs text-terminal-text-muted">{call ? `${call.iv.toFixed(0)}%` : ''}</span>
				</button>

				<!-- Call Ask → buy -->
				<button
					class="flex flex-col justify-center items-end pr-1.5 py-1 active:bg-terminal-red/20 transition-colors border-r border-terminal-border/30
						{callITM ? 'bg-terminal-green/5' : ''}
						{hasLeg(call, 'buy') ? 'ring-1 ring-inset ring-terminal-red bg-terminal-red/15' : ''}"
					onclick={() => addLeg(call, 'buy')}
					tabindex="-1"
				>
					<span class="text-xs font-mono font-semibold text-terminal-red">{call ? call.ask.toFixed(1) : '—'}</span>
					<span class="text-3xs text-terminal-text-muted">{call ? `${(call.iv + 0.5).toFixed(0)}%` : ''}</span>
				</button>

				<!-- Strike center column -->
				<div class="flex flex-col justify-center items-center px-1 bg-terminal-bg-tertiary border-x border-terminal-border/30">
					<span class="text-2xs font-mono font-bold {isATM ? 'text-terminal-cyan' : 'text-terminal-text'} leading-none">
						{strike >= 1000 ? `${(strike / 1000).toFixed(0)}K` : strike}
					</span>
					{#if call}
						<span class="text-3xs text-terminal-text-muted leading-none mt-0.5">{call.iv.toFixed(0)}%</span>
					{/if}
				</div>

				<!-- Put Bid → sell -->
				<button
					class="flex flex-col justify-center items-start pl-1.5 py-1 active:bg-terminal-green/20 transition-colors border-l border-terminal-border/30
						{putITM ? 'bg-terminal-red/5' : ''}
						{hasLeg(put, 'sell') ? 'ring-1 ring-inset ring-terminal-green bg-terminal-green/20' : ''}"
					onclick={() => addLeg(put, 'sell')}
					tabindex="-1"
				>
					<span class="text-xs font-mono font-semibold text-terminal-green">{put ? put.bid.toFixed(1) : '—'}</span>
					<span class="text-3xs text-terminal-text-muted">{put ? `${put.iv.toFixed(0)}%` : ''}</span>
				</button>

				<!-- Put Ask → buy -->
				<button
					class="flex flex-col justify-center items-start pl-1.5 py-1 active:bg-terminal-red/20 transition-colors
						{putITM ? 'bg-terminal-red/5' : ''}
						{hasLeg(put, 'buy') ? 'ring-1 ring-inset ring-terminal-red bg-terminal-red/15' : ''}"
					onclick={() => addLeg(put, 'buy')}
					tabindex="-1"
				>
					<span class="text-xs font-mono font-semibold text-terminal-red">{put ? put.ask.toFixed(1) : '—'}</span>
					<span class="text-3xs text-terminal-text-muted">{put ? `${(put.iv + 0.5).toFixed(0)}%` : ''}</span>
				</button>

				<!-- Put OI -->
				<div class="flex flex-col justify-center items-start pl-1.5 py-1 {putITM ? 'bg-terminal-red/5' : ''}">
					<span class="text-2xs font-mono text-terminal-text-muted">{put ? formatK(put.openInterest) : '—'}</span>
				</div>
			</div>
		{/each}
		<!-- Spacer so last row clears the sticky order bar -->
		<div class="h-24"></div>
	</div>

	<!-- Sticky bottom order bar -->
	{#if legs.length > 0}
		<div class="flex-shrink-0 border-t border-terminal-border bg-terminal-bg-panel flex items-center px-4 py-3 gap-3">
			<div class="flex-1 min-w-0">
				<div class="text-xs font-semibold text-terminal-text">{legs.length} Leg{legs.length > 1 ? 's' : ''}</div>
				{#if breakEven}
					<div class="text-2xs text-terminal-text-muted">Break Even: ${breakEven.toFixed(0)}</div>
				{/if}
			</div>
			<button
				class="text-2xs text-terminal-text-muted underline underline-offset-2 flex-shrink-0"
				onclick={() => { legs = []; }}
			>Clear</button>
			<button
				class="px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex-shrink-0
					{netDebit >= 0 ? 'bg-terminal-red text-white' : 'bg-terminal-green text-terminal-bg'}"
				onclick={() => dispatch('order', { legs, netDebit })}
			>
				Order {netDebit >= 0 ? '-' : '+'}${Math.abs(netDebit).toFixed(2)}
			</button>
		</div>
	{/if}
</div>
{/if}

<!-- Strategy Builder modal (same component as desktop) -->
<StrategyBuilder bind:isOpen={showStrategyBuilder} />
