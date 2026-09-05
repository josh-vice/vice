/// <reference lib="webworker" />
import { hyperliquidWsUrl, isPublicPlaneFrameWithinLimit, type PublicPlaneCandle, type PublicPlaneEvent, type PublicPlaneRequest, type PublicPlaneTrade } from './protocol';

type Network = 'testnet' | 'mainnet';
type Endpoint = {
	postMessage(message: PublicPlaneEvent): void;
	onmessage: ((event: MessageEvent<PublicPlaneRequest>) => void) | null;
	start?: () => void;
};
type EndpointState = { network: Network; tradeCoin?: string; candle?: { coin: string; interval: string } };
type SocketState = { socket: WebSocket; epoch: number; sequence: number; tradeCoins: Set<string>; candleKeys: Set<string> };
type RawTrade = { coin?: unknown; tid?: unknown; px?: unknown; sz?: unknown; side?: unknown; time?: unknown };
type RawCandle = { t?: unknown; s?: unknown; i?: unknown; o?: unknown; c?: unknown; h?: unknown; l?: unknown; v?: unknown };

const endpoints = new Map<Endpoint, EndpointState>();
const sockets = new Map<Network, SocketState>();
let nextEpoch = 0;

function publish(network: Network, event: PublicPlaneEvent): void {
	for (const [endpoint, state] of endpoints) {
		if (state.network !== network) continue;
		if (event.type === 'trades' && state.tradeCoin !== event.coin) continue;
		if (event.type === 'candle' && (state.candle?.coin !== event.coin || state.candle.interval !== event.interval)) continue;
		endpoint.postMessage(event);
	}
}

function candleKey(coin: string, interval: string): string { return `${coin}\u0000${interval}`; }

function requestedCandles(network: Network): Map<string, { coin: string; interval: string }> {
	const candles = new Map<string, { coin: string; interval: string }>();
	for (const state of endpoints.values()) {
		if (state.network === network && state.candle) candles.set(candleKey(state.candle.coin, state.candle.interval), state.candle);
	}
	return candles;
}

function requestedTradeCoins(network: Network): Set<string> {
	return new Set([...endpoints.values()]
		.filter((state) => state.network === network && state.tradeCoin)
		.map((state) => state.tradeCoin!));
}

function sendTradeSubscription(network: Network, coin: string, method: 'subscribe' | 'unsubscribe'): void {
	const socket = sockets.get(network)?.socket;
	if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ method, subscription: { type: 'trades', coin } }));
}

function updateTradeSubscription(network: Network): void {
	const state = sockets.get(network);
	if (!state || state.socket.readyState !== WebSocket.OPEN) return;
	const requested = requestedTradeCoins(network);
	for (const coin of state.tradeCoins) {
		if (!requested.has(coin)) {
			sendTradeSubscription(network, coin, 'unsubscribe');
			state.tradeCoins.delete(coin);
		}
	}
	for (const coin of requested) {
		if (!state.tradeCoins.has(coin)) {
			sendTradeSubscription(network, coin, 'subscribe');
			state.tradeCoins.add(coin);
		}
	}
}

function sendCandleSubscription(network: Network, candle: { coin: string; interval: string }, method: 'subscribe' | 'unsubscribe'): void {
	const socket = sockets.get(network)?.socket;
	if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ method, subscription: { type: 'candle', ...candle } }));
}

function updateCandleSubscription(network: Network): void {
	const state = sockets.get(network);
	if (!state || state.socket.readyState !== WebSocket.OPEN) return;
	const requested = requestedCandles(network);
	for (const key of state.candleKeys) {
		if (!requested.has(key)) {
			const [coin, interval] = key.split('\u0000');
			sendCandleSubscription(network, { coin, interval }, 'unsubscribe');
			state.candleKeys.delete(key);
		}
	}
	for (const [key, candle] of requested) {
		if (!state.candleKeys.has(key)) {
			sendCandleSubscription(network, candle, 'subscribe');
			state.candleKeys.add(key);
		}
	}
}

function normalizeTrades(data: unknown): { coin: string; trades: PublicPlaneTrade[] } | null {
	if (!Array.isArray(data) || data.length === 0) return null;
	const raw = data as RawTrade[];
	const coin = raw[0]?.coin;
	if (typeof coin !== 'string' || !coin || raw.some((trade) => trade.coin !== coin)) return null;
	const trades: PublicPlaneTrade[] = [];
	for (const trade of raw) {
		const price = Number(trade.px);
		const size = Number(trade.sz);
		if (typeof trade.tid !== 'number' || !Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size <= 0 ||
			(trade.side !== 'B' && trade.side !== 'A') || typeof trade.time !== 'number') return null;
		trades.push({ id: `${trade.tid}`, price, size, side: trade.side === 'B' ? 'buy' : 'sell', timestamp: trade.time });
	}
	return { coin, trades };
}

