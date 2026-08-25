<script lang="ts">
	import { selectedMarket, marketDataStatus, candleDataStatus } from '$lib/stores';
	import { marketCapabilities } from '$lib/marketCapabilities';

	$: market = $selectedMarket;
	$: capabilities = marketCapabilities(market);
	$: probabilityAvailable = market !== null && Number.isFinite(market.lastPrice) && (market.kind === 'outcome' || $marketDataStatus === 'live');
</script>

<div class="h-full overflow-y-auto bg-terminal-bg-panel p-3 space-y-3" data-testid="prediction-market-panel" aria-label="Prediction market information">
	<div class="flex items-center justify-between">
		<div class="text-xs uppercase tracking-wide text-terminal-yellow">Prediction market</div>
		<div class="text-2xs text-terminal-text-muted">Read only</div>
	</div>
	{#if market}
		<div class="space-y-2">
			<div data-testid="prediction-question" class="text-sm text-terminal-text">{market.outcome?.questionName ?? market.name}</div>
			<div class="grid grid-cols-2 gap-2 text-2xs">
				<div><span class="text-terminal-text-muted">Side</span><div data-testid="prediction-side" class="text-terminal-text">{market.outcome?.sideName ?? market.baseToken}</div></div>
				<div><span class="text-terminal-text-muted">Probability</span><div data-testid="prediction-probability" class="font-mono text-terminal-cyan">{probabilityAvailable ? `${(market.lastPrice * 100).toFixed(Math.max(0, market.priceDecimals))}%` : 'Unavailable'}</div></div>
			</div>
			<div class="text-2xs">Settlement: <span data-testid="prediction-settlement" class="text-terminal-text">{market.outcome?.settled === undefined ? 'Settlement unavailable' : market.outcome.settled ? 'Settled' : 'Unsettled'}</span></div>
			<div class="text-2xs">Volume: <span data-testid="prediction-volume" class="font-mono">{market.volume24h === undefined ? 'Unavailable' : `${market.volume24h.toLocaleString()} USDC`}</span></div>
			{#if market.outcome?.outcomeContext?.expiry || market.outcome?.outcomeContext?.targetPrice !== undefined || market.outcome?.outcomeContext?.underlying || market.outcome?.outcomeContext?.period}
				<div data-testid="prediction-context" class="rounded border border-terminal-border bg-terminal-bg p-2 text-2xs text-terminal-text-muted">
					{#if market.outcome.outcomeContext.underlying}<div>Underlying: {market.outcome.outcomeContext.underlying}</div>{/if}
					{#if market.outcome.outcomeContext.expiry}<div>Expiry: {market.outcome.outcomeContext.expiry}</div>{/if}
					{#if market.outcome.outcomeContext.targetPrice !== undefined}<div>Target: {market.outcome.outcomeContext.targetPrice}</div>{/if}
					{#if market.outcome.outcomeContext.period}<div>Period: {market.outcome.outcomeContext.period}</div>{/if}
				</div>
			{/if}
			<details class="rounded border border-terminal-border bg-terminal-bg p-2 text-2xs">
				<summary class="cursor-pointer text-terminal-text-secondary">Details</summary>
				<div class="mt-2 space-y-2 text-terminal-text-muted">
					<p>{market.outcome?.questionDescription ?? market.outcome?.outcomeDescription ?? market.name}</p>
					{#if market.outcome?.rawDescription}<p>Venue description: {market.outcome.rawDescription}</p>{/if}
					<p data-testid="prediction-live-health">Data: {$marketDataStatus} · Chart: {$candleDataStatus}</p>
					<p data-testid="prediction-read-only-reason" role="note" class="text-terminal-yellow">{capabilities.readOnlyReason ?? 'This market is read-only.'}</p>
				</div>
			</details>
		</div>
	{/if}
</div>
