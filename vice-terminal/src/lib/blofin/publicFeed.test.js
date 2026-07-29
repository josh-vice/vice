import { describe, expect, test } from 'bun:test';
import { BlofinPublicBookFeed } from './publicFeed.ts';

class FakeSocket {
	constructor(url) { this.url = url; this.sent = []; this.closed = false; this.onopen = null; this.onmessage = null; this.onerror = null; this.onclose = null; }
	send(data) { this.sent.push(data); }
	close() { this.closed = true; }
	open() { this.onopen?.(); }
	message(frame) { this.onmessage?.({ data: JSON.stringify(frame) }); }
}

function fakeTimer() {
	const timers = [];
	return {
		timers,
		setTimeout(callback, delay) { const entry = { callback, delay, cleared: false }; timers.push(entry); return entry; },
		clearTimeout(entry) { entry.cleared = true; },
		runNext() { const entry = timers.find((candidate) => !candidate.cleared); if (entry) { entry.cleared = true; entry.callback(); } }
	};
}

const snapshot = { arg: { channel: 'books', instId: 'BTC-USDT' }, action: 'snapshot', data: { prevSeqId: '0', seqId: '10', bids: [['100', '2']], asks: [['101', '3']] } };
const update = { arg: { channel: 'books', instId: 'BTC-USDT' }, action: 'update', data: { prevSeqId: '10', seqId: '11', bids: [['100', '0'], ['99', '1']], asks: [['101', '4']] } };
const instrument = { instrumentKey: 'blofin:linearPerp:BTC-USDT', venue: 'blofin', venueSymbol: 'BTC-USDT', product: 'linearPerp', baseAsset: 'BTC', quoteAsset: 'USDT', settlementAsset: 'USDT', contractMultiplier: '0.001', priceIncrement: '0.1', pricePrecision: { kind: 'fixedIncrement', increment: '0.1' }, sizeIncrement: '0.1' };

describe('BloFin public book lifecycle', () => {
	test('rejects a display-derived or cross-instrument event identity', () => {
		expect(() => new BlofinPublicBookFeed({ environment: 'demo', instId: 'BTC-USDT', instrument: { ...instrument, venueSymbol: 'ETH-USDT' } })).toThrow('catalog identity');
	});

	test('subscribes with exact identity and publishes only sequence-safe books', () => {
		const sockets = [];
		const statuses = [];
		const books = [];
		const events = [];
		const feed = new BlofinPublicBookFeed({ environment: 'demo', instId: 'BTC-USDT', instrument, now: () => 1700000000000, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, onStatus: (status) => statuses.push(status), onBook: (book) => books.push(book), onBookEvent: (event) => events.push(event) });
		feed.start();
		expect(sockets[0].url).toBe('wss://demo-trading-openapi.blofin.com/ws/public');
		sockets[0].open();
		expect(sockets[0].sent).toEqual(['{"op":"subscribe","args":[{"channel":"books","instId":"BTC-USDT"}]}']);
		sockets[0].message({ event: 'subscribe', arg: { channel: 'books', instId: 'BTC-USDT' } });
		sockets[0].message(snapshot);
		sockets[0].message(update);
		expect(statuses).toEqual(['connecting', 'live']);
		expect(books).toHaveLength(2);
		expect(books[1].bids[0]).toMatchObject({ price: 99, size: 1 });
		expect(books[1].asks[0]).toMatchObject({ price: 101, size: 4 });
		expect(events[1]).toMatchObject({ venue: 'blofin', instrumentKey: instrument.instrumentKey, connectionEpoch: 1, venueSequence: '11', receivedTimeUs: '1700000000000000', dedupeKey: 'books:BTC-USDT:11' });
	});

	test('marks a sequence gap stale and reconnects from a new snapshot', () => {
		const sockets = [];
		const statuses = [];
		const timer = fakeTimer();
		const feed = new BlofinPublicBookFeed({ environment: 'demo', instId: 'BTC-USDT', instrument, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, timer, onStatus: (status) => statuses.push(status) });
		feed.start();
		sockets[0].open();
		sockets[0].message(snapshot);
		sockets[0].message({ ...update, data: { ...update.data, prevSeqId: '9' } });
		expect(sockets[0].closed).toBe(true);
		expect(timer.timers[0].delay).toBe(1000);
		expect(statuses).toEqual(['connecting', 'live', 'stale']);
		timer.runNext();
		expect(sockets).toHaveLength(2);
		sockets[0].message(snapshot);
		expect(statuses).toEqual(['connecting', 'live', 'stale', 'connecting']);
	});

	test('fails closed when the local receipt clock cannot create an exact event timestamp', () => {
		const sockets = [];
		const timer = fakeTimer();
		const books = [];
		const feed = new BlofinPublicBookFeed({ environment: 'demo', instId: 'BTC-USDT', instrument, now: () => Number.MAX_SAFE_INTEGER, timer, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, onBook: (book) => books.push(book) });
		feed.start();
		sockets[0].open();
		sockets[0].message(snapshot);
		expect(books).toHaveLength(0);
		expect(sockets[0].closed).toBe(true);
		expect(timer.timers.some((entry) => !entry.cleared && entry.delay === 1000)).toBe(true);
	});

	test('ignores heartbeats and other instruments without publishing or reconnecting', () => {
		const sockets = [];
		const timer = fakeTimer();
		const books = [];
		const feed = new BlofinPublicBookFeed({ environment: 'demo', instId: 'BTC-USDT', instrument, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, timer, onBook: (book) => books.push(book) });
		feed.start();
		sockets[0].open();
		sockets[0].message({ event: 'pong' });
		sockets[0].message({ ...snapshot, arg: { channel: 'books', instId: 'ETH-USDT' } });
		expect(sockets[0].closed).toBe(false);
		expect(timer.timers).toHaveLength(0);
		expect(books).toHaveLength(0);
	});

	test('ignores frames from a socket replaced during recovery', () => {
		const sockets = [];
		const timer = fakeTimer();
		const books = [];
		const feed = new BlofinPublicBookFeed({ environment: 'demo', instId: 'BTC-USDT', instrument, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, timer, onBook: (book) => books.push(book) });
		feed.start();
		sockets[0].open();
		sockets[0].message(snapshot);
		sockets[0].message({ ...update, data: { ...update.data, prevSeqId: '9' } });
		timer.runNext();
		sockets[1].open();
		sockets[0].message(snapshot);
		sockets[1].message(snapshot);
		expect(books).toHaveLength(2);
	});

	test('does not reconnect after explicit stop', () => {
		const sockets = [];
		const timer = fakeTimer();
		const feed = new BlofinPublicBookFeed({ environment: 'demo', instId: 'BTC-USDT', instrument, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, timer });
		feed.start();
		sockets[0].open();
		sockets[0].message(snapshot);
		feed.stop();
		sockets[0].onclose?.();
		expect(timer.timers).toHaveLength(0);
	});
});
