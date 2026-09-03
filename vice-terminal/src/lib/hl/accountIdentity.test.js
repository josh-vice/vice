import { describe, expect, test } from 'bun:test';
import { hydrateMarketIdentity } from './accountIdentity.ts';

describe('authoritative account identity', () => {
	test('hydrates a HIP-3 order from its exact API coin, not its display symbol', () => {
		const registry = [{ marketKey: 'hip3:xyz:BTC', apiCoin: 'xyz:BTC', symbol: 'XYZ:BTC-PERP' }];
		const result = hydrateMarketIdentity({ id: '1', market: 'legacy display text', apiCoin: 'xyz:BTC', size: 1 }, registry);
		expect(result.apiCoin).toBe('xyz:BTC');
		expect(result.marketKey).toBe('hip3:xyz:BTC');
		expect(result.market).toBe('XYZ:BTC-PERP');
	});

	test('leaves an unregistered API coin explicit and unroutable by display text', () => {
		const result = hydrateMarketIdentity({ id: '2', market: 'legacy display text', apiCoin: '@123', size: 1 }, []);
		expect(result.apiCoin).toBe('@123');
		expect(result.market).toBe('legacy display text');
		expect(result.marketKey).toBeUndefined();
	});

	test('does not promote a missing API coin from display text', () => {
		const result = hydrateMarketIdentity({ id: '3', market: 'BTC-USD-PERP', size: 1 }, [{ marketKey: 'perp:BTC', apiCoin: 'BTC', symbol: 'BTC-USD-PERP' }]);
		expect(result.apiCoin).toBeUndefined();
		expect(result.marketKey).toBeUndefined();
		expect(result.market).toBe('BTC-USD-PERP');
	});

	test('account snapshot mapping preserves the registry default for every row', async () => {
		const source = await Bun.file(new URL('./account.ts', import.meta.url)).text();
		expect(source).toContain('.map((order: ViceOrder) => hydrateMarketIdentity(order))');
		expect(source).toContain('.map((position: VicePosition) => hydrateMarketIdentity(position))');
		expect(source).toContain('.map((fill: ViceFill) => hydrateMarketIdentity(fill))');
		expect(source).not.toContain('.map(hydrateMarketIdentity)');
	});
});
