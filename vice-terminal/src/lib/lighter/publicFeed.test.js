import { describe, expect, test } from 'bun:test';
import { LIGHTER_TESTNET_PUBLIC_WS } from './publicWs.ts';
import { LighterPublicBookFeed } from './publicFeed.ts';

class FakeSocket {
	constructor(url) { this.url = url; this.sent = []; this.closed = false; this.pings = 0; this.onopen = null; this.onmessage = null; this.onerror = null; this.onclose = null; }
	send(data) { this.sent.push(data); }
	close() { this.closed = true; }
	ping() { this.pings += 1; }
	open() { this.onopen?.(); }
	message(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
}

function fakeTimer() {
	const timeouts = [], intervals = [];
	return {
		timeouts, intervals,
		setTimeout(callback, delay) { const entry = { callback, delay, cleared: false }; timeouts.push(entry); return entry; },
		clearTimeout(entry) { entry.cleared = true; },
		setInterval(callback, delay) { const entry = { callback, delay, cleared: false }; intervals.push(entry); return entry; },
		clearInterval(entry) { entry.cleared = true; },
		runTimeout() { const entry = timeouts.find((item) => !item.cleared); if (entry) { entry.cleared = true; entry.callback(); } },
		runInterval() { const entry = intervals.find((item) => !item.cleared); entry?.callback(); }
	};
}

const instrument = { instrumentKey: 'lighter:spot:2048:ETH/USDC', venue: 'lighter', venueSymbol: 'ETH/USDC', product: 'spot', baseAsset: 'ETH', quoteAsset: 'USDC', settlementAsset: 'USDC', contractMultiplier: '1', priceIncrement: '0.01', pricePrecision: { kind: 'fixedIncrement', increment: '0.01' }, sizeIncrement: '0.0001' };
const connected = { type: 'connected' };
const snapshot = { type: 'subscribed/order_book', channel: 'order_book:2048', order_book: { code: 0, nonce: 10, begin_nonce: 0, bids: [{ price: '100', size: '2' }], asks: [{ price: '101', size: '3' }] } };
const update = { type: 'update/order_book', channel: 'order_book:2048', order_book: { code: 0, nonce: 11, begin_nonce: 10, bids: [{ price: '99', size: '1' }], asks: [{ price: '101', size: '4' }] } };

describe('Lighter public book lifecycle', () => {
	test('requires an exact catalog-created spot identity', () => {
		expect(() => new LighterPublicBookFeed({ marketId: 2048, instrument: { ...instrument, instrumentKey: 'lighter:spot:2049:ETH/USDC' } })).toThrow('exact spot market');
	});

	test('subscribes, pings a native transport, and publishes exact nonce events', () => {
		const sockets = [], statuses = [], books = [], events = [];
		const timer = fakeTimer();
		const feed = new LighterPublicBookFeed({ testnet: true, marketId: 2048, instrument, timer, now: () => 1700000000000, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, onStatus: (status) => statuses.push(status), onBook: (book) => books.push(book), onBookEvent: (event) => events.push(event) });
		feed.start();
		expect(sockets[0].url).toBe(LIGHTER_TESTNET_PUBLIC_WS);
		sockets[0].open();
		expect(sockets[0].sent).toEqual([]);
		sockets[0].message(connected);
		expect(sockets[0].sent).toEqual(['{"type":"subscribe","channel":"order_book/2048"}']);
		expect(timer.intervals[0].delay).toBe(90000);
		timer.runInterval();
		expect(sockets[0].pings).toBe(1);
		sockets[0].message(snapshot);
		sockets[0].message(update);
		expect(statuses).toEqual(['connecting', 'live']);
		expect(books).toHaveLength(2);
		expect(events[1]).toMatchObject({ venue: 'lighter', instrumentKey: instrument.instrumentKey, connectionEpoch: 1, venueSequence: '11', receivedTimeUs: '1700000000000000', dedupeKey: 'books:2048:11' });
	});

	test('does not publish a gap and reconnects from a fresh snapshot', () => {
		const sockets = [], statuses = [];
		const timer = fakeTimer();
		const feed = new LighterPublicBookFeed({ marketId: 2048, instrument, timer, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, onStatus: (status) => statuses.push(status) });
		feed.start();
		sockets[0].open();
		sockets[0].message(connected);
		sockets[0].message(snapshot);
		sockets[0].message({ ...update, order_book: { ...update.order_book, begin_nonce: 9 } });
		expect(sockets[0].closed).toBe(true);
		expect(timer.timeouts[0].delay).toBe(1000);
		expect(statuses).toEqual(['connecting', 'live', 'stale']);
		timer.runTimeout();
		expect(sockets).toHaveLength(2);
	});

	test('stops the keepalive and cannot reconnect after explicit stop', () => {
		const sockets = [];
		const timer = fakeTimer();
		const feed = new LighterPublicBookFeed({ marketId: 2048, instrument, timer, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; } });
		feed.start();
		sockets[0].open();
		sockets[0].message(connected);
		feed.stop();
		timer.runInterval();
		sockets[0].onclose?.();
		expect(sockets[0].pings).toBe(0);
		expect(timer.timeouts).toHaveLength(0);
	});
});
