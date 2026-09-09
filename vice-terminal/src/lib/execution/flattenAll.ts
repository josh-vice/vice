import type { MarketDescriptor, Position } from '$lib/types';

export type FlattenScope = 'long' | 'short' | 'both';

export interface FlattenTarget {
	positionId: string;
	apiCoin: string;
	marketKey: string;
	market: MarketDescriptor;
}

/** Build independent, exact-identity close targets. Each target must be live before dispatch. */
export function buildFlattenPlan(
	positions: Position[],
	registry: MarketDescriptor[],
	scope: FlattenScope
): { targets: FlattenTarget[]; skipped: { positionId: string; reason: string }[] } {
	const targets: FlattenTarget[] = [];
	const skipped: { positionId: string; reason: string }[] = [];
	for (const position of positions) {
		if (scope !== 'both' && position.side !== scope) continue;
		if (!position.apiCoin || !position.marketKey) {
			skipped.push({ positionId: position.id, reason: 'missing exact market identity' });
			continue;
		}
		const market = registry.find((candidate) => candidate.apiCoin === position.apiCoin && candidate.marketKey === position.marketKey);
		if (!market) {
			skipped.push({ positionId: position.id, reason: 'unregistered market identity' });
			continue;
		}
		targets.push({ positionId: position.id, apiCoin: market.apiCoin, marketKey: market.marketKey, market });
	}
	return { targets, skipped };
}
