#!/usr/bin/env bun

const environment = process.env.BLOFIN_ENV === 'live' ? 'live' : 'demo';
const instId = process.env.BLOFIN_INST_ID?.trim() || 'BTC-USDT';
const endpoint = environment === 'live'
	? 'wss://openapi.blofin.com/ws/public'
	: 'wss://demo-trading-openapi.blofin.com/ws/public';

/** Read one exact snapshot/update pair, then close before a fresh subscription. */
async function readContiguousBook() {
	return await new Promise((resolve, reject) => {
		const socket = new WebSocket(endpoint);
		const timeout = setTimeout(() => fail(new Error(`BloFin ${environment} public WebSocket timed out before a contiguous book update`)), 30_000);
		let settled = false;
		let snapshot = null;

		function finish(value) {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			try { socket.close(); } catch { /* the result is already known */ }
			resolve(value);
		}

		function fail(error) {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			try { socket.close(); } catch { /* the failure is already known */ }
			reject(error);
		}

		socket.onopen = () => socket.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'books', instId }] }));
		socket.onerror = () => fail(new Error(`BloFin ${environment} public WebSocket connection failed`));
		socket.onmessage = (event) => {
			let frame;
			try { frame = JSON.parse(String(event.data)); } catch { return fail(new Error('BloFin public WebSocket returned invalid JSON')); }
			if (frame.event === 'error') return fail(new Error(`BloFin public WebSocket rejected the subscription: ${frame.msg ?? 'unknown error'}`));
			if (frame.event === 'subscribe') return;
			if (frame.arg?.channel !== 'books' || frame.arg?.instId !== instId) return;
			const data = frame.data;
			if (!snapshot) {
				if (frame.action !== 'snapshot' || data?.prevSeqId !== '0' || !/^\d+$/.test(String(data?.seqId)) || !Array.isArray(data?.bids) || !Array.isArray(data?.asks) || data.bids.length === 0 || data.asks.length === 0) {
					return fail(new Error('BloFin public WebSocket returned an invalid initial book snapshot'));
				}
				snapshot = { seqId: BigInt(data.seqId), bidLevels: data.bids.length, askLevels: data.asks.length };
				return;
			}
			if (frame.action !== 'update' || String(data?.prevSeqId) !== snapshot.seqId.toString() || !/^\d+$/.test(String(data?.seqId)) || BigInt(data.seqId) <= snapshot.seqId || !Array.isArray(data?.bids) || !Array.isArray(data?.asks)) {
				return fail(new Error('BloFin public WebSocket returned a non-contiguous book update'));
			}
			finish({ snapshotSeqId: snapshot.seqId.toString(), updateSeqId: String(data.seqId), bidLevels: snapshot.bidLevels, askLevels: snapshot.askLevels });
		};
	});
}

const first = await readContiguousBook();
const second = await readContiguousBook();
console.log(JSON.stringify({ status: 'live-read', environment, instId, reconnect: { clean: true, connections: 2 }, first, second }));
