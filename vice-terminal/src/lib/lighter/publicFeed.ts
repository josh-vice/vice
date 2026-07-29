import { LIGHTER_MAINNET_PUBLIC_WS, LIGHTER_TESTNET_PUBLIC_WS, applyLighterBookFrame, lighterBookSubscribe, type LighterBookState } from './publicWs';
import type { OrderBook } from '$lib/types';
import { assertEventEnvelope, assertInstrumentId, eventTimeUsFromMs, type EventEnvelope, type InstrumentId } from '$lib/venue/identity';
import { markFeedReconnect } from '$lib/native/performance';

export type LighterPublicFeedStatus = 'idle' | 'connecting' | 'live' | 'stale' | 'error';

/** Browser WebSockets cannot emit control-frame pings; native transports may. */
export interface LighterSocket {
	send(data: string): void;
	close(): void;
	ping?: () => void;
	onopen: (() => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onerror: (() => void) | null;
	onclose: (() => void) | null;
}

type Timer = Pick<typeof globalThis, 'setTimeout' | 'clearTimeout' | 'setInterval' | 'clearInterval'>;

export type LighterPublicBookFeedOptions = {
	testnet?: boolean;
	marketId: number;
	/** Exact spot identity emitted by the Lighter catalog boundary. */
	instrument: InstrumentId;
	createSocket?: (url: string) => LighterSocket;
	timer?: Timer;
	now?: () => number;
	onStatus?: (status: LighterPublicFeedStatus) => void;
	onBook?: (book: OrderBook) => void;
	onBookEvent?: (event: EventEnvelope<OrderBook>) => void;
	onError?: (message: string) => void;
};

function textFrame(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

/**
 * One exact Lighter spot book. It publishes only after the initial snapshot
 * and every incremental frame pass the documented nonce-continuity check.
 * It intentionally has no credential, account, or mutation capability.
 */
export class LighterPublicBookFeed {
	private readonly endpoint: string;
	private readonly createSocket: (url: string) => LighterSocket;
	private readonly timer: Timer;
	private readonly now: () => number;
	private socket: LighterSocket | null = null;
	private state: LighterBookState | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private pingTimer: ReturnType<typeof setInterval> | null = null;
	private generation = 0;
	private reconnectAttempt = 0;
	private running = false;
	private status: LighterPublicFeedStatus = 'idle';

	constructor(private readonly options: LighterPublicBookFeedOptions) {
		if (!Number.isSafeInteger(options.marketId) || options.marketId < 0) throw new Error('Lighter public feed requires an exact non-negative market id');
		assertInstrumentId(options.instrument);
		if (options.instrument.venue !== 'lighter' || options.instrument.product !== 'spot' || !options.instrument.instrumentKey.startsWith(`lighter:spot:${options.marketId}:`)) {
			throw new Error('Lighter public feed requires the catalog identity for its exact spot market');
		}
		this.endpoint = options.testnet ? LIGHTER_TESTNET_PUBLIC_WS : LIGHTER_MAINNET_PUBLIC_WS;
		this.createSocket = options.createSocket ?? ((url) => new WebSocket(url) as unknown as LighterSocket);
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
		this.stopKeepalive();
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
		let socket: LighterSocket;
		try { socket = this.createSocket(this.endpoint); }
		catch (error) { this.reconnect(`Lighter public socket could not start: ${error instanceof Error ? error.message : 'unknown error'}`); return; }
		this.socket = socket;
		// Lighter acknowledges its application session with a `connected` frame.
		// Sending a channel subscription before that handshake is accepted can be
		// dropped by the server, so onopen deliberately does not send anything.
		socket.onopen = () => { if (!this.isCurrent(generation, socket)) return; };
		socket.onmessage = (event) => this.handleMessage(generation, socket, event.data);
		socket.onerror = () => this.reconnect('Lighter public socket error');
		socket.onclose = () => this.reconnect('Lighter public socket closed');
	}

	private startKeepalive(generation: number, socket: LighterSocket): void {
		this.stopKeepalive();
		if (!socket.ping) return;
		this.pingTimer = this.timer.setInterval(() => {
			if (!this.isCurrent(generation, socket)) return;
			try { socket.ping?.(); }
			catch { this.reconnect('Lighter public socket keepalive failed'); }
		}, 90_000);
	}

	private stopKeepalive(): void {
		if (this.pingTimer !== null) this.timer.clearInterval(this.pingTimer);
		this.pingTimer = null;
	}

	private handleMessage(generation: number, socket: LighterSocket, data: unknown): void {
		if (!this.isCurrent(generation, socket)) return;
		const text = textFrame(data);
		if (!text) return this.reconnect('Lighter public socket sent a non-text frame');
		let frame: unknown;
		try { frame = JSON.parse(text); } catch { return this.reconnect('Lighter public socket sent invalid JSON'); }
		if (!frame || typeof frame !== 'object') return this.reconnect('Lighter public socket sent an invalid frame');
		const candidate = frame as { type?: unknown; channel?: unknown };
		if (candidate.type === 'connected') {
			try {
				socket.send(lighterBookSubscribe(this.options.marketId));
				this.startKeepalive(generation, socket);
			} catch (error) { this.reconnect(`Lighter public subscription failed: ${error instanceof Error ? error.message : 'unknown error'}`); }
			return;
		}
		if (candidate.channel !== `order_book:${this.options.marketId}`) return;
		const result = applyLighterBookFrame(this.state, this.options.marketId, frame);
		if (result.status !== 'applied') return this.reconnect(`Lighter public book ${result.status}`);
		this.state = result.state;
		this.reconnectAttempt = 0;
		this.setStatus('live');
		let event: EventEnvelope<OrderBook>;
		try {
			event = assertEventEnvelope({
				venue: 'lighter', instrumentKey: this.options.instrument.instrumentKey, connectionEpoch: generation,
				venueSequence: result.state.nonce, receivedTimeUs: eventTimeUsFromMs(this.now(), 'Lighter public receipt time'),
				dedupeKey: `books:${this.options.marketId}:${result.state.nonce}`, payload: result.book
			});
		} catch { return this.reconnect('Lighter public event timestamp was invalid'); }
		this.options.onBook?.(result.book);
		this.options.onBookEvent?.(event);
	}

	private reconnect(message: string): void {
		if (!this.running || this.reconnectTimer !== null) return;
		markFeedReconnect();
		this.options.onError?.(message);
		this.stopKeepalive();
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

	private isCurrent(generation: number, socket: LighterSocket): boolean {
		return this.running && this.generation === generation && this.socket === socket;
	}

	private setStatus(status: LighterPublicFeedStatus): void {
		if (this.status === status) return;
		this.status = status;
		this.options.onStatus?.(status);
	}
}
