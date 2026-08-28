import type { MarketDescriptor } from '$lib/types';

export type MarketClassPresentation = {
	label: string;
	detail: string;
	metadataOnly: boolean;
};

/** Presents only class facts carried by the selected market descriptor. */
export function describeMarketClass(market: MarketDescriptor | null | undefined): MarketClassPresentation | null {
	if (!market) return null;
	if (market.kind === 'spot') return { label: 'Spot', detail: 'Venue spot market', metadataOnly: false };
	const category = market.venueCategory ? ` · ${market.venueCategory}` : '';
	if (market.kind === 'hip3Perp') {
		const detail = market.venueCategory
			? `Venue category: ${market.venueCategory}; RWA classification unavailable`
			: 'Venue HIP-3 perpetual market; RWA classification unavailable';
		return { label: `${market.dex ? `HIP-3 · ${market.dex}` : 'HIP-3 perpetual'}${category}`, detail, metadataOnly: false };
	}
	return { label: `Core perpetual${category}`, detail: market.venueCategory ? `Venue category: ${market.venueCategory}` : 'Venue core perpetual market', metadataOnly: false };
}
