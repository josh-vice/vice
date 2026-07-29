<script lang="ts">
	import { onMount } from 'svelte';
	import MarketWatchlist from '$lib/components/MarketWatchlist.svelte';
	import { startPriceAlertMonitoring } from '$lib/priceAlerts';
	import { suiteContext } from '$lib/suite/context';
	import { nativeWidgetPorts } from '$lib/suite/widgets';

	const port = nativeWidgetPorts.vWatch;
	const alertsPort = nativeWidgetPorts.vAlerts;

	onMount(() => startPriceAlertMonitoring());
</script>

<main data-testid="native-watchlist-port" class="min-h-screen bg-terminal-bg px-4 py-5 text-terminal-text sm:px-6">
	<header class="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-terminal-border pb-4">
		<div>
			<p class="text-3xs font-semibold uppercase tracking-[0.2em] text-terminal-cyan">Native widget port · {port.story}</p>
			<h1 class="mt-1 text-xl font-semibold">{port.title}</h1>
		</div>
		<a href="/hub" class="rounded border border-terminal-border px-3 py-2 text-xs text-terminal-text-secondary hover:border-terminal-cyan hover:text-terminal-cyan">Open preserved Hub</a>
	</header>

	<section class="mx-auto grid max-w-6xl gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
		<div class="min-h-[38rem] overflow-hidden rounded border border-terminal-border bg-terminal-bg-panel shadow-2xl">
			<MarketWatchlist />
		</div>
		<aside class="rounded border border-terminal-border bg-terminal-bg-panel p-4 text-sm leading-6 text-terminal-text-secondary">
			<h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-terminal-text">Port contract</h2>
			<p class="mt-3">Source: {port.provenance}. It consumes the terminal’s existing public registry and shared market selection.</p>
			<p class="mt-3">The same surface also ports {alertsPort.title}: it monitors the shared live registry in this browser and stores alert settings locally.</p>
			<p class="mt-3">Catalog: {$suiteContext.market.catalogStatus}. Data: {$suiteContext.market.dataStatus}. Selected: {$suiteContext.market.market?.symbol ?? 'none'}.</p>
			<p class="mt-3 text-terminal-yellow">This surface has no signer, account, order, or new feed connection. Legacy Hub remains available while migration evidence is completed.</p>
		</aside>
	</section>
</main>
