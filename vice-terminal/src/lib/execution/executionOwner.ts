const OWNER_STORAGE_KEY = 'vice.execution-owner.v1';
const OWNER_LOCK_NAME = 'vice.execution-owner.lock';
const OWNER_VERSION = 1;
export const EXECUTION_OWNER_LEASE_MS = 10_000;
export const EXECUTION_OWNER_HEARTBEAT_MS = 2_000;

type ExecutionOwnerRecord = {
	version: 1;
	scope: string;
	ownerId: string;
	expiresAt: number;
};

type LeaseResult = { ok: true } | { ok: false; reason: string };

function createOwnerId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
	return `vice-owner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readRecord(): ExecutionOwnerRecord | null {
	try {
		const raw = localStorage.getItem(OWNER_STORAGE_KEY);
		if (!raw) return null;
		const record = JSON.parse(raw) as Partial<ExecutionOwnerRecord>;
		if (record.version !== OWNER_VERSION || typeof record.scope !== 'string' || typeof record.ownerId !== 'string' ||
			!Number.isFinite(record.expiresAt)) return null;
		return record as ExecutionOwnerRecord;
	} catch {
		return null;
	}
}

function writeRecord(record: ExecutionOwnerRecord): boolean {
	try {
		localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(record));
		return true;
	} catch {
		return false;
	}
}

function clearRecord(ownerId: string, scope: string): void {
	try {
		const record = readRecord();
		if (record?.ownerId === ownerId && record.scope === scope) localStorage.removeItem(OWNER_STORAGE_KEY);
	} catch {
		// Losing storage access fails closed through isOwner().
	}
}

export class ExecutionOwnerLease {
	private readonly ownerId = createOwnerId();
	private scope: string | null = null;
	private held = false;
	private heartbeat: ReturnType<typeof setInterval> | null = null;
	private releaseHold: (() => void) | null = null;
	private lockRequest: Promise<unknown> | null = null;
	private channel: BroadcastChannel | null = null;

	constructor() {
		if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') this.channel = new BroadcastChannel(OWNER_STORAGE_KEY);
		if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
			window.addEventListener('pagehide', () => { void this.release(); }, { once: false });
			window.addEventListener('beforeunload', () => { void this.release(); }, { once: false });
		}
	}

	async acquire(scope: string, { takeover = false } = {}): Promise<LeaseResult> {
		if (!scope) return { ok: false, reason: 'Execution ownership requires an exact account/network scope' };
		if (!this.isSupported()) return { ok: false, reason: 'This browser does not support Web Locks; secure trading remains read-only' };
		if (this.held && this.scope === scope && this.isOwner(scope)) return { ok: true };
		if (this.held) return { ok: false, reason: 'This tab already owns a different account/network scope' };

		const existing = readRecord();
		const sameScopeExpired = existing && existing.scope === scope && existing.ownerId !== this.ownerId && existing.expiresAt <= Date.now();
		if (sameScopeExpired && !takeover) {
			return { ok: false, reason: 'Execution ownership expired; explicit takeover and fresh reconciliation are required' };
		}
		if (existing && existing.expiresAt > Date.now() && (existing.scope !== scope || existing.ownerId !== this.ownerId)) {
			return { ok: false, reason: 'Another tab owns secure trading for this account/network scope' };
		}
		if (takeover && existing && existing.expiresAt > Date.now()) {
			return { ok: false, reason: 'Secure trading takeover requires the existing lease to expire first' };
		}
		let acquiredResolve!: (value: boolean) => void;
		const acquired = new Promise<boolean>((resolve) => { acquiredResolve = resolve; });
		this.lockRequest = navigator.locks.request(OWNER_LOCK_NAME, { ifAvailable: true }, async (lock) => {
			if (!lock) {
				acquiredResolve(false);
				return;
			}
			const current = readRecord();
			const currentExpiredSameScope = current && current.scope === scope && current.ownerId !== this.ownerId && current.expiresAt <= Date.now();
			if ((current && current.expiresAt > Date.now() && (current.scope !== scope || current.ownerId !== this.ownerId)) ||
				(currentExpiredSameScope && !takeover)) {
				acquiredResolve(false);
				return;
			}
			this.scope = scope;
			this.held = true;
			if (!this.renew()) {
				this.held = false;
				this.scope = null;
				acquiredResolve(false);
				return;
			}
			this.startHeartbeat();
			this.notify('acquired');
			acquiredResolve(true);
			await new Promise<void>((resolve) => { this.releaseHold = resolve; });
			this.stopHeartbeat();
			if (this.scope) clearRecord(this.ownerId, this.scope);
			this.held = false;
			this.scope = null;
			this.releaseHold = null;
			this.notify('released');
		});
		try {
			if (!(await acquired)) {
				await this.lockRequest;
				return { ok: false, reason: 'Another tab currently holds the execution lock' };
			}
			return { ok: true };
		} catch {
			this.stopHeartbeat();
			this.held = false;
			this.scope = null;
			return { ok: false, reason: 'Web Lock ownership could not be proven; secure trading remains read-only' };
		}
	}

	isOwner(scope: string): boolean {
		if (!this.held || this.scope !== scope) return false;
		const record = readRecord();
		return record?.version === OWNER_VERSION && record.ownerId === this.ownerId && record.scope === scope && record.expiresAt > Date.now();
	}

	assertOwner(scope: string): void {
		if (!this.isOwner(scope)) throw new Error('This tab does not own secure trading for the current account/network; reconcile before retrying');
	}

	async release(): Promise<void> {
		this.releaseHold?.();
		if (this.lockRequest) {
			try { await this.lockRequest; } catch { /* lock teardown is best effort */ }
		}
		this.lockRequest = null;
	}

	private isSupported(): boolean {
		return typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function' && typeof localStorage !== 'undefined';
	}

	private renew(): boolean {
		if (!this.scope) return false;
		return writeRecord({ version: OWNER_VERSION, scope: this.scope, ownerId: this.ownerId, expiresAt: Date.now() + EXECUTION_OWNER_LEASE_MS });
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeat = setInterval(() => {
			if (!this.scope || !this.isOwner(this.scope) || !this.renew()) {
				this.releaseHold?.();
			}
		}, EXECUTION_OWNER_HEARTBEAT_MS);
	}

	private stopHeartbeat(): void {
		if (this.heartbeat) clearInterval(this.heartbeat);
		this.heartbeat = null;
	}

	private notify(type: 'acquired' | 'released'): void {
		try { this.channel?.postMessage({ type, scope: this.scope }); } catch { /* notifications never grant authority */ }
	}
}

export const executionOwnerLease = new ExecutionOwnerLease();
export function executionOwnerScope(network: string, address: string): string {
	return `${network}:${address.toLowerCase()}`;
}
