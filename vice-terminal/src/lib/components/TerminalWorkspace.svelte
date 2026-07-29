<script lang="ts">
	import { selectedMarket, orderBook, orderSide, chartTimeframe, setChartTimeframe, marketContextStatus, marketRegistry, selectMarket } from '$lib/stores';
	import { startPriceAlertMonitoring } from '$lib/priceAlerts';
	import { startSoundNotifications } from '$lib/soundNotifications';
	import { loadPrivacyMode } from '$lib/privacyMode';
	import { loadWorkspacePreset } from '$lib/workspacePreset';
	import { formatFundingCountdown } from '$lib/marketStats';
	import { healthLabel } from '$lib/productionTruth';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketWatchlist from '$lib/components/MarketWatchlist.svelte';
	import Chart from '$lib/components/Chart.svelte';
	import OrderBook from '$lib/components/OrderBook.svelte';
	import OrderTicket from '$lib/components/OrderTicket.svelte';
	import RecentTrades from '$lib/components/RecentTrades.svelte';
	import WorkspaceHost from '$lib/components/WorkspaceHost.svelte';
	import CLIPanel from '$lib/components/CLIPanel.svelte';
	import MobileOrderSheet from '$lib/components/MobileOrderSheet.svelte';
	import { formatPrice } from '$lib/format';
	import { describeMarketClass } from '$lib/marketClass';
	import { BarChart3, LineChart } from 'lucide-svelte';
	import { parseTradeHandoff, resolveTradeHandoff } from '$lib/suite/handoff';

	type MobileTab = 'markets' | 'trade';

	function formatCompact(value: number | undefined): string {
		if (!value || !Number.isFinite(value)) return '—';
		if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
		if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
		if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
		return `$${value.toFixed(0)}`;
	}

	// Mobile bottom-tab navigation
	let mobileTab: MobileTab = 'trade';
	// Sub-toggle on Trade tab: inline book vs trades
	let mobileBookTab: 'book' | 'trades' = 'book';
	// Bottom sheet for order entry
	let orderSheetOpen = false;
	let statsNow = Date.now();
	let handoffMessage = '';
	$: marketClass = describeMarketClass($selectedMarket);

	const mobileTabs: { id: MobileTab; label: string; icon: any }[] = [
		{ id: 'markets', label: 'Markets', icon: BarChart3 },
		{ id: 'trade',   label: 'Trade',   icon: LineChart }
	];

	onMount(() => {
		loadPrivacyMode();
		loadWorkspacePreset();
		const stopAlerts = startPriceAlertMonitoring();
		const stopSounds = startSoundNotifications();
		const timer = setInterval(() => { statsNow = Date.now(); }, 1_000);
		const rawHandoff = new URLSearchParams(window.location.search).get('handoff');
		const handoff = parseTradeHandoff(rawHandoff);
		let stopHandoff: (() => void) | undefined;
		if (rawHandoff && !handoff) handoffMessage = 'Trade context was rejected because it was incomplete or invalid.';
		if (handoff) {
			const apply = (markets: Parameters<typeof resolveTradeHandoff>[0]) => {
				const market = resolveTradeHandoff(markets, handoff);
				if (!market) return;
				selectMarket(market);
				handoffMessage = `Trade context loaded: ${market.symbol}.`;
				stopHandoff?.();
			};
			apply(get(marketRegistry));
			if (!handoffMessage) stopHandoff = marketRegistry.subscribe(apply);
		}
		return () => {
			stopAlerts();
			stopSounds();
			clearInterval(timer);
			stopHandoff?.();
		};
	});
</script>

