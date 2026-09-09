import type { EventEnvelope, VenueId } from '$lib/venue/identity';
import { eventTimeUsFromMs } from '$lib/venue/identity';
import type { VenueSessionRef } from '$lib/venue/adapter';
import { BLOFIN_ENVIRONMENTS, type BlofinEnvironment } from './environment';
import type { BlofinBookPayload } from '$lib/venue/blofin';
import { assertBlofinInstrument, blofinBookEvent } from '$lib/venue/blofin';
import type { BlofinMarket } from './markets';

const OPEN = 1;
const DEFAULT_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_ATTEMPTS = 8;

export interface BlofinWebSocketLike {
	readonly readyState: number;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	onopen: (() => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onerror: (() => void) | null;
	onclose: (() => void) | null;
}

export type BlofinWebSocketFactory = (url: string) => BlofinWebSocketLike;

export interface BlofinPublicCallbacks {
	onBook?: (event: EventEnvelope<BlofinBookPayload>) => void;
	onTrade?: (event: EventEnvelope<unknown>) => void;
	onTicker?: (event: EventEnvelope<unknown>) => void;
	onCandle?: (event: EventEnvelope<unknown>) => void;
	onError?: (message: string) => void;
}

export interface BlofinPublicOptions {
	webSocketFactory?: BlofinWebSocketFactory;
	reconnectDelayMs?: number;
	now?: () => number;
	setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
	clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

function defaultWebSocketFactory(url: string): BlofinWebSocketLike {
	if (typeof WebSocket === 'undefined') throw new Error('BloFin public WebSocket is unavailable in this runtime');
	return new WebSocket(url) as unknown as BlofinWebSocketLike;
}

function publicEnvironment(environment: VenueSessionRef['environment']): BlofinEnvironment {
	if (environment !== 'demo' && environment !== 'production') {
		throw new Error(`BloFin public feed does not support environment ${environment}`);
	}
	return environment;
}

function frameObject(data: unknown): Record<string, unknown> | null {
	if (typeof data !== 'string') return data && typeof data === 'object' ? data as Record<string, unknown> : null;
	try {
		const parsed: unknown = JSON.parse(data);
		return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
	} catch {
		return null;
	}
}

function channelOf(frame: Record<string, unknown>): string | null {
	const arg = frame.arg;
	if (!arg || typeof arg !== 'object') return null;
	const channel = (arg as { channel?: unknown }).channel;
	return typeof channel === 'string' ? channel : null;
}

function timestampMs(payload: Record<string, unknown>, now: () => number): number {
	for (const key of ['ts', 'timestamp', 'time']) {
		const value = payload[key];
		if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
		if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
	}
	return now();
}

function genericEvent(
	channel: string,
	payload: unknown,
	market: BlofinMarket,
	epoch: number,
	ordinal: number,
	receivedAtMs: number,
	now: () => number
): EventEnvelope<unknown> {
	const payloadRecord = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
	const eventAt = timestampMs(payloadRecord, now);
	return {
		venue: 'blofin' as VenueId,
		instrumentKey: market.instrument.instrumentKey,
		subscriptionKey: `blofin:${channel}:${market.instId}`,
		connectionEpoch: epoch,
		eventTimeUs: eventTimeUsFromMs(eventAt, 'BloFin public event time'),
		receivedTimeUs: eventTimeUsFromMs(receivedAtMs, 'BloFin public receipt time'),
		dedupeKey: `${channel}:${market.instId}:${eventAt}:${epoch}:${ordinal}`,
		payload
	};
}

export async function startBlofinPublic(
	session: VenueSessionRef,
	market: BlofinMarket,
	callbacks: BlofinPublicCallbacks = {},
	options: BlofinPublicOptions = {}
): Promise<() => void> {
	if (session.venue !== 'blofin') throw new Error('BloFin public feed requires a BloFin session');
	const environment = publicEnvironment(session.environment);
	assertBlofinInstrument(market);
	const factory = options.webSocketFactory ?? defaultWebSocketFactory;
	const reconnectDelayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
	if (!Number.isFinite(reconnectDelayMs) || reconnectDelayMs < 0) throw new Error('BloFin reconnect delay must be non-negative');
	const now = options.now ?? Date.now;
	const setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
	const clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
	let stopped = false;
	let socket: BlofinWebSocketLike | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	let connectionEpoch = 0;
	let subscriptionEpoch = 0;
	let eventOrdinal = 0;

	const report = (message: string): void => {
		callbacks.onError?.(message.slice(0, 240));
	};
	const subscribe = (): void => {
		if (!socket || socket.readyState !== OPEN) return;
		socket.send(JSON.stringify({
			op: 'subscribe',
			args: [
				{ channel: 'books5', instId: market.instId },
				{ channel: 'trades', instId: market.instId },
				{ channel: 'tickers', instId: market.instId },
				{ channel: 'candle1m', instId: market.instId }
			]
		}));
		subscriptionEpoch += 1;
	};
	const connect = (): void => {
		if (stopped) return;
		connectionEpoch += 1;
		eventOrdinal = 0;
		socket = factory(BLOFIN_ENVIRONMENTS[environment].publicWs);
		socket.onopen = () => {
			reconnectAttempts = 0;
			subscribe();
		};
		socket.onmessage = ({ data }) => {
			try {
				if (data === 'ping') {
					if (socket?.readyState === OPEN) socket.send('pong');
					return;
				}
				const frame = frameObject(data);
				if (!frame) return report('BloFin public feed sent a malformed frame');
				if (frame.event === 'error') return report('BloFin public feed subscription error');
				const channel = channelOf(frame);
				if (!channel || !Array.isArray(frame.data)) return;
				for (const payload of frame.data) {
					if (!payload || typeof payload !== 'object') return report('BloFin public feed sent malformed channel data');
					eventOrdinal += 1;
					const receivedAtMs = now();
					if (channel === 'books5') {
						callbacks.onBook?.(blofinBookEvent(market, payload as BlofinBookPayload, connectionEpoch, subscriptionEpoch, eventOrdinal, receivedAtMs));
					} else {
						const event = genericEvent(channel, payload, market, connectionEpoch, eventOrdinal, receivedAtMs, now);
						if (channel === 'trades') callbacks.onTrade?.(event);
						else if (channel === 'tickers') callbacks.onTicker?.(event);
						else if (channel === 'candle1m') callbacks.onCandle?.(event);
					}
				}
			} catch {
				report('BloFin public feed frame was rejected');
			}
		};
		socket.onerror = () => report('BloFin public feed transport error');
		socket.onclose = () => {
			if (stopped || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
			reconnectAttempts += 1;
			reconnectTimer = setTimer(() => {
				reconnectTimer = null;
				connect();
		}, reconnectDelayMs);
		};
	};
	connect();
	return () => {
		stopped = true;
		if (reconnectTimer !== null) clearTimer(reconnectTimer);
		reconnectTimer = null;
		const current = socket;
		socket = null;
		if (current) {
			current.onopen = null;
			current.onmessage = null;
			current.onerror = null;
			current.onclose = null;
			if (current.readyState === OPEN) current.close(1000, 'Vice feed stopped');
		}
	};
}
