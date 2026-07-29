import type { MarketDescriptor } from '$lib/types';

export type MarketClassPresentation = {
	label: string;
	detail: string;
	metadataOnly: boolean;
};

/** Presents only class facts carried by the selected market descriptor. */
export function describeMarketClass(market: MarketDescriptor | null | undefined): MarketClassPresentation | null {
	if (!market) return null;
	if (market.kind === 'outcome') {
		const outcome = market.outcome;
		const context = [outcome?.questionName, outcome?.questionDescription].filter(Boolean).join(' — ');
		return {
			label: outcome?.settled ? 'Prediction · settled' : 'Prediction · metadata only',
			detail: context || market.tradingUnavailableReason || 'Venue-provided prediction metadata',
			metadataOnly: true
		};
	}
	if (market.kind === 'spot') return { label: 'Spot', detail: 'Venue spot market', metadataOnly: false };
	const category = market.venueCategory ? ` · ${market.venueCategory}` : '';
	const detail = market.venueCategory ? `Venue category: ${market.venueCategory}` : undefined;
	if (market.kind === 'hip3Perp') return { label: `${market.dex ? `HIP-3 · ${market.dex}` : 'HIP-3 perpetual'}${category}`, detail: detail ?? 'Venue HIP-3 perpetual market', metadataOnly: false };
	return { label: `Core perpetual${category}`, detail: detail ?? 'Venue core perpetual market', metadataOnly: false };
}
