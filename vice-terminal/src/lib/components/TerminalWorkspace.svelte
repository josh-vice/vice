<script lang="ts">
	import { selectedMarket, orderBook, orderSide, chartTimeframe, setChartTimeframe, marketContextStatus, marketCatalogStatus, marketDataStatus, marketRegistry, selectMarket } from '$lib/stores';
	import { startPriceAlertMonitoring } from '$lib/priceAlerts';
	import { startSoundNotifications } from '$lib/soundNotifications';
	import { loadPrivacyMode } from '$lib/privacyMode';
	import { loadWorkspacePreset } from '$lib/workspacePreset';
	import { formatFundingCountdown } from '$lib/marketStats';
	import { healthLabel } from '$lib/productionTruth';
	import { onMount } from 'svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketWatchlist from '$lib/components/MarketWatchlist.svelte';
	import Chart from '$lib/components/Chart.svelte';
	import OrderBook from '$lib/components/OrderBook.svelte';
	import OrderTicket from '$lib/components/OrderTicket.svelte';
	import BottomPanel from '$lib/components/BottomPanel.svelte';
	import RecentTrades from '$lib/components/RecentTrades.svelte';
	import WorkspaceHost from '$lib/components/WorkspaceHost.svelte';
	import CLIPanel from '$lib/components/CLIPanel.svelte';
	import MobileOrderSheet from '$lib/components/MobileOrderSheet.svelte';
	import { formatPrice } from '$lib/format';
	import { describeMarketClass } from '$lib/marketClass';
	import { marketCapabilities } from '$lib/marketCapabilities';
	import { BarChart3, LineChart, Wallet } from 'lucide-svelte';

	type MobileTab = 'markets' | 'trade' | 'account';

	function formatCompact(value: number | undefined): string {
		if (!value || !Number.isFinite(value)) return '—';
		if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
		if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
		if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
		return `$${value.toFixed(0)}`;
	}
	function marketKindLabel(kind: string): string {
		if (kind === 'spot') return 'Spot market';
		if (kind === 'hip3Perp') return 'HIP-3 perpetual';
		return 'Perpetual market';
	}

	function marketKindGlyph(kind: string): string {
		if (kind === 'spot') return 'S';
		if (kind === 'hip3Perp') return 'H';
		return 'P';
	}

	// Mobile bottom-tab navigation
	let mobileTab: MobileTab = 'trade';
	// Sub-toggle on Trade tab: inline book vs trades
	let mobileBookTab: 'book' | 'trades' = 'book';
	// Bottom sheet for order entry
	let orderSheetOpen = false;
	let isDesktop: boolean | null = null;
	let statsNow = Date.now();
	$: marketClass = describeMarketClass($selectedMarket);
	$: marketProfile = marketCapabilities($selectedMarket);
	$: statsChange = $selectedMarket?.changePercent24h;
	const mobileTabs: { id: MobileTab; label: string; icon: any }[] = [
		{ id: 'markets', label: 'Markets', icon: BarChart3 },
		{ id: 'trade', label: 'Trade', icon: LineChart },
		{ id: 'account', label: 'Account', icon: Wallet }
	];

	onMount(() => {
		loadPrivacyMode();
		loadWorkspacePreset();
		const desktopQuery = window.matchMedia('(min-width: 1024px)');
		const updateWorkspace = (event: MediaQueryListEvent | MediaQueryList) => {
			isDesktop = event.matches;
		};
		updateWorkspace(desktopQuery);
		desktopQuery.addEventListener('change', updateWorkspace);
		const stopAlerts = startPriceAlertMonitoring();
		const stopSounds = startSoundNotifications();
		const timer = setInterval(() => { statsNow = Date.now(); }, 1_000);
		return () => {
			desktopQuery.removeEventListener('change', updateWorkspace);
			stopAlerts();
			stopSounds();
			clearInterval(timer);
		};
	});
</script>

