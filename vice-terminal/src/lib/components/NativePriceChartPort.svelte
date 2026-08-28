<script lang="ts">
	import Chart from '$lib/components/Chart.svelte';
	import { suiteContext } from '$lib/suite/context';
	import { nativeWidgetPorts } from '$lib/suite/widgets';

	const port = nativeWidgetPorts.vPrice;
</script>

<main data-testid="native-price-chart-port" class="min-h-screen bg-terminal-bg px-4 py-5 text-terminal-text sm:px-6">
	<header class="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-terminal-border pb-4">
		<div><p class="text-3xs font-semibold uppercase tracking-[0.2em] text-terminal-cyan">Native widget port · {port.story}</p><h1 class="mt-1 text-xl font-semibold">{port.title}</h1></div>
		<a data-action-id="ui.src.lib.components.nativepricechartport.a.heb94c62983" href="/hub" class="rounded border border-terminal-border px-3 py-2 text-xs text-terminal-text-secondary hover:border-terminal-cyan hover:text-terminal-cyan">Open preserved Hub</a>
	</header>

	<section class="mx-auto grid max-w-6xl gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
		<div class="h-[min(70vh,48rem)] min-h-[30rem] overflow-hidden rounded border border-terminal-border bg-terminal-bg-panel"><Chart readOnly={true} /></div>
		<aside class="rounded border border-terminal-border bg-terminal-bg-panel p-4 text-sm leading-6 text-terminal-text-secondary">
			<h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-terminal-text">Port contract</h2>
			<p class="mt-3">{port.provenance}. This port reuses the shared selected market, timeframe, and public candle data instead of opening a parallel chart feed.</p>
			<p class="mt-3">Market: {$suiteContext.market.market?.symbol ?? 'none'}. Timeframe: {$suiteContext.market.timeframe}. Data: {$suiteContext.market.dataStatus}.</p>
			<p class="mt-3 text-terminal-yellow">Read-only mode disables chart trading and private account overlays. This surface has no signer, account, order, telemetry, or execution path.</p>
		</aside>
	</section>
</main>
