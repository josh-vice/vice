<script lang="ts">
	import { marketRegistry, selectMarket } from '$lib/stores';
	import { formatPrice, formatVolume } from '$lib/format';
	import { readable, type Readable } from 'svelte/store';
	import { setWorkspaceLinkContext, workspaceLinkContext, type PublicWorkspaceLinkContext, type WorkspaceLinkGroup } from '$lib/workspaceLinks';

	/** Exact market identity saved in the Dockview panel layout. */
	export let marketKey = '';
	/** Optional local public link group; it never carries account or execution state. */
	export let linkGroup: WorkspaceLinkGroup | undefined = undefined;
	export let timeframe = '1h';
	const noLinkContext = readable<PublicWorkspaceLinkContext | null>(null);
	let linkContextStore: Readable<PublicWorkspaceLinkContext | null> = noLinkContext;

	$: linkContextStore = linkGroup ? workspaceLinkContext(linkGroup) : noLinkContext;
	$: linkedContext = $linkContextStore;
	$: activeMarketKey = linkedContext?.marketKey ?? marketKey;
	$: activeTimeframe = linkedContext?.timeframe ?? timeframe;
	$: market = $marketRegistry.find((candidate) => candidate.marketKey === activeMarketKey) ?? null;
	$: priceDecimals = market?.priceDecimals ?? 2;
	$: price = market ? formatPrice(market.lastPrice, priceDecimals) : '—';

	function setSnapshotAsLinkContext() {
		if (!linkGroup) return;
		setWorkspaceLinkContext(linkGroup, { marketKey, timeframe });
	}

	function useInSharedWorkspace() {
		if (!market) return;
		if (linkGroup) setWorkspaceLinkContext(linkGroup, { marketKey: market.marketKey, timeframe: activeTimeframe });
		selectMarket(market);
	}
</script>

<section class="flex h-full min-h-0 flex-col gap-3 bg-terminal-bg-panel p-3" aria-label="Independent market snapshot">
	{#if market}
		<div class="min-w-0">
			<p class="truncate font-mono text-sm text-terminal-text">{market.symbol}</p>
			<p class="truncate text-3xs text-terminal-text-muted">{market.marketKey} · {market.apiCoin}</p>
			{#if linkGroup}<p data-testid="workspace-link-context" class="mt-1 text-3xs uppercase tracking-wide text-terminal-cyan">{linkGroup} link · {activeTimeframe}</p>{/if}
		</div>
		<div>
			<p class="font-mono text-xl {market.changePercent24h >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{price}</p>
			<p class="text-3xs {market.changePercent24h >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{market.changePercent24h >= 0 ? '+' : ''}{market.changePercent24h.toFixed(2)}% 24h</p>
		</div>
		<dl class="grid grid-cols-2 gap-x-2 gap-y-1 text-3xs text-terminal-text-muted">
			<div><dt>Venue</dt><dd class="font-mono text-terminal-text">{market.dex ?? 'Hyperliquid'}</dd></div>
			<div><dt>Class</dt><dd class="font-mono text-terminal-text">{market.kind}</dd></div>
			<div><dt>Mark</dt><dd class="font-mono text-terminal-text">{market.markPrice == null ? '—' : formatPrice(market.markPrice, priceDecimals)}</dd></div>
			<div><dt>24h volume</dt><dd class="font-mono text-terminal-text">{formatVolume(market.volume24h)}</dd></div>
		</dl>
		<p class="mt-auto text-3xs text-terminal-text-muted">{linkGroup ? 'Read-only linked public quote snapshot.' : 'Read-only independent quote snapshot.'} It does not own a book, chart, account, or execution context.</p>
		{#if linkGroup}<button class="rounded border border-terminal-border px-2 py-1 text-3xs text-terminal-text-muted hover:text-terminal-cyan" onclick={setSnapshotAsLinkContext}>Set {linkGroup} link to this snapshot</button>{/if}
		<button class="rounded border border-terminal-border px-2 py-1 text-3xs text-terminal-text-muted hover:text-terminal-cyan" onclick={useInSharedWorkspace}>Use in shared workspace</button>
	{:else}
		<p class="text-3xs text-terminal-yellow">This {linkGroup ? 'linked' : 'saved'} market is unavailable in the current catalog. No replacement was inferred.</p>
		<p class="text-3xs text-terminal-text-muted">Market identity: {activeMarketKey || 'missing'}</p>
	{/if}
</section>
