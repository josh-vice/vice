import type { MarketDescriptor } from '$lib/types';

export type MarketWatchlistGroup = {
	id: string;
	label: string;
	markets: MarketDescriptor[];
};

/** Search exact venue fields plus the visible product-class vocabulary. */
export function marketMatchesWatchlistQuery(market: MarketDescriptor, rawQuery: string): boolean {
	const query = rawQuery.trim().toLowerCase();
	if (!query) return true;
	const classTerms = market.kind === 'corePerp'
		? ['core', 'perp', 'perpetual']
		: market.kind === 'hip3Perp'
			? ['hip-3', 'hip3', 'builder', 'perp', 'perpetual']
			: market.kind === 'outcome'
				? ['prediction', 'outcome', 'metadata']
				: ['spot'];
	return [
		market.symbol,
		market.name,
		market.apiCoin,
		market.baseToken,
		market.quoteToken,
		market.dex ?? '',
		market.kind,
		market.venueCategory ?? '',
		market.outcome?.questionName ?? '',
		market.outcome?.questionDescription ?? '',
		...classTerms
	].some((value) => value.toLowerCase().includes(query));
}

function categoryGroups(
	markets: MarketDescriptor[],
	prefix: string,
	label: (group: string) => string,
	key: (market: MarketDescriptor) => string
): MarketWatchlistGroup[] {
	const groups = new Map<string, MarketDescriptor[]>();
	for (const market of markets) {
		const category = market.venueCategory ?? '';
		const groupKey = `${key(market)}\u0000${category}`;
		groups.set(groupKey, [...(groups.get(groupKey) ?? []), market]);
	}
	return [...groups.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([groupKey, groupedMarkets]) => {
			const [group, category] = groupKey.split('\u0000');
			return {
				id: `${prefix}:${group}:${category || 'uncategorized'}`,
				label: `${label(group)}${category ? ` · ${category}` : ''}`,
				markets: groupedMarkets
			};
		});
}

/** Build stable product and official-category groups; categories remain descriptive only. */
export function buildMarketWatchlistGroups(
	markets: MarketDescriptor[],
	favorites: ReadonlySet<string>
): MarketWatchlistGroup[] {
	const favoriteMarkets = markets.filter((market) => favorites.has(market.marketKey));
	const coreMarkets = markets.filter((market) => market.kind === 'corePerp');
	const hip3Markets = markets.filter((market) => market.kind === 'hip3Perp');
	const outcomeMarkets = markets.filter((market) => market.kind === 'outcome');
	const spotMarkets = markets.filter((market) => market.kind === 'spot');
	return [
		...(favoriteMarkets.length ? [{ id: 'favorites', label: 'Favorites', markets: favoriteMarkets }] : []),
		...categoryGroups(coreMarkets, 'core', () => 'Core Perps', () => 'core'),
		...categoryGroups(hip3Markets, 'hip3', (dex) => `HIP-3 · ${dex}`, (market) => market.dex ?? 'HIP-3'),
		...(outcomeMarkets.length ? [{ id: 'outcomes', label: 'Prediction outcomes · metadata only', markets: outcomeMarkets }] : []),
		...(spotMarkets.length ? [{ id: 'spot', label: 'Spot', markets: spotMarkets }] : [])
	];
}
