<script lang="ts">
	import { marketRegistry, marketType, marketDataStatus, marketCatalogStatus, searchQuery, selectedMarket, selectMarket, type HealthStatus } from '$lib/stores';
	import { clearPriceAlertNotice, createPriceAlert, priceAlertNotice, priceAlerts, removePriceAlert, type PriceAlertDirection } from '$lib/priceAlerts';
	import { formatPrice, formatVolume } from '$lib/format';
	import type { MarketDescriptor } from '$lib/types';
	import { buildMarketWatchlistGroups, marketMatchesWatchlistQuery, type MarketWatchlistGroup } from '$lib/marketWatchlist';
	import { Search, Star, ChevronDown, ChevronRight, AlertTriangle, Bell, X } from 'lucide-svelte';
	import { onMount } from 'svelte';

	type VirtualRow =
		| { kind: 'header'; key: string; group: MarketWatchlistGroup }
		| { kind: 'market'; key: string; market: MarketDescriptor };

	const ROW_HEIGHT = 28;
	const OVERSCAN = 8;
	let favorites = new Set<string>();
	let collapsed = new Set<string>();
	let scrollTop = 0;
	let viewportHeight = 400;
	let alertPrice = '';
	let alertDirection: PriceAlertDirection = 'above';
	let alertError = '';

	onMount(() => {
		try {
			favorites = new Set(JSON.parse(localStorage.getItem('vice.marketFavorites') ?? '[]'));
			collapsed = new Set(JSON.parse(localStorage.getItem('vice.marketSections') ?? '[]'));
		} catch {
			favorites = new Set();
			collapsed = new Set();
		}
	});

	function persist() {
		localStorage.setItem('vice.marketFavorites', JSON.stringify([...favorites]));
		localStorage.setItem('vice.marketSections', JSON.stringify([...collapsed]));
	}

	function toggleFavorite(event: MouseEvent, market: MarketDescriptor) {
		event.stopPropagation();
		const next = new Set(favorites);
		if (next.has(market.marketKey)) next.delete(market.marketKey);
		else next.add(market.marketKey);
		favorites = next;
		persist();
	}

	function toggleGroup(id: string) {
		const next = new Set(collapsed);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		collapsed = next;
		persist();
	}

	function selectFromKeyboard(event: KeyboardEvent, market: MarketDescriptor) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		selectMarket(market);
	}

	function addAlert() {
		const result = createPriceAlert($selectedMarket, alertDirection, Number(alertPrice));
		if (!result.ok) {
			alertError = result.error;
			return;
		}
		alertPrice = '';
		alertError = '';
	}

	function statusMessage(status: HealthStatus): string {
		if (query) return 'No markets match this search.';
		if (cachedVisibleMarkets.length === 0) {
			if (status === 'connecting') return 'Catalog is loading this product class…';
			if (status === 'error') return 'Market catalog failed to load.';
			if (status === 'stale') return 'No markets in this product class; cached catalog is stale.';
			return 'No markets in this product class.';
		}
		if (status === 'connecting') return 'Loading market catalog…';
		if (status === 'degraded') return 'Partial market catalog; retrying missing sections…';
		if (status === 'error') return 'Market catalog unavailable.';
		if (status === 'stale') return 'Showing stale cached catalog.';
		return 'No markets available.';
	}

	$: query = $searchQuery.trim().toLowerCase();

	// $marketRegistry mutates each market's price/change fields in place many
	// times a second (allMids ticks) and re-notifies on the same array
	// reference; membership (which markets exist, matched search, favorited,
	// collapsed) only actually changes on catalog refresh or explicit user
	// action. Gating the filter/group/flatMap pipeline on that membership key
	// avoids re-running it on every price tick; rows is still re-sliced every
	// tick (cheap) so the visible window's price bindings keep refreshing.
	let groupingKey = '';
	let cachedRegistry: MarketDescriptor[] | null = null;
	let cachedVisibleMarkets: MarketDescriptor[] = [];
	let cachedTotalVolume = 0;
	let cachedHasVolume = false;
	let groupedRows: VirtualRow[] = [];

	$: {
		const key = `${$marketType}:${query}:${$marketRegistry.map((market) => market.marketKey).join(',')}:${[...favorites].sort().join(',')}:${[...collapsed].sort().join(',')}`;
		if ($marketRegistry !== cachedRegistry || key !== groupingKey) {
			cachedRegistry = $marketRegistry;
			groupingKey = key;
			scrollTop = 0;
			cachedVisibleMarkets = $marketRegistry.filter((market) => {
				const matchesType = $marketType === 'spot'
					? market.kind === 'spot'
					: $marketType === 'prediction'
						? market.kind === 'outcome'
						: market.kind === 'corePerp' || market.kind === 'hip3Perp';
				return matchesType && marketMatchesWatchlistQuery(market, query);
			});
			cachedHasVolume = cachedVisibleMarkets.some((market) => market.volume24h !== undefined);
			cachedTotalVolume = cachedVisibleMarkets.reduce((sum, market) => sum + (market.volume24h ?? 0), 0);
			const marketGroups = buildMarketWatchlistGroups(cachedVisibleMarkets, favorites);
			groupedRows = marketGroups.flatMap<VirtualRow>((group) => [
				{ kind: 'header', key: `header:${group.id}`, group },
				...(collapsed.has(group.id)
					? []
					: group.markets.map((market) => ({ kind: 'market' as const, key: `${group.id}:${market.marketKey}`, market })))
			]);
		}
	}

	// Re-slice every tick: $marketRegistry is referenced here (not just
	// groupedRows) so this reassigns and re-renders the visible rows' price
	// bindings from the mutated market objects without rerunning the gated
	// pipeline above.
	function rowsWithLivePrices(_registry: unknown, source: VirtualRow[]): VirtualRow[] {
		return source;
	}
	$: rows = rowsWithLivePrices($marketRegistry, groupedRows);
	$: startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
	$: endIndex = Math.min(rows.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);
	$: virtualRows = rows.slice(startIndex, endIndex);
	$: topSpacer = startIndex * ROW_HEIGHT;
	$: bottomSpacer = Math.max(0, (rows.length - endIndex) * ROW_HEIGHT);
