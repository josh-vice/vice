// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { buildPositionReversePlan, reverseCloseReconciliation } from './positionReverse';

const market = { marketKey: 'hl:BTC', apiCoin: 'BTC', lastPrice: 100 };
const book = { bids: [{ price: 99, size: 1 }], asks: [{ price: 101, size: 1 }] };
const long = { id: 'p1', market: 'BTC', apiCoin: 'BTC', marketKey: 'hl:BTC', side: 'long', size: 2 };
const short = { id: 'p2', market: 'BTC', apiCoin: 'BTC', marketKey: 'hl:BTC', side: 'short', size: 2 };

describe('US-010 position reverse', () => {
	test('long closes first and then permits the same-size opposite exposure', () => {
		const plan = buildPositionReversePlan(long, [market], market, book).plan;
		expect(plan.close).toMatchObject({ side: 'sell', reduceOnly: true, ioc: true, size: 2 });
		expect(plan.open).toMatchObject({ side: 'sell', reduceOnly: false, ioc: true, size: 2 });
	});

	test('short mirrors the long rule: closed by buy, reopened by buy to long', () => {
		const plan = buildPositionReversePlan(short, [market], market, book).plan;
		expect(plan.close).toMatchObject({ side: 'buy', reduceOnly: true, ioc: true, size: 2 });
		expect(plan.open).toMatchObject({ side: 'buy', reduceOnly: false, ioc: true, size: 2 });
	});

	test('requires a flat, exact-identity snapshot before opening', () => {
		const identity = { apiCoin: 'BTC', marketKey: 'hl:BTC' };
		expect(reverseCloseReconciliation([], identity)).toBe('flat');
		expect(reverseCloseReconciliation([long], identity)).toBe('open');
		expect(reverseCloseReconciliation([{ ...long, marketKey: undefined }], identity)).toBe('ambiguous');
	});
});
