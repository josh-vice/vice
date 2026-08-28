<script lang="ts">
	import { formatPrice, formatVolume } from '$lib/format';
	import { topMarketMovers, type MarketMoverDirection } from '$lib/marketMovers';
	import { marketCatalogStatus, marketRegistry, selectMarket } from '$lib/stores';
	import { nativeWidgetPorts } from '$lib/suite/widgets';

	const port = nativeWidgetPorts.vMovers;
	let direction: MarketMoverDirection = 'gainers';
	let limit = 15;

	$: rows = topMarketMovers($marketRegistry, direction, limit);
	$: unavailable = $marketCatalogStatus === 'error' || $marketCatalogStatus === 'offline';
</script>

<main data-testid="native-market-movers-port" class="min-h-screen bg-terminal-bg px-4 py-5 text-terminal-text sm:px-6">
	<header class="mx-auto flex max-w-4xl items-center justify-between gap-4 border-b border-terminal-border pb-4">
		<div><p class="text-3xs font-semibold uppercase tracking-[0.2em] text-terminal-cyan">Native widget port · {port.story}</p><h1 class="mt-1 text-xl font-semibold">{port.title}</h1></div>
		<a data-action-id="ui.src.lib.components.nativemarketmoversport.a.h3836092ff6" href="/hub" class="rounded border border-terminal-border px-3 py-2 text-xs text-terminal-text-secondary hover:border-terminal-cyan hover:text-terminal-cyan">Open preserved Hub</a>
	</header>

	<section class="mx-auto max-w-4xl py-5">
		<div class="overflow-hidden rounded border border-terminal-border bg-terminal-bg-panel">
			<div class="flex flex-wrap items-center gap-2 border-b border-terminal-border px-3 py-2">
				<div class="flex rounded border border-terminal-border p-0.5 text-2xs">
					<button data-action-id="ui.src.lib.components.nativemarketmoversport.button.h649df4e90c" aria-pressed={direction === 'gainers'} class="rounded px-2 py-1 {direction === 'gainers' ? 'bg-terminal-green-bg text-terminal-green' : 'text-terminal-text-muted hover:text-terminal-text'}" onclick={() => (direction = 'gainers')}>Gainers</button>
					<button data-action-id="ui.src.lib.components.nativemarketmoversport.button.h0dbb5a8463" aria-pressed={direction === 'losers'} class="rounded px-2 py-1 {direction === 'losers' ? 'bg-terminal-red-bg text-terminal-red' : 'text-terminal-text-muted hover:text-terminal-text'}" onclick={() => (direction = 'losers')}>Losers</button>
				</div>
				<label class="ml-auto flex items-center gap-1.5 text-3xs text-terminal-text-muted">Rows
					<select data-action-id="ui.src.lib.components.nativemarketmoversport.select.hcb7a55dfd5" aria-label="Mover rows" bind:value={limit} class="rounded border border-terminal-border bg-terminal-bg px-1 py-1 text-2xs text-terminal-text">
						<option value={10}>10</option><option value={15}>15</option><option value={25}>25</option>
					</select>
				</label>
			</div>
			<div class="grid grid-cols-[minmax(0,1fr)_7rem_5.5rem_6rem] border-b border-terminal-border px-3 py-2 text-3xs uppercase tracking-wide text-terminal-text-muted"><span>Market</span><span class="text-right">Price</span><span class="text-right">24h</span><span class="text-right">Volume</span></div>
			{#if unavailable}
				<p class="p-6 text-center text-sm text-terminal-red">Canonical Hyperliquid market data is unavailable. No mover ranking is shown.</p>
			{:else if rows.length === 0}
				<p class="p-6 text-center text-sm text-terminal-text-muted">Waiting for canonical, priceable Hyperliquid markets…</p>
			{:else}
				<div class="divide-y divide-terminal-border">
					{#each rows as market (market.marketKey)}
						<button data-action-id="ui.src.lib.components.nativemarketmoversport.button.h553ae75163" class="grid w-full grid-cols-[minmax(0,1fr)_7rem_5.5rem_6rem] items-center px-3 py-2 text-left hover:bg-terminal-bg-hover focus-visible:bg-terminal-bg-hover" onclick={() => selectMarket(market)} title={`Select ${market.symbol} in Trade`}>
							<span class="min-w-0 truncate text-sm font-medium">{market.symbol}</span>
							<span class="text-right font-mono text-xs tabular-nums">{formatPrice(market.lastPrice, market.lastPrice < 1 ? 4 : 2)}</span>
							<span class="text-right font-mono text-xs tabular-nums {market.changePercent24h >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{market.changePercent24h >= 0 ? '+' : ''}{market.changePercent24h.toFixed(2)}%</span>
							<span class="text-right font-mono text-2xs tabular-nums text-terminal-text-secondary">{formatVolume(market.volume24h)}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<p class="mt-3 text-xs leading-5 text-terminal-text-muted">{port.provenance}. Ranking uses the shared live registry's venue-provided 24-hour context and changes the selected exact descriptor only. No second feed, account, signer, order, or execution path is created.</p>
	</section>
</main>
