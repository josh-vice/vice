<script lang="ts">
	import { selectedMarket, selectedDex, dexMeta, demoFixturesEnabled, type Dex } from '$lib/stores';
	import DexLogos from './DexLogos.svelte';

	// Simulated per-DEX market data seeded from the selected market.
	// In production this would be fetched from each DEX's API.
	$: basePrice = $selectedMarket?.lastPrice ?? 67000;
	$: baseFunding = $selectedMarket?.fundingRate ?? 0.0001;
	$: baseVolume = $selectedMarket?.volume24h ?? 1_200_000_000;

	type DexData = {
		fundingRate: number;
		fundingColor: string;
		spread: number;
		bidDepth: number;  // depth within 0.5% in $M
		askDepth: number;
		volume24h: number;
		openInterest: number;
	};

	// Each DEX gets slightly different funding/liquidity characteristics
	// based on realistic market structure differences.
	let dexData: Record<Dex, DexData>;
	$: dexData = {
		hyperliquid: {
			fundingRate: baseFunding * 1.0,
			fundingColor: baseFunding >= 0 ? '#4ade80' : '#f87171',
			spread: basePrice * 0.00008,
			bidDepth: (baseVolume / 1e6) * 0.18,
			askDepth: (baseVolume / 1e6) * 0.16,
			volume24h: baseVolume * 0.52,
			openInterest: baseVolume * 0.31,
		},
		lighter: {
			fundingRate: baseFunding * 0.92,
			fundingColor: baseFunding * 0.92 >= 0 ? '#4ade80' : '#f87171',
			spread: basePrice * 0.00012,
			bidDepth: (baseVolume / 1e6) * 0.09,
			askDepth: (baseVolume / 1e6) * 0.11,
			volume24h: baseVolume * 0.21,
			openInterest: baseVolume * 0.14,
		},
		nado: {
			fundingRate: baseFunding * 1.08,
			fundingColor: baseFunding * 1.08 >= 0 ? '#4ade80' : '#f87171',
			spread: basePrice * 0.00015,
			bidDepth: (baseVolume / 1e6) * 0.06,
			askDepth: (baseVolume / 1e6) * 0.07,
			volume24h: baseVolume * 0.14,
			openInterest: baseVolume * 0.09,
		},
		derive: {
			fundingRate: baseFunding * 0.97,
			fundingColor: baseFunding * 0.97 >= 0 ? '#4ade80' : '#f87171',
			spread: basePrice * 0.00010,
			bidDepth: (baseVolume / 1e6) * 0.12,
			askDepth: (baseVolume / 1e6) * 0.10,
			volume24h: baseVolume * 0.13,
			openInterest: baseVolume * 0.10,
		},
	};

	// Max depth for bar normalization
	$: maxDepth = Math.max(...Object.values(dexData).map(d => Math.max(d.bidDepth, d.askDepth)));

	function fmtFunding(r: number): string {
		const pct = (r * 100).toFixed(4);
		return `${r >= 0 ? '+' : ''}${pct}%`;
	}

	function fmtVol(v: number): string {
		if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
		if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
		return `$${(v / 1e3).toFixed(0)}K`;
	}

	function fmtSpread(s: number): string {
		return `$${s.toFixed(1)}`;
	}

	const dexOrder: Dex[] = ['hyperliquid', 'lighter', 'nado', 'derive'];
</script>

{#if !$demoFixturesEnabled}
	<div class="flex h-full items-center justify-center px-4 text-center text-2xs text-terminal-text-muted">
		Cross-venue comparison is unavailable: only authoritative Hyperliquid market data is connected.
	</div>
{:else}
<div class="flex flex-col h-full overflow-hidden">
	<!-- Header -->
	<div class="h-8 border-b border-terminal-border flex items-center px-3">
		<span class="text-2xs font-medium text-terminal-text-secondary uppercase tracking-wider">DEX Comparison</span>
		<span class="ml-2 text-2xs text-terminal-text-muted">{$selectedMarket?.symbol ?? ''}</span>
	</div>

	<!-- Rows -->
	<div class="flex-1 overflow-y-auto">
		{#each dexOrder as dex}
			{@const d = dexData[dex]}
			{@const meta = dexMeta[dex]}
			{@const isActive = $selectedDex === dex}

			<button
				class="w-full flex flex-col gap-1.5 px-3 py-2.5 border-b border-terminal-border transition-colors hover:bg-terminal-bg-hover text-left"
				style={isActive ? `background: ${meta.color}08; border-left: 2px solid ${meta.color};` : 'border-left: 2px solid transparent;'}
				onclick={() => selectedDex.set(dex)}
			>
				<!-- Row 1: Logo + Name + Funding -->
				<div class="flex items-center gap-2">
					<div class="w-5 h-5 flex items-center justify-center flex-shrink-0">
						<DexLogos {dex} size={16} />
					</div>
					<span class="text-2xs font-medium text-terminal-text flex-1">{meta.label}</span>
					<div class="flex flex-col items-end">
						<span class="text-3xs text-terminal-text-muted uppercase">Funding</span>
						<span class="text-2xs font-mono tabular-nums" style="color: {d.fundingColor}">
							{fmtFunding(d.fundingRate)}<span class="text-terminal-text-muted text-3xs">/8h</span>
						</span>
					</div>
				</div>

				<!-- Row 2: Depth bars + spread + volume -->
				<div class="flex flex-col gap-1 pl-7">
					<!-- Depth bars -->
					<div class="flex items-center gap-1">
						<span class="text-3xs text-terminal-text-muted w-5">Bid</span>
						<div class="flex-1 h-1 rounded-full bg-terminal-bg-tertiary overflow-hidden">
							<div
								class="h-full rounded-full bg-terminal-green opacity-70 transition-all duration-500"
								style="width: {Math.round((d.bidDepth / maxDepth) * 100)}%"
							></div>
						</div>
						<span class="text-3xs font-mono text-terminal-text-muted w-10 text-right">{d.bidDepth.toFixed(1)}M</span>
					</div>
					<div class="flex items-center gap-1">
						<span class="text-3xs text-terminal-text-muted w-5">Ask</span>
						<div class="flex-1 h-1 rounded-full bg-terminal-bg-tertiary overflow-hidden">
							<div
								class="h-full rounded-full bg-terminal-red opacity-70 transition-all duration-500"
								style="width: {Math.round((d.askDepth / maxDepth) * 100)}%"
							></div>
						</div>
						<span class="text-3xs font-mono text-terminal-text-muted w-10 text-right">{d.askDepth.toFixed(1)}M</span>
					</div>

					<!-- Spread + Volume row -->
					<div class="flex items-center gap-3 mt-0.5">
						<div class="flex items-center gap-1">
							<span class="text-3xs text-terminal-text-muted">Spread</span>
							<span class="text-3xs font-mono text-terminal-text">{fmtSpread(d.spread)}</span>
						</div>
						<div class="flex items-center gap-1">
							<span class="text-3xs text-terminal-text-muted">24h Vol</span>
							<span class="text-3xs font-mono text-terminal-text">{fmtVol(d.volume24h)}</span>
						</div>
						<div class="flex items-center gap-1">
							<span class="text-3xs text-terminal-text-muted">OI</span>
							<span class="text-3xs font-mono text-terminal-text">{fmtVol(d.openInterest)}</span>
						</div>
					</div>
				</div>
			</button>
		{/each}
	</div>
</div>
{/if}
