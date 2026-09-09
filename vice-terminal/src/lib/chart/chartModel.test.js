import { describe, expect, test } from 'bun:test';
import { chartDatasetKey, chartIdentity, marketMatches } from './chartModel.ts';

const market = { kind: 'corePerp', marketKey: 'perp:BTC', apiCoin: 'BTC' };

describe('chart model identity', () => {
	test('builds stable identity and dataset keys', () => {
		expect(chartIdentity(market)).toBe('corePerp:perp:BTC:BTC');
		expect(chartDatasetKey(market, '1h')).toBe('corePerp:perp:BTC:1h');
		expect(chartDatasetKey(null, '1h')).toBe('::1h');
	});

	test('matches exact market identity fields', () => {
		expect(marketMatches(market, 'BTC')).toBe(true);
		expect(marketMatches(market, undefined, 'perp:BTC')).toBe(true);
		expect(marketMatches(market, 'ETH')).toBe(false);
		expect(marketMatches(null, 'BTC')).toBe(false);
	});
	test('rejects contradictory identities and requires a candidate', () => {
		expect(marketMatches(market, 'BTC', 'perp:ETH')).toBe(false);
		expect(marketMatches(market, 'ETH', 'perp:BTC')).toBe(false);
		expect(marketMatches(market)).toBe(false);
		expect(marketMatches({ kind: 'corePerp', marketKey: '', apiCoin: 'BTC' }, 'BTC')).toBe(true);
		expect(marketMatches({ kind: 'corePerp', marketKey: 'perp:BTC', apiCoin: '' }, undefined, 'perp:BTC')).toBe(true);
	});
});
