<script lang="ts">
	import { onMount } from 'svelte';
	import { type BlofinMarketDescriptor } from '$lib/blofin/public';
	import { fetchBlofinReviewCatalog } from '$lib/blofin/reviewCatalog';

	let markets: BlofinMarketDescriptor[] = [];
	let query = '';
	let loading = true;
	let errorMessage = '';
	const demo = import.meta.env.VITE_BLOFIN_ENV !== 'live';
	$: visibleMarkets = markets.filter((market) => `${market.instId} ${market.baseCurrency} ${market.quoteCurrency} ${market.assetClass}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 100);

	onMount(() => {
		void fetchBlofinReviewCatalog(fetch, demo)
			.then((result) => { markets = result; })
			.catch((error) => { errorMessage = error instanceof Error ? error.message : 'BloFin public catalog is unavailable'; })
			.finally(() => { loading = false; });
	});
</script>

<svelte:head><title>BloFin public-market review · Vice Terminal</title></svelte:head>

<main class="mx-auto min-h-screen max-w-6xl bg-terminal-bg px-4 py-8 text-terminal-text">
	<header class="mb-6 space-y-2">
		<p class="text-2xs uppercase tracking-[0.18em] text-terminal-yellow">Review only · {demo ? 'demo' : 'live'} public data</p>
		<h1 class="text-2xl font-semibold">BloFin futures catalog</h1>
		<p class="max-w-3xl text-sm text-terminal-text-muted">This page reads official public market metadata only. It has no wallet, API key, account, order, or transfer control. BloFin is not integrated into terminal trading.</p>
	</header>

	<label class="mb-4 block max-w-sm text-2xs text-terminal-text-muted">Filter exact instrument or asset
		<input aria-label="Filter BloFin public markets" bind:value={query} class="mt-1 w-full terminal-input px-2 py-1.5 text-sm" placeholder="BTC-USDT" />
	</label>

	{#if loading}
		<p data-testid="blofin-public-loading" class="text-sm text-terminal-text-muted">Loading official public catalog…</p>
	{:else if errorMessage}
		<p data-testid="blofin-public-error" class="rounded border border-terminal-red/30 bg-terminal-red/5 p-3 text-sm text-terminal-red">{errorMessage}</p>
	{:else}
		<p data-testid="blofin-public-summary" class="mb-3 text-2xs text-terminal-text-muted">{markets.length} validated markets; showing {visibleMarkets.length}. Prices are public reference data, not executable quotes.</p>
		<div class="overflow-x-auto rounded border border-terminal-border">
			<table class="min-w-full text-left text-xs">
				<thead class="bg-terminal-bg-secondary text-terminal-text-muted"><tr><th class="px-3 py-2">Instrument</th><th class="px-3 py-2 text-right">Last</th><th class="px-3 py-2">Type</th><th class="px-3 py-2 text-right">Tick</th><th class="px-3 py-2 text-right">Lot</th><th class="px-3 py-2 text-right">Max leverage</th></tr></thead>
				<tbody>{#each visibleMarkets as market (market.instId)}<tr class="border-t border-terminal-border/60"><td class="px-3 py-2 font-mono">{market.instId}</td><td class="px-3 py-2 text-right font-mono">{market.lastPrice}</td><td class="px-3 py-2">{market.contractType} · {market.assetClass}</td><td class="px-3 py-2 text-right font-mono">{market.tickSize}</td><td class="px-3 py-2 text-right font-mono">{market.lotSize}</td><td class="px-3 py-2 text-right font-mono">{market.maxLeverage}×</td></tr>{/each}</tbody>
			</table>
		</div>
	{/if}
</main>
