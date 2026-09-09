// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { buildFlattenPlan } from './flattenAll';

const registry = [{ marketKey: 'hl:BTC', apiCoin: 'BTC' }, { marketKey: 'hl:ETH', apiCoin: 'ETH' }];
const positions = [
	{ id: '1', market: 'BTC', side: 'long', size: 1, apiCoin: 'BTC', marketKey: 'hl:BTC' },
	{ id: '2', market: 'ETH', side: 'short', size: 2, apiCoin: 'ETH', marketKey: 'hl:ETH' },
	{ id: '3', market: 'BTC', side: 'long', size: 1, apiCoin: 'BTC' }
];

describe('US-010 confirmed flatten', () => {
	test('creates only exact long targets and records unsafe positions', () => {
		const plan = buildFlattenPlan(positions, registry, 'long');
		expect(plan.targets.map((target) => target.positionId)).toEqual(['1']);
		expect(plan.skipped).toEqual([{ positionId: '3', reason: 'missing exact market identity' }]);
	});

	test('keeps long and short flatten targets independent', () => {
		const plan = buildFlattenPlan(positions, registry, 'both');
		expect(plan.targets.map((target) => target.marketKey)).toEqual(['hl:BTC', 'hl:ETH']);
	});
});