function normalizeCandle(data: unknown): { coin: string; interval: string; candle: PublicPlaneCandle } | null {
	if (!data || typeof data !== 'object') return null;
	const raw = data as RawCandle;
	const values = [raw.o, raw.c, raw.h, raw.l, raw.v].map(Number);
	if (typeof raw.s !== 'string' || !raw.s || typeof raw.i !== 'string' || !raw.i || typeof raw.t !== 'number' ||
		values.some((value) => !Number.isFinite(value)) || values[0] <= 0 || values[1] <= 0 || values[2] <= 0 || values[3] <= 0 || values[4] < 0) return null;
	const [open, close, high, low, volume] = values;
	if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
	return { coin: raw.s, interval: raw.i, candle: { time: Math.floor(raw.t / 1000), open, close, high, low, volume } };
}

function closeNetwork(network: Network): void {
	const state = sockets.get(network);
	if (!state) return;
	state.socket.close();
	sockets.delete(network);
}

function ensureSocket(network: Network): void {
	if (sockets.has(network)) return;
	const epoch = ++nextEpoch;
	publish(network, { type: 'status', network, epoch, status: 'connecting' });
	const socket = new WebSocket(hyperliquidWsUrl(network));
	sockets.set(network, { socket, epoch, sequence: 0, tradeCoins: new Set(), candleKeys: new Set() });
	socket.addEventListener('open', () => {
		if (sockets.get(network)?.epoch !== epoch) return;
		socket.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids' } }));
		updateTradeSubscription(network);
		updateCandleSubscription(network);
		publish(network, { type: 'status', network, epoch, status: 'open' });
	});
	socket.addEventListener('message', (event) => {
		const socketState = sockets.get(network);
		if (!socketState || socketState.epoch !== epoch || typeof event.data !== 'string') return;
		if (!isPublicPlaneFrameWithinLimit(event.data)) {
			publish(network, { type: 'status', network, epoch, status: 'error', reason: 'Hyperliquid public frame exceeded the safety limit' });
			return;
		}
		try {
			const frame = JSON.parse(event.data) as { channel?: string; data?: unknown };
			const receivedAtMs = Date.now();
			const receivedAtMonoMs = performance.now();
			const sequence = ++socketState.sequence;
			if (frame.channel === 'allMids' && frame.data && typeof frame.data === 'object' && 'mids' in frame.data) {
				const mids = (frame.data as { mids?: unknown }).mids;
				if (mids && typeof mids === 'object') publish(network, { type: 'allMids', network, epoch, sequence, receivedAtMs, receivedAtMonoMs, mids: mids as Record<string, string> });
			} else if (frame.channel === 'trades') {
				const normalized = normalizeTrades(frame.data);
				if (normalized) publish(network, { type: 'trades', network, epoch, sequence, receivedAtMs, receivedAtMonoMs, ...normalized });
			} else if (frame.channel === 'candle') {
				const normalized = normalizeCandle(frame.data);
				if (normalized) publish(network, { type: 'candle', network, epoch, sequence, receivedAtMs, receivedAtMonoMs, ...normalized });
			}
		} catch {
			// Malformed public frames never become data-plane state.
		}
	});
	socket.addEventListener('close', () => {
		if (sockets.get(network)?.epoch !== epoch) return;
		sockets.delete(network);
		publish(network, { type: 'status', network, epoch, status: 'closed' });
	});
	socket.addEventListener('error', () => {
		if (sockets.get(network)?.epoch === epoch) publish(network, { type: 'status', network, epoch, status: 'error', reason: 'Hyperliquid public socket error' });
	});
}

function bind(endpoint: Endpoint): void {
	endpoint.start?.();
	endpoint.onmessage = (event) => {
		if (event.data.type === 'disconnect') {
			const state = endpoints.get(endpoint);
			endpoints.delete(endpoint);
			if (state) {
				updateTradeSubscription(state.network);
				updateCandleSubscription(state.network);
				if (![...endpoints.values()].some((candidate) => candidate.network === state.network)) closeNetwork(state.network);
			}
			return;
		}
		if (event.data.type === 'setTrades') {
			const state = endpoints.get(endpoint);
			if (!state) return;
			state.tradeCoin = event.data.coin;
			endpoints.set(endpoint, state);
			updateTradeSubscription(state.network);
			return;
		}
		if (event.data.type === 'setCandle') {
			const state = endpoints.get(endpoint);
			if (!state) return;
			state.candle = event.data.coin && event.data.interval ? { coin: event.data.coin, interval: event.data.interval } : undefined;
			endpoints.set(endpoint, state);
			updateCandleSubscription(state.network);
			return;
		}
		endpoints.set(endpoint, { network: event.data.network });
		ensureSocket(event.data.network);
	};
}

const scope = self as unknown as { onconnect?: (event: MessageEvent<readonly MessagePort[]>) => void; onmessage: ((event: MessageEvent<PublicPlaneRequest>) => void) | null };
if ('onconnect' in scope) scope.onconnect = (event) => bind(event.ports[0] as unknown as Endpoint);
else bind(scope as unknown as Endpoint);
