import { describe, expect, test } from 'bun:test';
import { NADO_MAINNET_PUBLIC_WS, NADO_TESTNET_PUBLIC_WS, applyNadoBookDepthFrame, nadoBookDepthSubscribe, nadoBookStateFromSnapshot } from './publicWs.ts';

const snapshot = { productId: 88, timestamp: '100', bids: [['100000000000000000000', '2000000000000000000']], asks: [['101000000000000000000', '3000000000000000000']] };
const update = { type: 'book_depth', product_id: 88, min_timestamp: '101', max_timestamp: '110', last_max_timestamp: '100', bids: [['100000000000000000000', '0'], ['99000000000000000000', '1000000000000000000']], asks: [['101000000000000000000', '4000000000000000000']] };

describe('Nado public book-depth boundary', () => {
	test('keeps official subscription roots and exact product ids', () => {
		expect(NADO_MAINNET_PUBLIC_WS).toBe('wss://gateway.prod.nado.xyz/v1/subscribe');
		expect(NADO_TESTNET_PUBLIC_WS).toBe('wss://gateway.test.nado.xyz/v1/subscribe');
		expect(nadoBookDepthSubscribe(88, 7)).toBe('{"method":"subscribe","stream":{"type":"book_depth","product_id":88},"id":7}');
		expect(() => nadoBookDepthSubscribe(-1)).toThrow('exact non-negative product id');
	});

	test('uses exact x18 snapshot state and only applies a contiguous delta', () => {
		const initial = nadoBookStateFromSnapshot(snapshot);
		const result = applyNadoBookDepthFrame(initial, update);
		expect(result).toMatchObject({ status: 'applied', state: { maxTimestamp: '110' } });
		expect(result.state.bids.get('100000000000000000000')).toBeUndefined();
		expect(result.state.bids.get('99000000000000000000')).toBe('1000000000000000000');
		const next = applyNadoBookDepthFrame(result.state, { ...update, min_timestamp: '111', max_timestamp: '120', last_max_timestamp: '110', bids: [], asks: [] });
		expect(next).toMatchObject({ status: 'applied', state: { maxTimestamp: '120', awaitingFirstDelta: false } });
	});

	test('allows the queued first delta to bridge from before the snapshot only once', () => {
		const initial = nadoBookStateFromSnapshot(snapshot);
		const first = applyNadoBookDepthFrame(initial, { ...update, last_max_timestamp: '99' });
		expect(first.status).toBe('applied');
		if (first.status !== 'applied') throw new Error('expected first bridge');
		expect(applyNadoBookDepthFrame(first.state, { ...update, min_timestamp: '111', max_timestamp: '120', last_max_timestamp: '109' }).status).toBe('gap');
	});

	test('fails closed on a bad product, malformed x18 value, or timestamp gap', () => {
		const initial = nadoBookStateFromSnapshot(snapshot);
		expect(applyNadoBookDepthFrame(initial, { ...update, product_id: 89 }).status).toBe('invalid');
		expect(applyNadoBookDepthFrame(initial, { ...update, bids: [['bad', '1']] }).status).toBe('invalid');
		expect(applyNadoBookDepthFrame(initial, { ...update, last_max_timestamp: '101' }).status).toBe('gap');
	});
});
