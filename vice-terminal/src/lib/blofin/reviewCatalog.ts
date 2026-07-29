import type { BlofinMarketDescriptor } from './public';

type ReviewCatalogResponse = { markets?: unknown };

function isMarket(value: unknown): value is BlofinMarketDescriptor {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const candidate = value as Record<string, unknown>;
	return candidate.venue === 'blofin'
		&& typeof candidate.instId === 'string'
		&& typeof candidate.baseCurrency === 'string'
		&& typeof candidate.quoteCurrency === 'string'
		&& typeof candidate.contractValue === 'string'
		&& typeof candidate.minSize === 'string'
		&& typeof candidate.lotSize === 'string'
		&& typeof candidate.tickSize === 'string'
		&& typeof candidate.maxLeverage === 'string'
		&& (candidate.contractType === 'linear' || candidate.contractType === 'inverse')
		&& typeof candidate.assetClass === 'string'
		&& Number.isFinite(candidate.lastPrice)
		&& Number.isFinite(candidate.open24h)
		&& Number.isFinite(candidate.volumeContracts24h)
		&& Number.isFinite(candidate.volumeBase24h);
}

/**
 * Browser-safe entry point for the separately gated review page. The server
 * route performs the official public reads and reuses the strict venue parser;
 * this client never reaches a venue private API or handles credentials.
 */
export async function fetchBlofinReviewCatalog(
	fetcher: typeof fetch = fetch,
	demo = true
): Promise<BlofinMarketDescriptor[]> {
	const response = await fetcher(`/api/blofin/public/catalog?environment=${demo ? 'demo' : 'live'}`, {
		headers: { accept: 'application/json' }
	});
	if (!response.ok) throw new Error(`BloFin public review returned HTTP ${response.status}`);
	const payload = await response.json() as ReviewCatalogResponse;
	if (!Array.isArray(payload.markets) || !payload.markets.every(isMarket)) {
		throw new Error('BloFin public review returned an invalid catalog');
	}
	return payload.markets;
}
