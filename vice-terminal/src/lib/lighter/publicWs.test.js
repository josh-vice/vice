import { describe, expect, test } from 'bun:test';
import { applyLighterBookFrame, lighterBookSubscribe } from './publicWs.ts';

const snapshot = {
	type: 'subscribed/order_book', channel: 'order_book:2048',
	order_book: { code: 0, nonce: 10, begin_nonce: 0, bids: [{ price: '100', size: '2' }], asks: [{ price: '101', size: '3' }] }
};
const update = {
	type: 'update/order_book', channel: 'order_book:2048',
	order_book: { code: 0, nonce: 11, begin_nonce: 10, bids: [{ price: '100', size: '0' }, { price: '99', size: '1' }], asks: [{ price: '101', size: '4' }] }
};

describe('Lighter public book continuity', () => {
	test('subscribes only by exact numeric market id', () => {
		expect(lighterBookSubscribe(2048)).toBe('{"type":"subscribe","channel":"order_book/2048"}');
		expect(() => lighterBookSubscribe(-1)).toThrow('exact market id');
	});

	test('uses the first documented snapshot and applies only nonce-contiguous updates', () => {
		const first = applyLighterBookFrame(null, 2048, snapshot);
		expect(first.status).toBe('applied');
		if (first.status !== 'applied') throw new Error('expected snapshot');
		const second = applyLighterBookFrame(first.state, 2048, update);
		expect(second).toMatchObject({ status: 'applied', state: { nonce: '11' } });
		if (second.status !== 'applied') throw new Error('expected update');
		expect(second.book.bids[0]).toMatchObject({ price: 99, size: 1 });
		expect(second.book.asks[0]).toMatchObject({ price: 101, size: 4 });
	});

	test('fails closed on a bad channel, corrupt snapshot, or nonce gap', () => {
		expect(applyLighterBookFrame(null, 2048, { ...snapshot, channel: 'order_book:1' }).status).toBe('invalid');
		expect(applyLighterBookFrame(null, 2048, { ...snapshot, order_book: { ...snapshot.order_book, code: 1 } }).status).toBe('invalid');
		expect(applyLighterBookFrame(null, 2048, { ...snapshot, type: 'update/order_book' }).status).toBe('invalid');
		const first = applyLighterBookFrame(null, 2048, snapshot);
		if (first.status !== 'applied') throw new Error('expected snapshot');
		expect(applyLighterBookFrame(first.state, 2048, { ...update, order_book: { ...update.order_book, begin_nonce: 9 } }).status).toBe('gap');
	});
});
