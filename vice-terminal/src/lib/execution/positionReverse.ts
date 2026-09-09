import type { MarketDescriptor, OrderBook, Position } from '$lib/types';
import { buildPositionCloseIntent, type PositionCloseIntent } from './positionClose';

export interface PositionReversePlan {
	apiCoin: string;
	marketKey: string;
	close: PositionCloseIntent;
	open: Omit<PositionCloseIntent, 'reduceOnly'> & { reduceOnly: false };
}

/** A reverse is always two commands: close first, then open after a flat snapshot. */
export function buildPositionReversePlan(
	position: Position | undefined,
	registry: MarketDescriptor[],
	selected: MarketDescriptor | null,
	book: OrderBook
): { plan?: PositionReversePlan; error?: string } {
	const close = buildPositionCloseIntent(position, registry, selected, book, 'market');
	if (!close.intent || !position?.apiCoin || !position.marketKey) return { error: close.error ?? 'Reverse is unavailable' };
	return {
		plan: {
			apiCoin: position.apiCoin,
			marketKey: position.marketKey,
			close: close.intent,
			open: {
				...close.intent,
				// The close-side order opens the opposite exposure once flat:
				// long closes/switches with sell; short closes/switches with buy.
				side: close.intent.side,
				reduceOnly: false
			}
		}
	};
}

export function reverseCloseReconciliation(
	positions: Position[],
	identity: Pick<PositionReversePlan, 'apiCoin' | 'marketKey'>
): 'flat' | 'open' | 'ambiguous' {
	const candidates = positions.filter((position) => position.apiCoin === identity.apiCoin || position.marketKey === identity.marketKey);
	if (candidates.length === 0) return 'flat';
	if (candidates.some((position) => position.apiCoin !== identity.apiCoin || position.marketKey !== identity.marketKey)) return 'ambiguous';
	return candidates.some((position) => position.size > 0) ? 'open' : 'flat';
}
