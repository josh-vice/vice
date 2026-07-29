import type { MarketDescriptor } from '$lib/types';

type PerpContext = {
	markPx?: string | null;
	midPx?: string | null;
	prevDayPx?: string | null;
	dayNtlVlm?: string | null;
	openInterest?: string | null;
	funding?: string | null;
	oraclePx?: string | null;
};

type SpotContext = {
	midPx?: string | null;
	markPx?: string | null;
	prevDayPx?: string | null;
	dayNtlVlm?: string | null;
};

function finite(value: string | null | undefined): number | undefined {
	if (value == null || value === '') return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function applyPerp(market: MarketDescriptor, context: PerpContext): MarketDescriptor {
	const mark = finite(context.markPx) ?? finite(context.midPx) ?? market.lastPrice;
	const previous = finite(context.prevDayPx);
	const change = previous == null ? market.change24h : mark - previous;
	market.lastPrice = finite(context.midPx) ?? mark;
	market.markPrice = mark;
	market.indexPrice = finite(context.oraclePx) ?? market.indexPrice;
	market.change24h = change;
	market.changePercent24h = previous && previous > 0 ? (change / previous) * 100 : market.changePercent24h;
	market.volume24h = finite(context.dayNtlVlm) ?? market.volume24h;
	market.openInterest = finite(context.openInterest) ?? market.openInterest;
	market.fundingRate = finite(context.funding) ?? market.fundingRate;
	return market;
}

function applySpot(market: MarketDescriptor, context: SpotContext): MarketDescriptor {
	const mark = finite(context.markPx) ?? finite(context.midPx) ?? market.lastPrice;
	const previous = finite(context.prevDayPx);
	const change = previous == null ? market.change24h : mark - previous;
	market.lastPrice = finite(context.midPx) ?? mark;
	market.markPrice = mark;
	market.change24h = change;
	market.changePercent24h = previous && previous > 0 ? (change / previous) * 100 : market.changePercent24h;
	market.volume24h = finite(context.dayNtlVlm) ?? market.volume24h;
	return market;
}

/** Apply all-DEX perp contexts by their venue-provided universe order. */
export function applyAllDexPerpContexts(
	markets: MarketDescriptor[],
	contexts: Array<[string, PerpContext[]]>
): MarketDescriptor[] {
	const byDex = new Map<string, PerpContext[]>();
	for (const [dex, values] of contexts) byDex.set(dex, values);
	for (const market of markets) {
		const dex = market.dex ?? '';
		const values = byDex.get(dex);
		if (!values) continue;
		// The registry is volume-sorted, so its array position is not the
		// venue universe index. Preserve the exact asset-id mapping instead.
		const index = market.kind === 'corePerp' ? market.assetId : market.assetId % 10_000;
		const context = index >= 0 ? values[index] : undefined;
		if (context) applyPerp(market, context);
	}
	return markets;
}

/** Apply the spot context array by the exact spot market asset index. */
export function applySpotContexts(
	markets: MarketDescriptor[],
	contexts: SpotContext[]
): MarketDescriptor[] {
	for (const market of markets) {
		if (market.kind !== 'spot') continue;
		const index = Number(market.apiCoin.replace(/^@/, ''));
		const context = contexts[index];
		if (context) applySpot(market, context);
	}
	return markets;
}
