// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { buildPositionReversePlan, reverseCloseReconciliation } from './positionReverse';

const market = { marketKey: 'hl:BTC', apiCoin: 'BTC', lastPrice: 100 };
const book = { bids: [{ price: 99, size: 1 }], asks: [{ price: 101, size: 1 }] };
const long = { id: 'p1', market: 'BTC', apiCoin: 'BTC', marketKey: 'hl:BTC', side: 'long', size: 2 };

describe('US-010 position reverse', () => {
	test('closes first and only then permits the same-size opposite-side entry', () => {
		const plan = buildPositionReversePlan(long, [market], market, book).plan;
		expect(plan.close).toMatchObject({ side: 'sell', reduceOnly: true, ioc: true, size: 2 });
		expect(plan.open).toMatchObject({ side: 'buy', reduceOnly: false, ioc: true, size: 2 });
	});

	test('requires a flat, exact-identity snapshot before opening', () => {
		const identity = { apiCoin: 'BTC', marketKey: 'hl:BTC' };
		expect(reverseCloseReconciliation([], identity)).toBe('flat');
		expect(reverseCloseReconciliation([long], identity)).toBe('open');
		expect(reverseCloseReconciliation([{ ...long, marketKey: undefined }], identity)).toBe('ambiguous');
	});
});
