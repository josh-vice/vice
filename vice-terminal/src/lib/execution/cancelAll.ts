import type { MarketDescriptor, Order } from '$lib/types';

export type CancelAllScope = 'buy' | 'sell' | 'both';

export interface CancelAllTarget {
	orderId: string;
	marketKey: string;
	apiCoin: string;
	market: string;
}

export interface CancelAllOutcome {
	market: string;
	orderId: string;
	ok: boolean;
	error?: string;
}

export function buildCancelAllPlan(
	orders: Order[],
	registry: MarketDescriptor[],
	scope: CancelAllScope
): { targets: CancelAllTarget[]; skipped: { orderId: string; reason: string }[] } {
	const targets: CancelAllTarget[] = [];
	const skipped: { orderId: string; reason: string }[] = [];
	for (const order of orders) {
		if (scope !== 'both' && order.side !== scope) continue;
		if (!order.apiCoin || !order.marketKey) {
			skipped.push({ orderId: order.id, reason: 'missing exact market identity' });
			continue;
		}
		const market = registry.find((candidate) => candidate.apiCoin === order.apiCoin && candidate.marketKey === order.marketKey);
		if (!market) {
			skipped.push({ orderId: order.id, reason: 'unregistered market identity' });
			continue;
		}
		targets.push({ orderId: order.id, marketKey: market.marketKey, apiCoin: market.apiCoin, market: order.market });
	}
	return { targets, skipped };
}

export function reconcileCancelAllOutcomes(
	acknowledgements: CancelAllOutcome[],
	skipped: { orderId: string; reason: string }[],
	refreshed: boolean,
	remainingOrderIds: Set<string>
): CancelAllOutcome[] {
	return [
		...acknowledgements.map((outcome) => {
			if (!outcome.ok) return outcome;
			if (!refreshed) return { ...outcome, ok: false, error: 'cancel acknowledged but open-order refresh failed; reconcile before retrying' };
			if (remainingOrderIds.has(outcome.orderId)) return { ...outcome, ok: false, error: 'cancel acknowledged but order remains in the refreshed open-order snapshot' };
			return outcome;
		}),
		...skipped.map((item) => ({ market: 'Unknown market', orderId: item.orderId, ok: false, error: item.reason }))
	];
}
