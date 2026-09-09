import { get } from 'svelte/store';
import { marketRegistry } from '$lib/stores';

/**
 * Enriches an authoritative Hyperliquid account entity with the registry identity.
 * The API coin is the only lookup key; display text is never used for routing.
 */
export function hydrateMarketIdentity<T extends { market: string; apiCoin?: string }>(entity: T, registry = get(marketRegistry)): T {
	// `market` is display text on account projections. Never promote it to an
	// API coin when the venue did not return an authoritative routing field.
	const apiCoin = entity.apiCoin;
	const descriptor = apiCoin ? registry.find((market) => market.apiCoin === apiCoin) : undefined;
	return {
		...entity,
		...(apiCoin ? { apiCoin, market: descriptor?.symbol ?? entity.market } : {}),
		...(descriptor ? { marketKey: descriptor.marketKey } : {})
	} as T;
}