</script>

	<div class="h-full flex flex-col bg-terminal-bg-panel">
	<div class="h-9 flex items-center px-3 border-b border-terminal-border text-xs font-medium">Markets</div>
	{#if $marketCatalogStatus === 'degraded'}
		<div class="px-2 py-1 text-3xs text-terminal-yellow border-b border-terminal-border">Some Hyperliquid market sections are unavailable; catalog retrying</div>
	{/if}
	<div class="p-2 border-b border-terminal-border">
		<div class="flex items-center gap-1.5 px-2 py-1 bg-terminal-bg rounded border border-terminal-border focus-within:border-terminal-cyan/50">
			<Search class="w-3 h-3 text-terminal-text-muted" />
			<label for="market-search" class="sr-only">Search markets</label>
			<input id="market-search" type="text" placeholder="Search market, class, category, or DEX" bind:value={$searchQuery} class="flex-1 bg-transparent text-2xs outline-none min-w-0" />
		</div>
		<div class="mt-1.5 flex gap-1">
			<select aria-label="Price alert direction" bind:value={alertDirection} class="w-[72px] bg-terminal-bg rounded border border-terminal-border px-1 text-3xs">
				<option value="above">Above</option>
				<option value="below">Below</option>
			</select>
			<input aria-label="Price alert threshold" type="number" min="0" step="any" placeholder={$selectedMarket ? `Alert ${$selectedMarket.symbol}` : 'Select a market'} bind:value={alertPrice} class="min-w-0 flex-1 bg-terminal-bg rounded border border-terminal-border px-2 text-3xs outline-none focus:border-terminal-cyan/50" />
			<button class="flex items-center gap-1 rounded border border-terminal-border px-1.5 text-3xs text-terminal-text-secondary hover:text-terminal-cyan disabled:opacity-50" onclick={addAlert} disabled={!$selectedMarket} title="Create local price alert"><Bell class="w-3 h-3" />Add</button>
		</div>
		{#if alertError}<div class="mt-1 text-3xs text-terminal-red">{alertError}</div>{/if}
		{#if $priceAlertNotice}
			<div class="mt-1 flex items-center gap-1 rounded border border-terminal-cyan/40 bg-terminal-cyan/10 px-1.5 py-1 text-3xs text-terminal-cyan" role="status">
				<Bell class="w-3 h-3" /><span class="min-w-0 flex-1 truncate">{$priceAlertNotice.message}</span><button aria-label="Dismiss price alert" onclick={clearPriceAlertNotice}><X class="w-3 h-3" /></button>
			</div>
		{/if}
	</div>
	<div class="grid grid-cols-[1fr_70px_55px] px-2 py-1.5 border-b border-terminal-border text-3xs text-terminal-text-muted">
		<div>Market</div><div class="text-right">Price</div><div class="text-right">24h</div>
	</div>
	<div class="flex-1 overflow-y-auto scrollbar-none" bind:clientHeight={viewportHeight} onscroll={(event) => (scrollTop = event.currentTarget.scrollTop)}>
		{#if rows.length === 0}
			<div class="p-5 flex flex-col items-center gap-2 text-center text-2xs {$marketCatalogStatus === 'error' ? 'text-terminal-red' : 'text-terminal-text-muted'}">
				{#if $marketCatalogStatus === 'error'}<AlertTriangle class="w-4 h-4" />{/if}
				<span>{statusMessage($marketCatalogStatus)}</span>
			</div>
		{:else}
			<div style="height:{topSpacer}px"></div>
			{#each virtualRows as row (row.key)}
				{#if row.kind === 'header'}
					<button aria-expanded={!collapsed.has(row.group.id)} style="height:{ROW_HEIGHT}px" class="w-full px-2 flex items-center gap-1 bg-terminal-bg-secondary border-b border-terminal-border text-3xs uppercase tracking-wide text-terminal-text-secondary" onclick={() => toggleGroup(row.group.id)}>
						{#if collapsed.has(row.group.id)}<ChevronRight class="w-3 h-3" />{:else}<ChevronDown class="w-3 h-3" />{/if}
						<span>{row.group.label}</span><span class="ml-auto tabular-nums text-terminal-text-muted">{row.group.markets.length}</span>
					</button>
				{:else}
					{@const priceAvailable = Number.isFinite(row.market.lastPrice) && (row.market.lastPrice !== 0 || row.market.kind === 'outcome')}
					<div role="button" tabindex="0" aria-pressed={$selectedMarket?.marketKey === row.market.marketKey} style="height:{ROW_HEIGHT}px" class="w-full grid grid-cols-[1fr_70px_55px] px-2 items-center text-left hover:bg-terminal-bg-hover {$selectedMarket?.marketKey === row.market.marketKey ? 'bg-terminal-bg-tertiary' : ''}" onclick={() => selectMarket(row.market)} onkeydown={(event) => selectFromKeyboard(event, row.market)}>
						<div class="flex items-center gap-1 min-w-0">
							<button aria-label={`Toggle ${row.market.symbol} favorite`} class="p-0.5" onclick={(event) => toggleFavorite(event, row.market)} onkeydown={(event) => event.stopPropagation()}>
								<Star class="w-2.5 h-2.5 {favorites.has(row.market.marketKey) ? 'fill-terminal-yellow text-terminal-yellow' : 'text-terminal-text-muted/50'}" />
							</button>
							<span class="text-2xs font-medium truncate">{row.market.symbol.replace('-USD-PERP', '').replace('-PERP', '')}</span>
							{#if row.market.venueCategory}<span class="text-3xs text-terminal-text-muted">{row.market.venueCategory}</span>{/if}
						</div>
						<div class="text-right tabular-nums text-2xs {priceAvailable ? 'text-terminal-text' : 'text-terminal-text-muted'}">{priceAvailable ? formatPrice(row.market.lastPrice, row.market.priceDecimals) : '—'}</div>
						<div class="text-right tabular-nums text-2xs {row.market.changePercent24h === undefined ? 'text-terminal-text-muted' : row.market.changePercent24h >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{row.market.changePercent24h === undefined ? '—' : `${row.market.changePercent24h >= 0 ? '+' : ''}${row.market.changePercent24h.toFixed(2)}%`}</div>
					</div>
				{/if}
			{/each}
			<div style="height:{bottomSpacer}px"></div>
		{/if}
	</div>
	<div class="p-2 border-t border-terminal-border text-3xs flex justify-between text-terminal-text-muted">
		<span>{cachedVisibleMarkets.length} markets</span><span class="tabular-nums">{cachedHasVolume ? formatVolume(cachedTotalVolume) : '—'} 24h</span>
	</div>
	{#if $priceAlerts.length > 0}
		<div class="max-h-16 overflow-y-auto border-t border-terminal-border px-2 py-1 text-3xs text-terminal-text-muted">
			{#each $priceAlerts as alert (alert.id)}
				<div class="flex items-center gap-1"><Bell class="w-3 h-3 text-terminal-cyan" /><span class="min-w-0 flex-1 truncate">{alert.symbol} {alert.direction} {alert.threshold}</span><button aria-label={`Remove ${alert.symbol} alert`} onclick={() => removePriceAlert(alert.id)} class="hover:text-terminal-red"><X class="w-3 h-3" /></button></div>
			{/each}
		</div>
	{/if}
</div>
