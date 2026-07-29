<script lang="ts">
	import { marketDataStatus, recentTrades, selectedMarket } from '$lib/stores';
	import { formatPrice, formatSize, formatTime } from '$lib/format';
	import { unavailableFeedMessage, healthLabel } from '$lib/productionTruth';
	import { filterTradesByMinimumNotional } from '$lib/tradeTape';

	$: baseAsset = $selectedMarket?.baseToken ?? 'Asset';
	$: quoteAsset = $selectedMarket?.quoteToken ?? 'USD';
	let minimumNotional = 0;
	$: visibleTrades = filterTradesByMinimumNotional($recentTrades, minimumNotional);
	$: filterHidesAllTrades = $recentTrades.length > 0 && visibleTrades.length === 0;

</script>

	<div data-testid="recent-trades" data-feed-status={$marketDataStatus} data-row-count={visibleTrades.length} data-unfiltered-row-count={$recentTrades.length} class="h-full flex flex-col bg-terminal-bg-panel" class:dither-stale={$recentTrades.length > 0 && ($marketDataStatus === 'stale' || $marketDataStatus === 'degraded' || $marketDataStatus === 'error')}>
	<div class="h-8 px-2 border-b border-terminal-border flex items-center text-2xs">
		<span class="text-terminal-text-secondary">Market trades</span>
		<span class="dither-rule mx-2 text-terminal-text-muted" aria-hidden="true"></span>
		<select aria-label="Minimum trade notional" bind:value={minimumNotional} class="ml-auto max-w-[86px] bg-terminal-bg-secondary text-3xs text-terminal-text-secondary outline-none">
			<option value={0}>All trades</option>
			<option value={1000}>≥ $1K</option>
			<option value={10000}>≥ $10K</option>
			<option value={100000}>≥ $100K</option>
		</select>
		{#if $marketDataStatus !== 'live'}<span class="ml-auto text-3xs text-terminal-yellow">{healthLabel($marketDataStatus)}</span>{/if}
	</div>
	{#if minimumNotional > 0}
		<div data-testid="trade-notional-filter" class="px-2 py-0.5 border-b border-terminal-border text-3xs text-terminal-cyan">Showing trades ≥ ${minimumNotional.toLocaleString()}</div>
	{/if}
	<div data-testid="trade-liquidation-source" class="px-2 py-0.5 border-b border-terminal-border text-3xs text-terminal-text-muted">
		Liquidation labels unavailable: Hyperliquid's public trades feed does not classify liquidation orders.
	</div>

	<div class="grid grid-cols-3 px-2 py-1 text-3xs text-terminal-text-muted border-b border-terminal-border">
		<div>Price ({quoteAsset})</div>
		<div class="text-right">Size ({baseAsset})</div>
		<div class="text-right">Time</div>
	</div>

	{#if visibleTrades.length > 0}
		<div data-testid="recent-trades-live" class="contents">
		<div class="flex-1 overflow-y-auto scrollbar-none">
			{#each visibleTrades as trade (trade.id)}
				<div class="grid grid-cols-3 px-2 py-0.5 text-2xs tabular-nums hover:bg-terminal-bg-hover/30 transition-colors">
					<div class="{trade.side === 'buy' ? 'text-terminal-green' : 'text-terminal-red'}">{formatPrice(trade.price)}</div>
					<div class="text-right text-terminal-text-secondary">{formatSize(trade.size)}</div>
					<div class="text-right text-terminal-text-muted text-3xs">{formatTime(trade.timestamp)}</div>
				</div>
			{/each}
		</div>
		</div>
	{:else if filterHidesAllTrades}
		<div data-testid="recent-trades-filter-empty" class="flex-1 flex items-center justify-center px-4 text-center text-2xs text-terminal-text-muted">
			No trades meet the active minimum notional filter
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center px-4 text-center text-2xs {$marketDataStatus === 'error' ? 'text-terminal-red' : 'text-terminal-text-muted'}">
			{unavailableFeedMessage('trades', $marketDataStatus)}
		</div>
	{/if}
</div>
