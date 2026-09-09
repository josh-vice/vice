import { describe, expect, test } from 'bun:test';
import fixture from './fixtures/instruments.json';
import {
	BLOFIN_INSTRUMENTS_URL,
	loadBlofinMarkets,
	normalizeBlofinInstruments,
	type BlofinInstrumentsResponse
} from './markets';

function fixtureCopy(): BlofinInstrumentsResponse {
	return JSON.parse(JSON.stringify(fixture)) as BlofinInstrumentsResponse;
}

describe('BloFin public market catalog', () => {
	test('normalizes only live linear swaps and preserves exact execution terms', () => {
		const markets = normalizeBlofinInstruments(fixture);

		expect(markets.map((market) => market.instId)).toEqual(['BTC-USDT', 'ETH-USDT']);
		expect(markets[0]).toMatchObject({
			marketKey: 'blofin:linearPerp:BTC-USDT',
			apiCoin: 'BTC-USDT',
			kind: 'linearPerp',
			type: 'perp',
			instId: 'BTC-USDT',
			maxLeverage: 150,
			status: 'live',
			instrument: {
				instrumentKey: 'blofin:linearPerp:BTC-USDT',
				venue: 'blofin',
				venueSymbol: 'BTC-USDT',
				product: 'linearPerp',
				baseAsset: 'BTC',
				quoteAsset: 'USDT',
				settlementAsset: 'USDT',
				contractMultiplier: '0.001',
				priceIncrement: '0.1',
				pricePrecision: { kind: 'fixedIncrement', increment: '0.1' },
				sizeIncrement: '0.1'
			}
		});
		expect(markets[1].instrument.contractMultiplier).toBe('0.01');
		expect(markets[1].instrument.priceIncrement).toBe('0.01');
		expect(markets[1].instrument.sizeIncrement).toBe('0.1');
	});

	test('uses an injected fetcher and never requires network access in the loader', async () => {
		let requestUrl = '';
		let requestInit: RequestInit | undefined;
		const markets = await loadBlofinMarkets({
			fetcher: async (input, init) => {
				requestUrl = String(input);
				requestInit = init;
				return new Response(JSON.stringify(fixture), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				});
			}
		});

		expect(markets).toHaveLength(2);
		expect(requestUrl).toBe(BLOFIN_INSTRUMENTS_URL);
		expect(requestInit?.method).toBe('GET');
	});

	test('rejects malformed numeric metadata on an otherwise eligible instrument', () => {
		const response = fixtureCopy();
		response.data[1].tickSize = 'not-a-decimal';
		expect(() => normalizeBlofinInstruments(response)).toThrow('tickSize');

		const zeroMultiplier = fixtureCopy();
		zeroMultiplier.data[1].contractValue = '0';
		expect(() => normalizeBlofinInstruments(zeroMultiplier)).toThrow('contractValue');
	});

	test('rejects malformed response envelopes but filters suspended and non-linear records', () => {
		const response = fixtureCopy();
		response.data.push({ ...response.data[1], instId: 'SOL-USDT', state: 'suspended' });
		expect(normalizeBlofinInstruments(response)).toHaveLength(2);
		expect(() => normalizeBlofinInstruments({ code: '500', msg: 'failure', data: [] })).toThrow('successful');
		expect(() => normalizeBlofinInstruments({ code: '0', msg: 'success', data: {} })).toThrow('data');
	});
});