<div data-testid="terminal-shell" class="h-screen flex flex-col overflow-hidden bg-terminal-bg">
	<!-- Navbar - 44px -->
	<Navbar />

	{#if $selectedMarket}
		{@const activeFunding = $selectedMarket.fundingRate}
		{@const activeSpread = $orderBook.spread || 0}
		{@const activeVolume = $selectedMarket.volume24h}
		{@const activeOI = $selectedMarket.openInterest}
		{@const activeChange = $selectedMarket.changePercent24h}
		{@const statsHealth = $marketContextStatus}
		{@const statsLabel = healthLabel(statsHealth)}
		<div class="hidden lg:flex min-h-10 bg-terminal-bg-secondary border-b border-terminal-border items-center px-3 gap-4 text-xs overflow-hidden scrollbar-none">
			<!-- Symbol + Price -->
			<div class="flex items-center gap-3 flex-shrink-0">
				<div class="flex items-center gap-2">
					<div class="w-5 h-5 rounded bg-terminal-yellow/20 flex items-center justify-center text-terminal-yellow text-2xs font-bold" title={marketKindLabel($selectedMarket.kind)} aria-label={marketKindLabel($selectedMarket.kind)}>{marketKindGlyph($selectedMarket.kind)}</div>
					<span class="font-semibold text-sm">{$selectedMarket.symbol}</span>
					{#if marketClass}<span data-testid="market-class-badge" title={marketClass.detail} class="rounded px-1.5 py-0.5 text-3xs {marketClass.metadataOnly ? 'bg-terminal-yellow/10 text-terminal-yellow' : 'bg-terminal-cyan/10 text-terminal-cyan'}">{marketClass.label}</span>{/if}
				</div>
				<div class="flex items-center gap-1.5">
					<span class="font-mono text-base font-medium {activeChange === undefined ? 'text-terminal-text-muted' : activeChange >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
					{($marketDataStatus === 'live') && Number.isFinite($selectedMarket.lastPrice) ? formatPrice($selectedMarket.lastPrice, $selectedMarket.priceDecimals) : '—'}
					</span>
					<span class="px-1.5 py-0.5 rounded text-2xs font-medium {activeChange === undefined ? 'bg-terminal-bg-tertiary text-terminal-text-muted' : activeChange >= 0 ? 'bg-terminal-green-bg text-terminal-green' : 'bg-terminal-red-bg text-terminal-red'}">
						{activeChange === undefined ? '—' : `${activeChange >= 0 ? '+' : ''}${activeChange.toFixed(2)}%`}
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
				{#if marketProfile.meaningfulStats.fundingRate}
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Funding /hr · {statsLabel}</span>
					<span class="font-mono text-2xs {activeFunding === undefined ? 'text-terminal-text-muted' : activeFunding >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
						{activeFunding === undefined ? '—' : `${activeFunding >= 0 ? '+' : ''}${(activeFunding * 100).toFixed(4)}%`}
					</span>
					<span class="text-3xs text-terminal-text-muted font-mono">Next {statsHealth === 'live' ? formatFundingCountdown(statsNow) : statsLabel}</span>
				</div>
				{/if}
				{#if marketProfile.meaningfulStats.volume24h}
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">24h Volume · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">{activeVolume === undefined ? '—' : formatCompact(activeVolume)}</span>
				</div>
				{/if}
				{#if marketProfile.meaningfulStats.openInterest}
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Open Interest · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">{formatCompact(activeOI)}</span>
				</div>
				{/if}
			</div>

			<div class="h-5 w-px bg-terminal-border flex-shrink-0"></div>

			{#if marketProfile.meaningfulStats.indexPrice || marketProfile.meaningfulStats.markPrice}
			<div class="flex items-center gap-4">
				{#if marketProfile.meaningfulStats.indexPrice}
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Index · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">{$selectedMarket.indexPrice === undefined ? '—' : formatPrice($selectedMarket.indexPrice, $selectedMarket.priceDecimals)}</span>
				</div>
				{/if}
				{#if marketProfile.meaningfulStats.markPrice}
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted uppercase tracking-wide">Mark · {statsLabel}</span>
					<span class="font-mono text-2xs text-terminal-text">{$selectedMarket.markPrice === undefined ? '—' : formatPrice($selectedMarket.markPrice, $selectedMarket.priceDecimals)}</span>
				</div>
				{/if}
			</div>
			{/if}
			</div>
	{/if}

	{#if isDesktop === true}
		<!-- Desktop workspace: Dockview owns presentation only; all trading paths stay shared. -->
		<div class="flex-1 overflow-hidden min-h-0"><WorkspaceHost /></div>
	{:else if isDesktop === false}
	<!-- ============================================================ -->
	<!-- MOBILE — focused markets and trading layout -->
	<!-- ============================================================ -->
	<div class="flex-1 flex flex-col overflow-hidden min-h-0">

		<!-- TAB: Markets -->
		<div class="flex-1 min-h-0 {mobileTab === 'markets' ? 'flex flex-col' : 'hidden'}">
			<MarketWatchlist />
		</div>

		<!-- TAB: Trade — chart fills screen, mini book below, sticky CTA bar -->
		<div class="flex-1 min-h-0 flex flex-col {mobileTab === 'trade' ? '' : 'hidden'}">
			<!-- Instrument header (FTX style: back arrow + symbol + price) -->
					<div data-testid="mobile-market-disclosure" class="flex min-h-7 flex-shrink-0 items-center gap-3 overflow-x-auto border-b border-terminal-border bg-terminal-bg-secondary px-3 py-1 whitespace-nowrap text-3xs text-terminal-text-muted scrollbar-none">
						<span>Venue: Hyperliquid</span>
						<span>API: <b class="font-mono text-terminal-text">{$selectedMarket?.apiCoin ?? 'Unavailable'}</b></span>
						<span>Base/quote: <b class="font-mono text-terminal-text">{$selectedMarket?.baseToken ?? 'Unavailable'} / {$selectedMarket?.quoteToken ?? 'Unavailable'}</b></span>
						<span>Size precision: <b class="font-mono text-terminal-text">{$selectedMarket?.szDecimals ?? 'Unavailable'}</b></span>
						<span>Margin/leverage: <b class="font-mono text-terminal-text">{marketProfile.usesMargin ? `Applicable · ${marketProfile.maxLeverage}x` : 'Not applicable'}</b></span>
						<span>DEX/category: <b class="font-mono text-terminal-text">{$selectedMarket?.dex ?? 'Unavailable'} / {$selectedMarket?.venueCategory ?? 'Unavailable'}</b></span>
						</div>
			<div class="h-11 bg-terminal-bg-secondary border-b border-terminal-border flex items-center px-3 gap-3 flex-shrink-0">
				<div class="flex-1 min-w-0">
					<div class="flex items-baseline gap-2">
						<span class="font-semibold text-sm leading-none">{$selectedMarket?.symbol ?? '—'}</span>
						{#if marketClass}<span data-testid="mobile-market-class-badge" title={marketClass.detail} class="rounded px-1 py-0.5 text-3xs {marketClass.metadataOnly ? 'bg-terminal-yellow/10 text-terminal-yellow' : 'bg-terminal-cyan/10 text-terminal-cyan'}">{marketClass.label}</span>{/if}
						<span class="font-mono text-sm font-bold {($selectedMarket?.changePercent24h ?? 0) >= 0 && $selectedMarket?.changePercent24h !== undefined ? 'text-terminal-green' : $selectedMarket?.changePercent24h === undefined ? 'text-terminal-text-muted' : 'text-terminal-red'} leading-none">
							{#if $selectedMarket && $marketDataStatus === 'live' && Number.isFinite($selectedMarket.lastPrice)}{formatPrice($selectedMarket.lastPrice, $selectedMarket.priceDecimals)}{:else}—{/if}
						</span>
						<span class="text-2xs {($selectedMarket?.changePercent24h ?? 0) >= 0 && $selectedMarket?.changePercent24h !== undefined ? 'text-terminal-green' : $selectedMarket?.changePercent24h === undefined ? 'text-terminal-text-muted' : 'text-terminal-red'}">
							{#if $selectedMarket?.changePercent24h === undefined}—{:else}{($selectedMarket.changePercent24h >= 0 ? '+' : '')}{$selectedMarket.changePercent24h.toFixed(2)}%{/if}
						</span>
					</div>
					<div class="flex items-center gap-3 mt-0.5">
						{#if marketProfile.meaningfulStats.fundingRate}<span class="text-3xs text-terminal-text-muted">Funding <span class="text-terminal-cyan font-mono">{$selectedMarket?.fundingRate === undefined ? '—' : `${$selectedMarket.fundingRate >= 0 ? '+' : ''}${($selectedMarket.fundingRate * 100).toFixed(4)}%`}</span></span>{/if}
						{#if marketProfile.meaningfulStats.openInterest}<span class="text-3xs text-terminal-text-muted">OI <span class="font-mono text-terminal-text">{formatCompact($selectedMarket?.openInterest)}</span></span>{/if}
					</div>
						<span data-testid="mobile-connection-health" role="status" aria-live="polite" class="text-3xs text-terminal-text-muted">Data {healthLabel($marketDataStatus)}</span>
				</div>
			</div>

			<!-- Timeframe selector -->
			<div class="h-8 bg-terminal-bg-secondary flex items-center px-3 gap-1 flex-shrink-0 overflow-x-auto scrollbar-none">
				{#each ['1m', '5m', '15m', '1h', '4h', '1D'] as tf}
					<button data-action-id="ui.src.lib.components.terminalworkspace.button.h6bafdfb5de"
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
					<button data-action-id="ui.src.lib.components.terminalworkspace.button.hfae50da4ca"
						class="text-xs font-medium pb-0.5 transition-colors border-b-2
							{mobileBookTab === 'book' ? 'border-terminal-cyan text-terminal-text' : 'border-transparent text-terminal-text-muted'}"
						onclick={() => (mobileBookTab = 'book')}
					>Orderbook</button>
					<button data-action-id="ui.src.lib.components.terminalworkspace.button.h462ca92e5d"
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

			{#if marketProfile.executable}
			<div class="h-14 flex-shrink-0 border-t border-terminal-border bg-terminal-bg-secondary flex items-center gap-3 px-3">
				<div class="flex flex-col">
					<span class="text-3xs text-terminal-text-muted">Ask</span>
					<span class="font-mono text-xs text-terminal-red font-semibold">{$orderBook.asks[0] ? formatPrice($orderBook.asks[0].price) : '—'}</span>
				</div>
				<button data-action-id="ui.src.lib.components.terminalworkspace.button.hc4d6380acb"
					class="flex-1 h-9 rounded-lg bg-terminal-green text-terminal-bg text-sm font-bold active:scale-[0.97] transition-transform"
					onclick={() => { orderSide.set('buy'); orderSheetOpen = true; }}
				>Buy</button>
				<button data-action-id="ui.src.lib.components.terminalworkspace.button.h3d5ffa31d6"
					class="flex-1 h-9 rounded-lg bg-terminal-red text-white text-sm font-bold active:scale-[0.97] transition-transform"
					onclick={() => { orderSide.set('sell'); orderSheetOpen = true; }}
				>Sell</button>
				<div class="flex flex-col items-end">
					<span class="text-3xs text-terminal-text-muted">Bid</span>
					<span class="font-mono text-xs text-terminal-green font-semibold">{$orderBook.bids[0] ? formatPrice($orderBook.bids[0].price) : '—'}</span>
				</div>
			</div>
			{:else}
			<div data-testid="mobile-read-only-market" class="h-14 flex items-center justify-center border-t border-terminal-border bg-terminal-bg-secondary px-3 text-2xs text-terminal-yellow text-center">{marketProfile.readOnlyReason}</div>
			{/if}
		</div>

	</div>
		<div class="flex-1 min-h-0 {mobileTab === 'account' ? 'flex flex-col' : 'hidden'}" data-testid="mobile-account-panel">
			<BottomPanel />
		</div>

	<!-- Mobile Bottom Tab Bar -->
	<nav class="flex-shrink-0 h-14 border-t border-terminal-border bg-terminal-bg-secondary flex items-stretch safe-area-pb">
		{#each mobileTabs as tab}
			{@const active = mobileTab === tab.id}
			<button data-action-id="ui.src.lib.components.terminalworkspace.button.h8272f5fb11"
				class="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
				onclick={() => (mobileTab = tab.id)}
				aria-pressed={active}
				aria-current={active ? 'page' : undefined}
				aria-label={tab.label}
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
	{/if}

	<!-- CLI Panel (overlay) -->
	<CLIPanel />
</div>

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
