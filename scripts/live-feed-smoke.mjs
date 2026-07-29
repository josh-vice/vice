#!/usr/bin/env bun

/**
 * Runtime proof that the low-latency public Hyperliquid WebSocket feeds are
 * reachable. This deliberately uses the venue protocol directly instead of
 * the app's stores so a broken subscription cannot be hidden by UI state.
 */

const network = (process.env.VITE_HL_NETWORK ?? 'testnet').toLowerCase();
const endpoint = network === 'mainnet'
	? 'wss://api.hyperliquid.xyz/ws'
	: 'wss://api.hyperliquid-testnet.xyz/ws';
// Candle frames can be delayed by venue-side subscription queues while the
// lower-latency trading feeds are already flowing. Give the critical feeds a
// short readiness budget; the app validates candle history and trade-derived
// OHLC separately because a candle frame may wait for an interval boundary.
const criticalTimeoutMs = Number(process.env.VICE_LIVE_CRITICAL_FEED_TIMEOUT_MS ?? 12_000);
const timeoutMs = Number(process.env.VICE_LIVE_FEED_TIMEOUT_MS ?? 45_000);
const expected = new Set(['allMids', 'l2Book', 'trades']);
const critical = new Set(['allMids', 'l2Book', 'trades']);
const received = new Set();

if (!['testnet', 'mainnet'].includes(network)) throw new Error(`Invalid VITE_HL_NETWORK=${network}`);

const socket = new WebSocket(endpoint);
const result = await new Promise((resolve, reject) => {
	let criticalTimer;
	let timer;
	let finished = false;
	const finish = (error) => {
		if (finished) return;
		finished = true;
		clearTimeout(criticalTimer);
		clearTimeout(timer);
		try { socket.close(); } catch { /* best effort */ }
		if (error) reject(error);
		else resolve([...received]);
	};
	criticalTimer = setTimeout(() => {
		if (![...critical].every((name) => received.has(name))) {
			finish(new Error(`critical Hyperliquid feeds timed out; received ${[...received].join(', ') || 'none'}`));
		}
	}, criticalTimeoutMs);
	timer = setTimeout(() => finish(new Error(`live Hyperliquid feeds timed out; received ${[...received].join(', ') || 'none'}`)), timeoutMs);
	socket.addEventListener('error', () => finish(new Error(`could not connect to ${endpoint}`)));
	socket.addEventListener('open', () => {
		for (const subscription of [
			{ type: 'allMids' },
			{ type: 'l2Book', coin: 'BTC' },
			{ type: 'trades', coin: 'BTC' },
			// The application loads authoritative candle history over HTTP and
			// updates the active candle from the live trade stream. Candle WSS
			// frames are intentionally not a readiness requirement because the
			// venue may wait for an interval boundary before emitting one.
		]) socket.send(JSON.stringify({ method: 'subscribe', subscription }));
	});
	socket.addEventListener('message', (event) => {
		try {
			const message = JSON.parse(String(event.data));
			const channel = message?.channel;
			if (expected.has(channel)) received.add(channel);
			if ([...expected].every((name) => received.has(name))) finish();
		} catch {
			// Ignore venue heartbeats/frames that are not JSON data messages.
		}
	});
});

console.log(`✓ Hyperliquid WebSocket feeds (${network}): ${result.sort().join(', ')}`);
