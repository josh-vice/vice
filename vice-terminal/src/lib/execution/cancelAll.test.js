// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { buildCancelAllPlan, reconcileCancelAllOutcomes } from './cancelAll';

const registry = [{ marketKey: 'hl:BTC', apiCoin: 'BTC' }, { marketKey: 'hl:ETH', apiCoin: 'ETH' }];
const orders = [
	{ id: '1', market: 'BTC', side: 'buy', apiCoin: 'BTC', marketKey: 'hl:BTC' },
	{ id: '2', market: 'ETH', side: 'sell', apiCoin: 'ETH', marketKey: 'hl:ETH' },
	{ id: '3', market: 'BTC', side: 'buy', apiCoin: 'BTC' }
];

describe('US-010 confirmed cancel-all', () => {
	test('selects only the requested side with an exact registered identity', () => {
		const plan = buildCancelAllPlan(orders, registry, 'buy');
		expect(plan.targets).toEqual([{ orderId: '1', marketKey: 'hl:BTC', apiCoin: 'BTC', market: 'BTC' }]);
		expect(plan.skipped).toEqual([{ orderId: '3', reason: 'missing exact market identity' }]);
	});

	test('keeps valid orders separate from identity failures for a full cancel', () => {
		const plan = buildCancelAllPlan(orders, registry, 'both');
		expect(plan.targets.map((target) => target.orderId)).toEqual(['1', '2']);
		expect(plan.skipped).toHaveLength(1);
	});

	test('does not report cancellation as complete until refreshed open orders exclude it', () => {
		const acknowledged = [{ market: 'BTC', orderId: '1', ok: true }];
		expect(reconcileCancelAllOutcomes(acknowledged, [], true, new Set()).at(0).ok).toBe(true);
		expect(reconcileCancelAllOutcomes(acknowledged, [], true, new Set(['1'])).at(0).error).toContain('remains');
		expect(reconcileCancelAllOutcomes(acknowledged, [], false, new Set()).at(0).error).toContain('refresh failed');
	});
});
