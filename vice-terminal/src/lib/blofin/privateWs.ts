import { signBlofinRequest } from './signing';
import { blofinKeyFingerprint, type BlofinCredentials, type BlofinEnvironment } from './vault';
import { assertAccountRef, assertEventEnvelope, eventTimeUsFromMs, type AccountRef, type EventEnvelope } from '$lib/venue/identity';
import { markFeedReconnect } from '$lib/native/performance';

export const BLOFIN_PRIVATE_WS = 'wss://openapi.blofin.com/ws/private';
export const BLOFIN_DEMO_PRIVATE_WS = 'wss://demo-trading-openapi.blofin.com/ws/private';

export type BlofinPrivateFeedStatus = 'idle' | 'connecting' | 'authenticating' | 'live' | 'stale';
export type BlofinPrivateChannel = 'account' | 'positions' | 'orders' | 'orders-algo';

export interface BlofinPrivateSocket {
	send(data: string): void;
	close(): void;
	onopen: (() => void) | null;
	onmessage: ((event: { data: unknown }) => void) | null;
	onerror: (() => void) | null;
	onclose: (() => void) | null;
}

type Timer = Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'>;
type PrivateFrame = { event?: unknown; code?: unknown; arg?: { channel?: unknown }; data?: unknown };

export type BlofinPrivateReconciliationRequest = {
	reason: 'authenticated' | 'private-update';
	/** Metadata only: private WebSocket payloads never leave this boundary. */
	event?: EventEnvelope<{ channel: BlofinPrivateChannel }>;
};

export type BlofinPrivateFeedOptions = {
	environment: BlofinEnvironment;
	credentials: BlofinCredentials;
	/** The selected local credential identity; it must match the unlocked API key. */
	account: AccountRef;
	channels?: BlofinPrivateChannel[];
	createSocket?: (url: string) => BlofinPrivateSocket;
	timer?: Timer;
	now?: () => number;
	nonceFactory?: () => string;
	heartbeatMs?: number;
	reconcileDelayMs?: number;
	onStatus?: (status: BlofinPrivateFeedStatus) => void;
	/** Re-read balances, positions, and orders together; never project a raw WS frame. */
	onReconcileRequested?: (request: BlofinPrivateReconciliationRequest) => void | Promise<void>;
	/** Deliberately generic: private errors and payloads must not be logged or persisted. */
	onError?: (message: string) => void;
};

const DEFAULT_CHANNELS: BlofinPrivateChannel[] = ['account', 'positions', 'orders', 'orders-algo'];
const LOGIN_PATH = '/users/self/verify';
const MAX_RECONNECT_MS = 15_000;

