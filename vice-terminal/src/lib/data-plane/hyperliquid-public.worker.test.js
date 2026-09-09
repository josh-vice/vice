import { afterAll, describe, expect, test } from 'bun:test';

class FakeWebSocket {
	static OPEN = 1;
	static instances = [];
	readyState = 0;
	sent = [];
	listeners = new Map();
	constructor(url) {
		this.url = url;
		FakeWebSocket.instances.push(this);
	}
	addEventListener(type, listener) {
		const listeners = this.listeners.get(type) ?? [];
		listeners.push(listener);
		this.listeners.set(type, listeners);
	}
	send(message) { this.sent.push(JSON.parse(message)); }
	emit(type, value = {}) { for (const listener of this.listeners.get(type) ?? []) listener(value); }
	open() { this.readyState = FakeWebSocket.OPEN; this.emit('open'); }
	message(frame) { this.emit('message', { data: JSON.stringify(frame) }); }
	rawMessage(data) { this.emit('message', { data }); }
	close() { this.readyState = 3; this.emit('close'); }
}

function endpoint() {
	return {
		messages: [],
		started: false,
		postMessage(message) { this.messages.push(message); },
		start() { this.started = true; },
		onmessage: null
	};
}

globalThis.WebSocket = FakeWebSocket;
const workerScope = { onconnect: null };
globalThis.self = workerScope;
await import(`./hyperliquid-public.worker.ts?lifecycle=${Date.now()}`);

function connect(port, network) {
	workerScope.onconnect({ ports: [port] });
	port.onmessage({ data: { type: 'connect', network } });
}

afterAll(() => {
	globalThis.self = undefined;
});

describe('Hyperliquid public worker lifecycle', () => {
	test('multiplexes networks and subscriptions without cross-network delivery', () => {
		const testnet = endpoint();
		const mainnet = endpoint();
		connect(testnet, 'testnet');
		connect(mainnet, 'mainnet');
		expect(testnet.started).toBe(true);
		expect(mainnet.started).toBe(true);
		const testSocket = FakeWebSocket.instances.find((socket) => socket.url.includes('testnet'));
		const mainSocket = FakeWebSocket.instances.find((socket) => socket.url.includes('api.hyperliquid.xyz'));
		testSocket.open();
		mainSocket.open();
		expect(testSocket.sent).toContainEqual({ method: 'subscribe', subscription: { type: 'allMids' } });
		expect(mainSocket.sent).toContainEqual({ method: 'subscribe', subscription: { type: 'allMids' } });

		testnet.onmessage({ data: { type: 'setTrades', coin: 'BTC' } });
		testnet.onmessage({ data: { type: 'setCandle', coin: 'BTC', interval: '1m' } });
		expect(testSocket.sent).toContainEqual({ method: 'subscribe', subscription: { type: 'trades', coin: 'BTC' } });
		expect(testSocket.sent).toContainEqual({ method: 'subscribe', subscription: { type: 'candle', coin: 'BTC', interval: '1m' } });

		testSocket.message({ channel: 'allMids', data: { mids: { BTC: '70000' } } });
		expect(testnet.messages.at(-1)).toMatchObject({ type: 'allMids', network: 'testnet', mids: { BTC: '70000' }, receivedAtMs: expect.any(Number), receivedAtMonoMs: expect.any(Number) });
		const testMessages = testnet.messages.length;
		mainSocket.message({ channel: 'allMids', data: { mids: { BTC: '70001' } } });
		expect(testnet.messages).toHaveLength(testMessages);
		expect(mainnet.messages.at(-1)).toMatchObject({ type: 'allMids', network: 'mainnet' });
	});

	test('removes subscriptions and drops stale socket epochs after reconnect', () => {
		const port = endpoint();
		connect(port, 'testnet');
		const first = FakeWebSocket.instances.filter((socket) => socket.url.includes('testnet')).at(-1);
		first.open();
		port.onmessage({ data: { type: 'setTrades', coin: 'ETH' } });
		port.onmessage({ data: { type: 'setTrades' } });
		expect(first.sent).toContainEqual({ method: 'unsubscribe', subscription: { type: 'trades', coin: 'ETH' } });
		const beforeClose = port.messages.length;
		first.close();
		expect(port.messages.at(-1)).toMatchObject({ type: 'status', status: 'closed' });
		port.onmessage({ data: { type: 'connect', network: 'testnet' } });
		const second = FakeWebSocket.instances.filter((socket) => socket.url.includes('testnet')).at(-1);
		expect(second).not.toBe(first);
		second.open();
		const afterReconnect = port.messages.length;
		first.message({ channel: 'allMids', data: { mids: { BTC: '1' } } });
		expect(port.messages).toHaveLength(afterReconnect);
		expect(beforeClose).toBeGreaterThan(0);
	});

	test('rejects an oversized raw frame before parsing or state delivery', () => {
		const port = endpoint();
		connect(port, 'mainnet');
		const socket = FakeWebSocket.instances.filter((candidate) => candidate.url.includes('api.hyperliquid.xyz')).at(-1);
		socket.open();
		socket.rawMessage('x'.repeat(512 * 1024 + 1));
		expect(port.messages.at(-1)).toMatchObject({ type: 'status', network: 'mainnet', status: 'error' });
		expect(port.messages.at(-1).reason).toContain('safety limit');
	});
});
