import { describe, expect, test } from 'bun:test';
import { BlofinPrivateFeed, blofinPrivateLogin } from './privateWs.ts';
import { blofinAccountRef, blofinKeyFingerprint } from './vault.ts';

class FakeSocket {
	constructor(url) { this.url = url; this.sent = []; this.closed = false; this.onopen = null; this.onmessage = null; this.onerror = null; this.onclose = null; }
	send(data) { this.sent.push(data); }
	close() { this.closed = true; }
	open() { this.onopen?.(); }
	message(frame) { this.onmessage?.({ data: typeof frame === 'string' ? frame : JSON.stringify(frame) }); }
}

function fakeTimer() {
	const timers = [];
	return {
		timers,
		setTimeout(callback, delay) { const entry = { callback, delay, cleared: false }; timers.push(entry); return entry; },
		clearTimeout(entry) { entry.cleared = true; },
		runNext() { const entry = timers.find((candidate) => !candidate.cleared); if (entry) { entry.cleared = true; entry.callback(); } },
		runDelay(delay) { const entry = timers.find((candidate) => !candidate.cleared && candidate.delay === delay); if (entry) { entry.cleared = true; entry.callback(); } }
	};
}

async function waitForSend(socket) {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		if (socket.sent.length > 0) return;
		await new Promise((resolve) => setTimeout(resolve, 1));
	}
	throw new Error('expected the private socket to send a login frame');
}

const credentials = { apiKey: 'demo-key', secretKey: 'demo-secret', passphrase: 'demo-passphrase', permissions: ['READ', 'TRADE'] };

async function account() {
	return blofinAccountRef('demo', await blofinKeyFingerprint(credentials.apiKey));
}

describe('BloFin private WebSocket lifecycle', () => {
	test('signs the documented login path and never serializes the secret', async () => {
		const message = await blofinPrivateLogin(credentials, 1700000000000, 'nonce-1');
		expect(message).toContain('"op":"login"');
		expect(message).toContain('"timestamp":"1700000000000"');
		expect(message).toContain('"nonce":"nonce-1"');
		expect(message).not.toContain(credentials.secretKey);
		await expect(blofinPrivateLogin({ ...credentials, permissions: ['TRADE'] }, 1, 'nonce')).rejects.toThrow('READ');
	});

	test('subscribes only after authentication and coalesces private updates into reconciliation', async () => {
		const sockets = [];
		const timer = fakeTimer();
		const statuses = [];
		const reconciliations = [];
		const feed = new BlofinPrivateFeed({ environment: 'demo', credentials, account: await account(), timer, now: () => 1700000000000, nonceFactory: () => 'nonce-1', createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, onStatus: (status) => statuses.push(status), onReconcileRequested: (request) => { reconciliations.push(request); } });
		await feed.start();
		expect(sockets[0].url).toBe('wss://demo-trading-openapi.blofin.com/ws/private');
		sockets[0].open();
		await waitForSend(sockets[0]);
		expect(JSON.parse(sockets[0].sent[0])).toMatchObject({ op: 'login', args: [{ apiKey: 'demo-key', passphrase: 'demo-passphrase', timestamp: '1700000000000', nonce: 'nonce-1' }] });
		sockets[0].message({ event: 'login', code: '0' });
		expect(JSON.parse(sockets[0].sent[1])).toEqual({ op: 'subscribe', args: [{ channel: 'account' }, { channel: 'positions' }, { channel: 'orders' }, { channel: 'orders-algo' }] });
		expect(statuses).toEqual(['connecting', 'authenticating', 'live']);
		timer.runDelay(0);
		await Promise.resolve();
		expect(reconciliations).toEqual([{ reason: 'authenticated' }]);
		sockets[0].message({ arg: { channel: 'orders' }, data: [{ orderId: '1' }] });
		sockets[0].message({ arg: { channel: 'positions' }, data: [{ positionId: '2' }] });
		timer.runDelay(250);
		await Promise.resolve();
		expect(reconciliations).toMatchObject([
			{ reason: 'authenticated' },
			{ reason: 'private-update', event: { venue: 'blofin', accountKey: (await account()).accountKey, connectionEpoch: 1, receivedTimeUs: '1700000000000000', dedupeKey: 'private:orders:1:1', payload: { channel: 'orders' } } }
		]);
		expect(reconciliations[1].event.venueSequence).toBeUndefined();
	});

	test('fails closed on login rejection and reconnects without subscribing', async () => {
		const sockets = [];
		const timer = fakeTimer();
		const statuses = [];
		const feed = new BlofinPrivateFeed({ environment: 'demo', credentials, account: await account(), timer, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; }, onStatus: (status) => statuses.push(status) });
		await feed.start();
		sockets[0].open();
		await waitForSend(sockets[0]);
		sockets[0].message({ event: 'login', code: '60009' });
		expect(sockets[0].closed).toBe(true);
		expect(sockets[0].sent).toHaveLength(1);
		expect(statuses).toEqual(['connecting', 'authenticating', 'stale']);
		expect(timer.timers.some((entry) => entry.delay === 1000 && !entry.cleared)).toBe(true);
	});

	test('pings after inactivity and reconnects when no pong arrives', async () => {
		const sockets = [];
		const timer = fakeTimer();
		const feed = new BlofinPrivateFeed({ environment: 'demo', credentials, account: await account(), timer, heartbeatMs: 1000, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; } });
		await feed.start();
		sockets[0].open();
		await waitForSend(sockets[0]);
		sockets[0].message({ event: 'login', code: '0' });
		timer.runNext();
		expect(sockets[0].sent).toContain('ping');
		timer.runNext();
		expect(sockets[0].closed).toBe(true);
		expect(timer.timers.some((entry) => entry.delay === 1000 && !entry.cleared)).toBe(true);
	});

	test('does not reconnect after explicit stop', async () => {
		const sockets = [];
		const timer = fakeTimer();
		const feed = new BlofinPrivateFeed({ environment: 'demo', credentials, account: await account(), timer, createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; } });
		await feed.start();
		sockets[0].open();
		await waitForSend(sockets[0]);
		feed.stop();
		sockets[0].onclose?.();
		expect(timer.timers.filter((entry) => !entry.cleared)).toHaveLength(0);
	});

	test('rejects a selected account that does not match the unlocked key before opening a socket', async () => {
		const sockets = [];
		const feed = new BlofinPrivateFeed({ environment: 'demo', credentials, account: blofinAccountRef('demo', 'a'.repeat(24)), createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket; } });
		await expect(feed.start()).rejects.toThrow('unlocked API key');
		expect(sockets).toHaveLength(0);
	});
});
