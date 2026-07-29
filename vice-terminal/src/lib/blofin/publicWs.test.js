import { describe, expect, test } from 'bun:test';
import { BLOFIN_DEMO_PUBLIC_WS, BLOFIN_PUBLIC_WS, applyBlofinBookFrame, blofinPublicSubscribe } from './publicWs.ts';

const snapshot = {
	arg: { channel: 'books', instId: 'BTC-USDT' }, action: 'snapshot',
	data: { bids: [['100', '2'], ['99', '1']], asks: [['101', '3'], ['102', '1']], prevSeqId: '0', seqId: '10' }
};

describe('BloFin public WebSocket book boundary', () => {
	test('uses public roots and exact instrument subscriptions', () => {
		expect(BLOFIN_PUBLIC_WS).toBe('wss://openapi.blofin.com/ws/public');
		expect(BLOFIN_DEMO_PUBLIC_WS).toBe('wss://demo-trading-openapi.blofin.com/ws/public');
		expect(blofinPublicSubscribe('books', 'BTC-USDT')).toBe('{"op":"subscribe","args":[{"channel":"books","instId":"BTC-USDT"}]}');
		expect(() => blofinPublicSubscribe('books', ' ')).toThrow('exact instId');
	});

	test('applies only contiguous updates after a valid snapshot', () => {
		const first = applyBlofinBookFrame(null, snapshot);
		expect(first.status).toBe('applied');
		if (first.status !== 'applied') throw new Error('expected snapshot');
		const second = applyBlofinBookFrame(first.state, { arg: snapshot.arg, action: 'update', data: { bids: [['100', '0'], ['98', '4']], asks: [['101', '2']], prevSeqId: '10', seqId: '11' } });
		expect(second).toMatchObject({ status: 'applied', state: { sequence: '11' } });
		if (second.status !== 'applied') throw new Error('expected update');
		expect(second.book.bids.map((level) => level.price)).toEqual([99, 98]);
		expect(second.book.asks[0]).toMatchObject({ price: 101, size: 2 });
	});

	test('refuses sequence gaps, crossed books, and books5 frames', () => {
		const first = applyBlofinBookFrame(null, snapshot);
		if (first.status !== 'applied') throw new Error('expected snapshot');
		expect(applyBlofinBookFrame(first.state, { arg: snapshot.arg, action: 'update', data: { bids: [['100', '3']], asks: [], prevSeqId: '8', seqId: '11' } })).toMatchObject({ status: 'gap', state: { sequence: '10' } });
		expect(applyBlofinBookFrame(first.state, { arg: snapshot.arg, action: 'update', data: { bids: [['102', '1']], asks: [], prevSeqId: '10', seqId: '11' } })).toMatchObject({ status: 'invalid', state: { sequence: '10' } });
		expect(applyBlofinBookFrame(null, { ...snapshot, arg: { channel: 'books5', instId: 'BTC-USDT' } })).toMatchObject({ status: 'invalid', state: null });
	});
});
