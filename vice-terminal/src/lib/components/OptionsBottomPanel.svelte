<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { positions, openOrders, fills, portfolioGreeks, demoFixturesEnabled } from '$lib/stores';
	import type { OptionContract } from '$lib/types';
	import { X, ArrowUpRight, ArrowDownRight } from 'lucide-svelte';

	export let spreadLegs: { contract: OptionContract; side: 'buy' | 'sell'; quantity: number }[] = [];
	export let spreadNetDebit: number = 0;

	const dispatch = createEventDispatcher();

	let activeTab: 'positions' | 'orders' | 'history' | 'greeks' | 'spread' = 'positions';

	// Filter to only show options positions
	$: optionPositions = $positions.filter(p => p.market.includes('-C') || p.market.includes('-P'));

	// Calculate spread greeks
	$: spreadGreeks = {
		delta: spreadLegs.reduce((sum, leg) => sum + leg.contract.delta * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0),
		gamma: spreadLegs.reduce((sum, leg) => sum + leg.contract.gamma * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0),
		theta: spreadLegs.reduce((sum, leg) => sum + leg.contract.theta * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0),
		vega: spreadLegs.reduce((sum, leg) => sum + leg.contract.vega * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0)
	};
</script>

{#if !$demoFixturesEnabled}
	<div class="h-full flex items-center justify-center px-4 text-center text-2xs text-terminal-text-muted">
		Options account data is unavailable until an authoritative venue feed is connected.
	</div>
{:else}
<div class="h-full flex flex-col">
	<!-- Tabs - Deribit style -->
	<div class="h-8 border-b border-terminal-border flex items-center px-2 gap-1 bg-terminal-bg">
		<button
			class="terminal-tab {activeTab === 'positions' ? 'terminal-tab-active' : ''}"
			onclick={() => activeTab = 'positions'}
		>
			Positions <span class="text-terminal-text-muted ml-1">{optionPositions.length}</span>
		</button>
		<button
			class="terminal-tab {activeTab === 'orders' ? 'terminal-tab-active' : ''}"
			onclick={() => activeTab = 'orders'}
		>
			Open Orders <span class="text-terminal-text-muted ml-1">{$openOrders.length}</span>
		</button>
		<button
			class="terminal-tab {activeTab === 'history' ? 'terminal-tab-active' : ''}"
			onclick={() => activeTab = 'history'}
		>
			Trade History
		</button>
		<button
			class="terminal-tab {activeTab === 'greeks' ? 'terminal-tab-active' : ''}"
			onclick={() => activeTab = 'greeks'}
		>
			Expiry Greeks
		</button>
		{#if spreadLegs.length > 0}
			<button
				class="terminal-tab {activeTab === 'spread' ? 'bg-terminal-cyan/20 text-terminal-cyan' : 'text-terminal-cyan'}"
				onclick={() => activeTab = 'spread'}
			>
				Spread Builder <span class="bg-terminal-cyan/30 px-1.5 rounded text-2xs ml-1">{spreadLegs.length}</span>
			</button>
		{/if}

		<!-- Asset Filters (Deribit style) -->
		<div class="flex items-center gap-1 ml-4">
			<button class="px-2 py-0.5 text-2xs rounded bg-terminal-bg-tertiary text-terminal-text">All</button>
			<button class="px-2 py-0.5 text-2xs rounded text-terminal-yellow hover:bg-terminal-yellow/10 flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-terminal-yellow"></span> BTC
			</button>
			<button class="px-2 py-0.5 text-2xs rounded text-terminal-blue hover:bg-terminal-blue/10 flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-terminal-blue"></span> ETH
			</button>
		</div>

		<!-- Quick filters -->
		<div class="flex items-center gap-1 ml-auto">
			<button class="px-2 py-0.5 text-2xs rounded border border-terminal-border text-terminal-text-secondary hover:text-terminal-text">Futures</button>
			<button class="px-2 py-0.5 text-2xs rounded bg-terminal-bg-tertiary text-terminal-text border border-terminal-border">Options</button>
			<button class="px-2 py-0.5 text-2xs rounded border border-terminal-border text-terminal-text-secondary hover:text-terminal-text">No grouping</button>
		</div>
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-auto">
		{#if activeTab === 'positions'}
			<!-- Positions Table -->
			<table class="w-full text-2xs">
				<thead class="sticky top-0 bg-terminal-bg-secondary">
					<tr class="text-terminal-text-muted uppercase tracking-wide">
						<th class="cell-sm text-left font-normal border-b border-terminal-border">Instrument</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">Amount</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">Value</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">Avg. Price</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">Mark Price</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">ELP</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">RSPL</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">USPL</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">PNL</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">ROI</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">IM</th>
						<th class="cell-sm text-right font-normal border-b border-terminal-border">MM</th>
					</tr>
				</thead>
				<tbody>
					{#each optionPositions as position}
						<tr class="hover:bg-terminal-bg-hover transition-colors">
							<td class="cell-sm text-left font-mono border-b border-terminal-border/30 text-terminal-cyan">{position.market}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 {position.side === 'long' ? 'text-terminal-green' : 'text-terminal-red'}">
								{position.side === 'long' ? '+' : '-'}{position.size}
							</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30">${(position.size * position.markPrice).toFixed(2)}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30">${position.entryPrice.toFixed(2)}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30">${position.markPrice.toFixed(2)}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 {(position.delta ?? 0) >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{(position.delta ?? 0).toFixed(3)}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 text-terminal-text-muted">{(position.gamma ?? 0).toFixed(4)}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 text-terminal-red">{(position.theta ?? 0).toFixed(2)}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 {position.unrealizedPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
								${position.unrealizedPnl.toFixed(2)}
							</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 {position.unrealizedPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
								{position.unrealizedPnl >= 0 ? '+' : ''}{((position.unrealizedPnl / (position.entryPrice * position.size || 1)) * 100).toFixed(1)}%
							</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 text-terminal-text-muted">{(position.vega ?? 0).toFixed(2)}</td>
							<td class="cell-sm text-right font-mono border-b border-terminal-border/30 text-terminal-text-muted">-</td>
						</tr>
					{:else}
						<tr>
							<td colspan="12" class="py-8 text-center text-terminal-text-muted">
								No options positions. Click on bid/ask prices in the chain to trade.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

		{:else if activeTab === 'greeks'}
			<!-- Portfolio Greeks Summary -->
			<div class="p-4">
				<div class="grid grid-cols-4 gap-4 mb-6">
					<div class="bg-terminal-bg rounded-lg p-4 border border-terminal-border">
						<div class="text-2xs text-terminal-text-muted uppercase mb-1">Total Delta</div>
						<div class="text-xl font-mono font-semibold {$portfolioGreeks.totalDelta >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
							{$portfolioGreeks.totalDelta >= 0 ? '+' : ''}{$portfolioGreeks.totalDelta.toFixed(3)}
						</div>
						<div class="text-2xs text-terminal-text-muted mt-1">BTC equivalent exposure</div>
					</div>
					<div class="bg-terminal-bg rounded-lg p-4 border border-terminal-border">
						<div class="text-2xs text-terminal-text-muted uppercase mb-1">Total Gamma</div>
						<div class="text-xl font-mono font-semibold text-terminal-purple">
							{$portfolioGreeks.totalGamma.toFixed(5)}
						</div>
						<div class="text-2xs text-terminal-text-muted mt-1">Per 1% move</div>
					</div>
					<div class="bg-terminal-bg rounded-lg p-4 border border-terminal-border">
						<div class="text-2xs text-terminal-text-muted uppercase mb-1">Total Theta</div>
						<div class="text-xl font-mono font-semibold text-terminal-red">
							${$portfolioGreeks.totalTheta.toFixed(2)}
						</div>
						<div class="text-2xs text-terminal-text-muted mt-1">Daily decay</div>
					</div>
					<div class="bg-terminal-bg rounded-lg p-4 border border-terminal-border">
						<div class="text-2xs text-terminal-text-muted uppercase mb-1">Total Vega</div>
						<div class="text-xl font-mono font-semibold text-terminal-blue">
							${$portfolioGreeks.totalVega.toFixed(2)}
						</div>
						<div class="text-2xs text-terminal-text-muted mt-1">Per 1% IV change</div>
					</div>
				</div>

				<!-- Expiry Breakdown -->
				<div class="text-xs font-medium mb-2">Greeks by Expiry</div>
				<table class="w-full text-2xs">
					<thead>
						<tr class="text-terminal-text-muted uppercase">
							<th class="cell-sm text-left font-normal border-b border-terminal-border">Expiry</th>
							<th class="cell-sm text-right font-normal border-b border-terminal-border">Delta</th>
							<th class="cell-sm text-right font-normal border-b border-terminal-border">Gamma</th>
							<th class="cell-sm text-right font-normal border-b border-terminal-border">Theta</th>
							<th class="cell-sm text-right font-normal border-b border-terminal-border">Vega</th>
						</tr>
					</thead>
					<tbody>
						{#each $portfolioGreeks.byExpiry as expiry}
							<tr class="hover:bg-terminal-bg-hover">
								<td class="cell-sm text-left font-medium border-b border-terminal-border/30">{expiry.expiry}</td>
								<td class="cell-sm text-right font-mono border-b border-terminal-border/30 {expiry.delta >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
									{expiry.delta >= 0 ? '+' : ''}{expiry.delta.toFixed(3)}
								</td>
								<td class="cell-sm text-right font-mono border-b border-terminal-border/30">{expiry.gamma.toFixed(5)}</td>
								<td class="cell-sm text-right font-mono border-b border-terminal-border/30 text-terminal-red">${expiry.theta.toFixed(2)}</td>
								<td class="cell-sm text-right font-mono border-b border-terminal-border/30">${expiry.vega.toFixed(2)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

		{:else if activeTab === 'spread'}
			<!-- Spread Builder -->
			<div class="p-4">
				<div class="flex items-center justify-between mb-4">
					<div class="text-sm font-medium">Spread Builder</div>
					<button
						class="text-2xs text-terminal-red hover:underline"
						onclick={() => dispatch('clearSpread')}
					>Clear All</button>
				</div>

				{#if spreadLegs.length > 0}
					<table class="w-full text-2xs mb-4">
						<thead>
							<tr class="text-terminal-text-muted uppercase">
								<th class="cell-sm text-left font-normal border-b border-terminal-border">Side</th>
								<th class="cell-sm text-left font-normal border-b border-terminal-border">Contract</th>
								<th class="cell-sm text-right font-normal border-b border-terminal-border">Qty</th>
								<th class="cell-sm text-right font-normal border-b border-terminal-border">Price</th>
								<th class="cell-sm text-right font-normal border-b border-terminal-border">Delta</th>
								<th class="cell-sm text-center font-normal border-b border-terminal-border"></th>
							</tr>
						</thead>
						<tbody>
							{#each spreadLegs as leg, i}
								<tr class="hover:bg-terminal-bg-hover">
									<td class="cell-sm text-left font-medium border-b border-terminal-border/30 {leg.side === 'buy' ? 'text-terminal-green' : 'text-terminal-red'} uppercase">
										{leg.side}
									</td>
									<td class="cell-sm text-left font-mono border-b border-terminal-border/30">{leg.contract.symbol}</td>
									<td class="cell-sm text-right font-mono border-b border-terminal-border/30">{leg.quantity}</td>
									<td class="cell-sm text-right font-mono border-b border-terminal-border/30">
										${leg.side === 'buy' ? leg.contract.ask.toFixed(2) : leg.contract.bid.toFixed(2)}
									</td>
									<td class="cell-sm text-right font-mono border-b border-terminal-border/30">
										{(leg.contract.delta * (leg.side === 'buy' ? 1 : -1)).toFixed(3)}
									</td>
									<td class="cell-sm text-center border-b border-terminal-border/30">
										<button
											class="text-terminal-text-muted hover:text-terminal-red"
											onclick={() => dispatch('removeFromSpread', i)}
										>
											<X class="w-3 h-3" />
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>

					<!-- Spread Summary -->
					<div class="bg-terminal-bg rounded-lg p-4 border border-terminal-border">
						<div class="grid grid-cols-5 gap-4 mb-4">
							<div>
								<div class="text-2xs text-terminal-text-muted uppercase mb-1">Net Cost</div>
								<div class="font-mono font-semibold {spreadNetDebit > 0 ? 'text-terminal-red' : 'text-terminal-green'}">
									${Math.abs(spreadNetDebit).toFixed(2)} {spreadNetDebit > 0 ? 'debit' : 'credit'}
								</div>
							</div>
							<div>
								<div class="text-2xs text-terminal-text-muted uppercase mb-1">Net Delta</div>
								<div class="font-mono font-semibold">{spreadGreeks.delta.toFixed(3)}</div>
							</div>
							<div>
								<div class="text-2xs text-terminal-text-muted uppercase mb-1">Net Gamma</div>
								<div class="font-mono font-semibold">{spreadGreeks.gamma.toFixed(5)}</div>
							</div>
							<div>
								<div class="text-2xs text-terminal-text-muted uppercase mb-1">Net Theta</div>
								<div class="font-mono font-semibold text-terminal-red">${spreadGreeks.theta.toFixed(2)}</div>
							</div>
							<div>
								<div class="text-2xs text-terminal-text-muted uppercase mb-1">Net Vega</div>
								<div class="font-mono font-semibold">${spreadGreeks.vega.toFixed(2)}</div>
							</div>
						</div>

						<button class="w-full py-2 bg-terminal-green text-terminal-bg font-medium text-sm rounded hover:bg-terminal-green-dim transition-colors">
							Execute Spread Trade
						</button>
					</div>
				{:else}
					<div class="text-center text-terminal-text-muted py-8">
						Click bid (sell) or ask (buy) prices in the options chain to build a spread.
					</div>
				{/if}
			</div>

		{:else}
			<!-- Other tabs placeholder -->
			<div class="flex items-center justify-center h-full text-terminal-text-muted">
				No data available
			</div>
		{/if}
	</div>
</div>
{/if}