<div data-testid="terminal-shell" class="h-screen flex flex-col overflow-hidden bg-terminal-bg">
	<!-- Navbar - 44px -->
	<Navbar />
	{#if handoffMessage}<div data-testid="trade-handoff-status" class="border-b border-terminal-border bg-terminal-bg-secondary px-3 py-1 text-2xs text-terminal-cyan">{handoffMessage}</div>{/if}

	<!-- Market Info Bar -->
	{#if $selectedMarket}
		{@const activeFunding = $selectedMarket.fundingRate}
		{@const activeSpread = $orderBook.spread || 0}
		{@const activeVolume = $selectedMarket.volume24h}
		{@const activeOI = $selectedMarket.openInterest}
		{@const statsHealth = $marketContextStatus}
		{@const statsLabel = healthLabel(statsHealth)}
		<div class="hidden lg:flex h-10 bg-terminal-bg-secondary border-b border-terminal-border items-center px-3 gap-4 text-xs overflow-hidden scrollbar-none">
			<!-- Symbol + Price -->
			<div class="flex items-center gap-3 flex-shrink-0">
				<div class="flex items-center gap-2">
					<div class="w-5 h-5 rounded bg-terminal-yellow/20 flex items-center justify-center text-terminal-yellow text-2xs font-bold">₿</div>
					<span class="font-semibold text-sm">{$selectedMarket.symbol}</span>
					{#if marketClass}<span data-testid="market-class-badge" title={marketClass.detail} class="rounded px-1.5 py-0.5 text-3xs {marketClass.metadataOnly ? 'bg-terminal-yellow/10 text-terminal-yellow' : 'bg-terminal-cyan/10 text-terminal-cyan'}">{marketClass.label}</span>{/if}
				</div>
				<div class="flex items-center gap-1.5">
					<span class="font-mono text-base font-medium {$selectedMarket.change24h >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
						{formatPrice($selectedMarket.lastPrice)}
					</span>
					<span class="px-1.5 py-0.5 rounded text-2xs font-medium {$selectedMarket.changePercent24h >= 0 ? 'bg-terminal-green-bg text-terminal-green' : 'bg-terminal-red-bg text-terminal-red'}">
						{$selectedMarket.changePercent24h >= 0 ? '+' : ''}{$selectedMarket.changePercent24h.toFixed(2)}%
					</span>
				</div>
			</div>

			<div class="h-5 w-px bg-terminal-border flex-shrink-0"></div>

			<!-- Authoritative Hyperliquid market stats -->
			<div class="flex items-center gap-4 flex-shrink-0">
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Spread</span>
					<span class="font-mono text-2xs text-terminal-text">${activeSpread.toFixed(1)}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Funding /hr · {statsLabel}</span>
					<span class="font-mono text-2xs {activeFunding === undefined ? 'text-terminal-text-muted' : activeFunding >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
						{activeFunding === undefined ? '—' : `${activeFunding >= 0 ? '+' : ''}${(activeFunding * 100).toFixed(4)}%`}
					</span>
					<span class="text-3xs text-terminal-text-muted font-mono">Next {statsHealth === 'live' ? formatFundingCountdown(statsNow) : statsLabel}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">24h Volume · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">
						{formatCompact(activeVolume)}
					</span>
				</div>
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Open Interest · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">
						{formatCompact(activeOI)}
					</span>
				</div>
			</div>

			<div class="h-5 w-px bg-terminal-border flex-shrink-0"></div>

			<!-- Global stats -->
			<div class="flex items-center gap-4">
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Index · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">{formatPrice($selectedMarket.indexPrice || $selectedMarket.lastPrice)}</span>
				</div>
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Mark · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">{formatPrice($selectedMarket.markPrice || $selectedMarket.lastPrice)}</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Desktop workspace: Dockview owns presentation only; all trading paths stay shared. -->
	<div class="flex-1 overflow-hidden hidden lg:flex min-h-0"><WorkspaceHost /></div>

	<!-- ============================================================ -->
	<!-- MOBILE — focused markets and trading layout (hidden on lg+) -->
	<!-- ============================================================ -->
	<div class="flex-1 flex flex-col overflow-hidden lg:hidden min-h-0">

		<!-- TAB: Markets -->
		<div class="flex-1 min-h-0 {mobileTab === 'markets' ? 'flex flex-col' : 'hidden'}">
			<MarketWatchlist />
		</div>

		<!-- TAB: Trade — chart fills screen, mini book below, sticky CTA bar -->
		<div class="flex-1 min-h-0 flex flex-col {mobileTab === 'trade' ? '' : 'hidden'}">
			<!-- Instrument header (FTX style: back arrow + symbol + price) -->
			<div class="h-11 bg-terminal-bg-secondary border-b border-terminal-border flex items-center px-3 gap-3 flex-shrink-0">
				<div class="flex-1 min-w-0">
					<div class="flex items-baseline gap-2">
						<span class="font-semibold text-sm leading-none">{$selectedMarket?.symbol ?? '—'}</span>
						{#if marketClass}<span data-testid="mobile-market-class-badge" title={marketClass.detail} class="rounded px-1 py-0.5 text-3xs {marketClass.metadataOnly ? 'bg-terminal-yellow/10 text-terminal-yellow' : 'bg-terminal-cyan/10 text-terminal-cyan'}">{marketClass.label}</span>{/if}
						<span class="font-mono text-sm font-bold {($selectedMarket?.change24h ?? 0) >= 0 ? 'text-terminal-green' : 'text-terminal-red'} leading-none">
							{#if $selectedMarket}{formatPrice($selectedMarket.lastPrice)}{/if}
						</span>
						<span class="text-2xs {($selectedMarket?.change24h ?? 0) >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
							{($selectedMarket?.change24h ?? 0) >= 0 ? '+' : ''}{($selectedMarket?.change24h ?? 0).toFixed(2)}%
						</span>
					</div>
					<div class="flex items-center gap-3 mt-0.5">
						<span class="text-3xs text-terminal-text-muted">Funding <span class="text-terminal-cyan font-mono">{$selectedMarket?.fundingRate === undefined ? '—' : `${$selectedMarket.fundingRate >= 0 ? '+' : ''}${($selectedMarket.fundingRate * 100).toFixed(4)}%`}</span></span>
						<span class="text-3xs text-terminal-text-muted">OI <span class="font-mono text-terminal-text">{formatCompact($selectedMarket?.openInterest)}</span></span>
					</div>
				</div>
			</div>

			<!-- Timeframe selector -->
			<div class="h-8 bg-terminal-bg-secondary flex items-center px-3 gap-1 flex-shrink-0 overflow-x-auto scrollbar-none">
				{#each ['1m', '5m', '15m', '1h', '4h', '1d'] as tf}
					<button
						class="px-2.5 py-1 text-2xs font-medium rounded whitespace-nowrap transition-colors
							{tf === $chartTimeframe ? 'bg-terminal-bg-tertiary text-terminal-text' : 'text-terminal-text-muted'}"
						onclick={() => setChartTimeframe(tf)}
					>{tf}</button>
				{/each}
				<div class="ml-auto text-2xs text-terminal-text-muted px-2 whitespace-nowrap">Indicators</div>
			</div>

			<!-- Chart — takes remaining flex space minus the bottom sections -->
			<div class="flex-1 min-h-0">
				<Chart />
			</div>

			<!-- Inline Orderbook / Trades toggle (FTX style) -->
			<div class="h-[220px] flex-shrink-0 border-t border-terminal-border flex flex-col bg-terminal-bg-panel">
				<!-- Toggle tabs -->
				<div class="h-8 flex items-center px-3 gap-4 border-b border-terminal-border flex-shrink-0">
					<button
						class="text-xs font-medium pb-0.5 transition-colors border-b-2
							{mobileBookTab === 'book' ? 'border-terminal-cyan text-terminal-text' : 'border-transparent text-terminal-text-muted'}"
						onclick={() => (mobileBookTab = 'book')}
					>Orderbook</button>
					<button
						class="text-xs font-medium pb-0.5 transition-colors border-b-2
							{mobileBookTab === 'trades' ? 'border-terminal-cyan text-terminal-text' : 'border-transparent text-terminal-text-muted'}"
						onclick={() => (mobileBookTab = 'trades')}
					>Trades</button>
					<div class="ml-auto text-3xs text-terminal-text-muted font-mono">
						{#if $orderBook.asks[0]}
							Spread: ${($orderBook.asks[0].price - ($orderBook.bids[0]?.price ?? 0)).toFixed(1)}
						{/if}
					</div>
				</div>
				<!-- Content -->
				<div class="flex-1 min-h-0 overflow-hidden">
					{#if mobileBookTab === 'book'}
						<OrderBook />
					{:else}
						<RecentTrades />
					{/if}
				</div>
			</div>

			<!-- Sticky Buy / Sell bar — always visible -->
			<div class="h-14 flex-shrink-0 border-t border-terminal-border bg-terminal-bg-secondary flex items-center gap-3 px-3">
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted">Ask</span>
					<span class="font-mono text-xs text-terminal-red font-semibold">{$orderBook.asks[0] ? formatPrice($orderBook.asks[0].price) : '—'}</span>
				</div>
				<button
					class="flex-1 h-9 rounded-lg bg-terminal-green text-terminal-bg text-sm font-bold active:scale-[0.97] transition-transform"
					onclick={() => { orderSide.set('buy'); orderSheetOpen = true; }}
				>Buy</button>
				<button
					class="flex-1 h-9 rounded-lg bg-terminal-red text-white text-sm font-bold active:scale-[0.97] transition-transform"
					onclick={() => { orderSide.set('sell'); orderSheetOpen = true; }}
				>Sell</button>
				<div class="flex flex-col items-end">
					<span class="text-3xs text-terminal-text-muted">Bid</span>
					<span class="font-mono text-xs text-terminal-green font-semibold">{$orderBook.bids[0] ? formatPrice($orderBook.bids[0].price) : '—'}</span>
				</div>
			</div>
		</div>

	</div>

	<!-- Mobile Bottom Tab Bar -->
	<nav class="lg:hidden flex-shrink-0 h-14 border-t border-terminal-border bg-terminal-bg-secondary flex items-stretch safe-area-pb">
		{#each mobileTabs as tab}
			{@const active = mobileTab === tab.id}
			<button
				class="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
				onclick={() => (mobileTab = tab.id)}
				aria-label={tab.label}
				aria-current={active ? 'page' : undefined}
			>
				{#if active}
					<div class="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-terminal-cyan"></div>
				{/if}
				<svelte:component this={tab.icon} class="w-5 h-5 {active ? 'text-terminal-cyan' : 'text-terminal-text-muted'}" />
				<span class="text-3xs font-medium {active ? 'text-terminal-cyan' : 'text-terminal-text-muted'}">{tab.label}</span>
			</button>
		{/each}
	</nav>

	<!-- Order Bottom Sheet (slides up over everything) -->
	<MobileOrderSheet bind:open={orderSheetOpen} />

	<!-- CLI Panel (overlay) -->
	<CLIPanel />
</div>

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
