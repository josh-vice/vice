// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { buildPositionCloseIntent } from './positionClose';

const market = { marketKey: 'hl:BTC', apiCoin: 'BTC', lastPrice: 100 };
const long = { id: 'p1', market: 'BTC', apiCoin: 'BTC', marketKey: 'hl:BTC', side: 'long', size: 2 };
const book = { bids: [{ price: 99, size: 1 }], asks: [{ price: 101, size: 1 }] };

describe('US-010 position quick close', () => {
	test('uses exact identity and an authoritative selected feed', () => {
		expect(buildPositionCloseIntent(long, [market], market, book, 'market').intent).toMatchObject({ marketKey: 'hl:BTC', side: 'sell', type: 'market', reduceOnly: true, ioc: true });
		expect(buildPositionCloseIntent(long, [market], null, book, 'market').error).toContain('Select this position market');
		expect(buildPositionCloseIntent({ ...long, marketKey: undefined }, [market], market, book, 'market').error).toContain('identity is incomplete');
	});

	test('uses the executable near-side quote for a reduce-only limit close', () => {
		expect(buildPositionCloseIntent(long, [market], market, book, 'quote').intent).toMatchObject({ type: 'limit', price: 99, reduceOnly: true, ioc: false });
		expect(buildPositionCloseIntent({ ...long, side: 'short' }, [market], market, book, 'quote').intent).toMatchObject({ side: 'buy', price: 101 });
		expect(buildPositionCloseIntent(long, [market], market, { bids: [], asks: [] }, 'quote').error).toContain('live executable quote');
	});
});
