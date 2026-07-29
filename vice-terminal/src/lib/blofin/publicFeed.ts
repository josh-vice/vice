import { BLOFIN_DEMO_PUBLIC_WS, BLOFIN_PUBLIC_WS, applyBlofinBookFrame, blofinPublicSubscribe, type BlofinBookState } from './publicWs';
import type { BlofinEnvironment } from './vault';
import type { OrderBook } from '$lib/types';
import { assertEventEnvelope, assertInstrumentId, eventTimeUsFromMs, type EventEnvelope, type InstrumentId } from '$lib/venue/identity';
import { markFeedReconnect } from '$lib/native/performance';

export type BlofinPublicFeedStatus = 'idle' | 'connecting' | 'live' | 'stale' | 'error';

export interface BlofinSocket {
	send(data: string): void;
	close(): void;
	onopen: (() => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onerror: (() => void) | null;
	onclose: (() => void) | null;
}

type Timer = Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'>;

export type BlofinPublicFeedOptions = {
	environment: BlofinEnvironment;
	instId: string;
	/** The catalog-validated canonical identity for this exact wire instrument. */
	instrument: InstrumentId;
	createSocket?: (url: string) => BlofinSocket;
	timer?: Timer;
	now?: () => number;
	onStatus?: (status: BlofinPublicFeedStatus) => void;
	onBook?: (book: OrderBook) => void;
	/** Sequence-safe public book event; no account or execution state is included. */
	onBookEvent?: (event: EventEnvelope<OrderBook>) => void;
	onError?: (message: string) => void;
};

function messageText(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

/**
 * One exact-instrument public book feed. A rejected or discontinuous frame is
 * never published; it marks the feed stale and reconnects for a fresh
 * `prevSeqId=0` snapshot.
 */
export class BlofinPublicBookFeed {
	private readonly endpoint: string;
	private readonly createSocket: (url: string) => BlofinSocket;
	private readonly timer: Timer;
	private readonly now: () => number;
	private socket: BlofinSocket | null = null;
	private state: BlofinBookState | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private generation = 0;
	private reconnectAttempt = 0;
	private running = false;
	private status: BlofinPublicFeedStatus = 'idle';

	constructor(private readonly options: BlofinPublicFeedOptions) {
		if (options.instId.trim().length === 0) throw new Error('BloFin public feed requires an exact instId');
		assertInstrumentId(options.instrument);
		if (options.instrument.venue !== 'blofin' || options.instrument.venueSymbol !== options.instId) {
			throw new Error('BloFin public feed requires the catalog identity for its exact instId');
		}
		this.endpoint = options.environment === 'demo' ? BLOFIN_DEMO_PUBLIC_WS : BLOFIN_PUBLIC_WS;
		this.createSocket = options.createSocket ?? ((url) => new WebSocket(url) as unknown as BlofinSocket);
		this.timer = options.timer ?? globalThis;
		this.now = options.now ?? Date.now;
	}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.reconnectAttempt = 0;
		this.connect();
	}

	stop(): void {
		this.running = false;
		this.generation += 1;
		if (this.reconnectTimer !== null) this.timer.clearTimeout(this.reconnectTimer);
		this.reconnectTimer = null;
		const socket = this.socket;
		this.socket = null;
		this.state = null;
		if (socket) socket.close();
		this.setStatus('idle');
	}

	private connect(): void {
		if (!this.running) return;
		const generation = ++this.generation;
		this.state = null;
		this.setStatus('connecting');
		let socket: BlofinSocket;
		try {
			socket = this.createSocket(this.endpoint);
		} catch (error) {
			this.reconnect(`BloFin public socket could not start: ${error instanceof Error ? error.message : 'unknown error'}`);
			return;
		}
		this.socket = socket;
		socket.onopen = () => {
			if (!this.isCurrent(generation, socket)) return;
			try { socket.send(blofinPublicSubscribe('books', this.options.instId)); }
			catch (error) { this.reconnect(`BloFin public subscription failed: ${error instanceof Error ? error.message : 'unknown error'}`); }
		};
		socket.onmessage = (event) => this.handleMessage(generation, socket, event.data);
		socket.onerror = () => this.reconnect('BloFin public socket error');
		socket.onclose = () => this.reconnect('BloFin public socket closed');
	}

	private handleMessage(generation: number, socket: BlofinSocket, data: unknown): void {
		if (!this.isCurrent(generation, socket)) return;
		const text = messageText(data);
		if (!text) return this.reconnect('BloFin public socket sent a non-text frame');
		let frame: unknown;
		try { frame = JSON.parse(text); } catch { return this.reconnect('BloFin public socket sent invalid JSON'); }
		if (!frame || typeof frame !== 'object') return this.reconnect('BloFin public socket sent an invalid frame');
		const record = frame as { event?: unknown; msg?: unknown; arg?: { channel?: unknown; instId?: unknown } };
		if (record.event === 'subscribe') return;
		if (record.event === 'error') return this.reconnect(`BloFin public subscription rejected: ${typeof record.msg === 'string' ? record.msg : 'unknown error'}`);
		// Heartbeats and other public channels must not affect this exact-book feed.
		if (record.arg?.channel !== 'books' || record.arg.instId !== this.options.instId) return;
		const result = applyBlofinBookFrame(this.state, frame);
		if (result.status !== 'applied') return this.reconnect(`BloFin public book ${result.status}`);
		this.state = result.state;
		this.reconnectAttempt = 0;
		this.setStatus('live');
		let event: EventEnvelope<OrderBook>;
		try {
			event = assertEventEnvelope({
				venue: 'blofin',
				instrumentKey: this.options.instrument.instrumentKey,
				connectionEpoch: generation,
				venueSequence: result.state.sequence,
				receivedTimeUs: eventTimeUsFromMs(this.now(), 'BloFin public receipt time'),
				dedupeKey: `books:${this.options.instId}:${result.state.sequence}`,
				payload: result.book
			});
		} catch {
			return this.reconnect('BloFin public event timestamp was invalid');
		}
		this.options.onBook?.(result.book);
		this.options.onBookEvent?.(event);
	}

	private reconnect(message: string): void {
		if (!this.running || this.reconnectTimer !== null) return;
		markFeedReconnect();
		this.options.onError?.(message);
		this.state = null;
		this.setStatus('stale');
		const socket = this.socket;
		this.socket = null;
		if (socket) socket.close();
		const delay = Math.min(1_000 * (2 ** this.reconnectAttempt), 15_000);
		this.reconnectAttempt += 1;
		this.reconnectTimer = this.timer.setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, delay);
	}

	private isCurrent(generation: number, socket: BlofinSocket): boolean {
		return this.running && this.generation === generation && this.socket === socket;
	}

	private setStatus(status: BlofinPublicFeedStatus): void {
		if (this.status === status) return;
		this.status = status;
		this.options.onStatus?.(status);
	}
}