function asText(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function isSuccessCode(value: unknown): boolean {
	return value === '0' || value === 0;
}

function validChannels(channels: BlofinPrivateChannel[]): BlofinPrivateChannel[] {
	const allowed = new Set<BlofinPrivateChannel>(DEFAULT_CHANNELS);
	const unique = [...new Set(channels)];
	if (unique.length === 0 || unique.some((channel) => !allowed.has(channel))) throw new Error('BloFin private feed requires supported private channels');
	return unique;
}

/** Builds the documented, secret-bearing login frame without writing it to storage or logs. */
export async function blofinPrivateLogin(credentials: BlofinCredentials, now = Date.now(), nonce: string = crypto.randomUUID()): Promise<string> {
	if (!credentials.permissions.includes('READ')) throw new Error('BloFin private feed requires READ permission');
	const timestamp = String(now);
	const sign = await signBlofinRequest(credentials.secretKey, LOGIN_PATH, 'GET', timestamp, nonce);
	return JSON.stringify({ op: 'login', args: [{ apiKey: credentials.apiKey, passphrase: credentials.passphrase, timestamp, sign, nonce }] });
}

/**
 * Owns one authenticated private stream. It exposes no private payloads: each
 * accepted signal requests an all-or-nothing REST reconciliation instead.
 */
export class BlofinPrivateFeed {
	private readonly endpoint: string;
	private readonly channels: BlofinPrivateChannel[];
	private readonly createSocket: (url: string) => BlofinPrivateSocket;
	private readonly timer: Timer;
	private readonly now: () => number;
	private readonly nonceFactory: () => string;
	private readonly heartbeatMs: number;
	private readonly reconcileDelayMs: number;
	private socket: BlofinPrivateSocket | null = null;
	private generation = 0;
	private reconnectAttempt = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
	private reconcileTimer: ReturnType<typeof setTimeout> | null = null;
	private reconciling = false;
	private reconcileQueued: BlofinPrivateReconciliationRequest | null = null;
	private running = false;
	private awaitingPong = false;
	private status: BlofinPrivateFeedStatus = 'idle';
	private privateEventOrdinal = 0;

	constructor(private readonly options: BlofinPrivateFeedOptions) {
		this.endpoint = options.environment === 'demo' ? BLOFIN_DEMO_PRIVATE_WS : BLOFIN_PRIVATE_WS;
		this.channels = validChannels(options.channels ?? DEFAULT_CHANNELS);
		this.createSocket = options.createSocket ?? ((url) => new WebSocket(url) as unknown as BlofinPrivateSocket);
		this.timer = options.timer ?? globalThis;
		this.now = options.now ?? Date.now;
		this.nonceFactory = options.nonceFactory ?? (() => crypto.randomUUID());
		this.heartbeatMs = options.heartbeatMs ?? 20_000;
		this.reconcileDelayMs = options.reconcileDelayMs ?? 250;
		if (!Number.isFinite(this.heartbeatMs) || this.heartbeatMs < 1_000) throw new Error('BloFin private heartbeat must be at least one second');
		if (!Number.isFinite(this.reconcileDelayMs) || this.reconcileDelayMs < 0) throw new Error('BloFin private reconciliation delay is invalid');
		this.assertAccountScope();
	}

	async start(): Promise<void> {
		if (this.running) return;
		await this.assertCredentialAccountBinding();
		this.running = true;
		this.reconnectAttempt = 0;
		this.connect();
	}

	stop(): void {
		this.running = false;
		this.generation += 1;
		this.clearTimers();
		this.reconcileQueued = null;
		const socket = this.socket;
		this.socket = null;
		if (socket) socket.close();
		this.setStatus('idle');
	}

	private connect(): void {
		if (!this.running) return;
		const generation = ++this.generation;
		this.awaitingPong = false;
		this.privateEventOrdinal = 0;
		this.setStatus('connecting');
		let socket: BlofinPrivateSocket;
		try {
			socket = this.createSocket(this.endpoint);
		} catch {
			this.reconnect('BloFin private socket could not start');
			return;
		}
		this.socket = socket;
		socket.onopen = () => { void this.login(generation, socket); };
		socket.onmessage = (event) => this.handleMessage(generation, socket, event.data);
		socket.onerror = () => this.reconnect('BloFin private socket error');
		socket.onclose = () => this.reconnect('BloFin private socket closed');
	}

	private async login(generation: number, socket: BlofinPrivateSocket): Promise<void> {
		if (!this.isCurrent(generation, socket)) return;
		this.setStatus('authenticating');
		try {
			socket.send(await blofinPrivateLogin(this.options.credentials, this.now(), this.nonceFactory()));
		} catch {
			this.reconnect('BloFin private login could not be sent');
		}
	}

	private handleMessage(generation: number, socket: BlofinPrivateSocket, data: unknown): void {
		if (!this.isCurrent(generation, socket)) return;
		const text = asText(data);
		if (!text) return this.reconnect('BloFin private socket sent a non-text frame');
		let frame: PrivateFrame;
		try { frame = JSON.parse(text) as PrivateFrame; } catch { return this.reconnect('BloFin private socket sent invalid JSON'); }
		if (!frame || typeof frame !== 'object') return this.reconnect('BloFin private socket sent an invalid frame');
		this.noteInbound();
		if (frame.event === 'error') return this.reconnect('BloFin private request was rejected');
		if (frame.event === 'login') {
			if (!isSuccessCode(frame.code)) return this.reconnect('BloFin private login was rejected');
			try {
				socket.send(JSON.stringify({ op: 'subscribe', args: this.channels.map((channel) => ({ channel })) }));
			} catch {
				this.reconnect('BloFin private subscription could not be sent');
				return;
			}
			this.reconnectAttempt = 0;
			this.setStatus('live');
			this.requestReconciliation({ reason: 'authenticated' }, 0);
			return;
		}
		if (frame.event === 'pong') return;
		if (frame.arg && this.channels.includes(frame.arg.channel as BlofinPrivateChannel)) {
			try {
				this.requestReconciliation({ reason: 'private-update', event: this.privateUpdateEvent(frame.arg.channel as BlofinPrivateChannel, generation) }, this.reconcileDelayMs);
			} catch {
				this.reconnect('BloFin private update identity was invalid');
			}
		}
	}

	private noteInbound(): void {
		this.awaitingPong = false;
		if (this.heartbeatTimer !== null) this.timer.clearTimeout(this.heartbeatTimer);
		this.heartbeatTimer = this.timer.setTimeout(() => this.heartbeat(), this.heartbeatMs);
	}

	private heartbeat(): void {
		this.heartbeatTimer = null;
		if (!this.running || !this.socket) return;
		if (this.awaitingPong) return this.reconnect('BloFin private heartbeat timed out');
		this.awaitingPong = true;
		try {
			this.socket.send('ping');
			this.heartbeatTimer = this.timer.setTimeout(() => this.heartbeat(), this.heartbeatMs);
		} catch {
			this.reconnect('BloFin private heartbeat could not be sent');
		}
	}

	private requestReconciliation(request: BlofinPrivateReconciliationRequest, delay: number): void {
		if (!this.options.onReconcileRequested || !this.running) return;
		if (this.reconciling || this.reconcileTimer !== null) {
			this.reconcileQueued ??= request;
			return;
		}
		this.reconcileTimer = this.timer.setTimeout(() => {
			this.reconcileTimer = null;
			void this.reconcile(request);
		}, delay);
	}

	private async reconcile(request: BlofinPrivateReconciliationRequest): Promise<void> {
		if (!this.running || !this.options.onReconcileRequested) return;
		this.reconciling = true;
		try {
			await this.options.onReconcileRequested(request);
		} catch {
			this.options.onError?.('BloFin private reconciliation failed');
		} finally {
			this.reconciling = false;
			if (this.reconcileQueued) {
				const queued = this.reconcileQueued;
				this.reconcileQueued = null;
				this.requestReconciliation(queued, this.reconcileDelayMs);
			}
		}
	}

	private reconnect(message: string): void {
		if (!this.running || this.reconnectTimer !== null) return;
		markFeedReconnect();
		this.options.onError?.(message);
		this.clearTimers();
		this.reconcileQueued = null;
		this.awaitingPong = false;
		const socket = this.socket;
		this.socket = null;
		if (socket) socket.close();
		this.setStatus('stale');
		const delay = Math.min(1_000 * (2 ** this.reconnectAttempt), MAX_RECONNECT_MS);
		this.reconnectAttempt += 1;
		this.reconnectTimer = this.timer.setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, delay);
	}

	private clearTimers(): void {
		for (const timer of [this.reconnectTimer, this.heartbeatTimer, this.reconcileTimer]) if (timer !== null) this.timer.clearTimeout(timer);
		this.reconnectTimer = null;
		this.heartbeatTimer = null;
		this.reconcileTimer = null;
	}

	private isCurrent(generation: number, socket: BlofinPrivateSocket): boolean {
		return this.running && this.generation === generation && this.socket === socket;
	}

	private assertAccountScope(): AccountRef {
		const account = assertAccountRef(this.options.account);
		if (
			account.venue !== 'blofin' ||
			account.accountMode !== `futures:${this.options.environment}` ||
			account.accountKey !== `blofin:${this.options.environment}:${account.credentialRef}`
		) {
			throw new Error('BloFin private feed account does not match the selected environment');
		}
		return account;
	}

	private async assertCredentialAccountBinding(): Promise<void> {
		const account = this.assertAccountScope();
		if (account.credentialRef !== await blofinKeyFingerprint(this.options.credentials.apiKey)) {
			throw new Error('BloFin private feed account does not match the unlocked API key');
		}
	}

	private privateUpdateEvent(channel: BlofinPrivateChannel, connectionEpoch: number): EventEnvelope<{ channel: BlofinPrivateChannel }> {
		const receivedAtMs = this.now();
		return assertEventEnvelope({
			venue: 'blofin',
			accountKey: this.assertAccountScope().accountKey,
			connectionEpoch,
			receivedTimeUs: eventTimeUsFromMs(receivedAtMs, 'BloFin private receipt time'),
			dedupeKey: `private:${channel}:${connectionEpoch}:${++this.privateEventOrdinal}`,
			payload: { channel }
		});
	}

	private setStatus(status: BlofinPrivateFeedStatus): void {
		if (this.status === status) return;
		this.status = status;
		this.options.onStatus?.(status);
	}
}
