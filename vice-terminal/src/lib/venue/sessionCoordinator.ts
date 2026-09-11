import type { AccountSnapshot, VenueAdapter, VenueEnvironment, VenueSessionRef } from './adapter';
import type { MarketDescriptor } from '$lib/types';
import type { AccountRef, EventEnvelope, VenueId } from './identity';

export type SessionCoordinatorStatus = 'idle' | 'switching' | 'live' | 'stopped' | 'error';

type MaybePromise<T> = T | PromiseLike<T>;
type Cleanup = () => MaybePromise<void>;
type MarketSelection = MarketDescriptor | string | null | undefined;

type AdapterResolver = (venue: VenueId) => VenueAdapter;
type AdapterSource =
	| ReadonlyMap<VenueId, VenueAdapter>
	| AdapterResolver
	| Partial<Record<VenueId, VenueAdapter>>;

/** The public target of one globally active venue/account session. */
export interface VenueSessionTarget {
	venue: VenueId;
	environment: VenueEnvironment;
	account: AccountRef | null;
	/** Optional catalog key to select after the adapter loads its markets. */
	marketKey?: string;
	/** Alias for marketKey when callers already use canonical instrument identity. */
	instrumentKey?: string;
	/** Optional preselected market object; the loaded catalog remains authoritative. */
	market?: MarketDescriptor;
}

export interface SessionTransitionContext {
	readonly target: VenueSessionTarget | null;
	readonly session: VenueSessionRef | null;
	readonly generation: number;
	isCurrent(): boolean;
}

export interface SessionCoordinatorEffects {
	/** Clear all venue-scoped market and account projections atomically. */
	clearState?: (context: SessionTransitionContext | null) => MaybePromise<void>;
	/** Optional split clear hooks for callers that own separate projections. */
	clearMarketState?: (context: SessionTransitionContext | null) => MaybePromise<void>;
	clearAccountState?: (context: SessionTransitionContext | null) => MaybePromise<void>;
	/** Select one loaded catalog entry. Returning undefined uses the target/first entry. */
	selectMarket?: (markets: readonly MarketDescriptor[], context: SessionTransitionContext) => MaybePromise<MarketSelection>;
	onMarketSelected?: (market: MarketDescriptor, context: SessionTransitionContext) => void;
	/** Receive only public events from the current generation. */
	onPublicEvent?: (event: EventEnvelope<unknown>, context: SessionTransitionContext) => void;
	/** Receive only account snapshots from the current generation. */
	onAccountSnapshot?: (snapshot: AccountSnapshot, context: SessionTransitionContext) => void;
	onStatusChange?: (snapshot: SessionCoordinatorSnapshot) => void;
}

export interface SessionCoordinatorOptions {
	adapters?: AdapterSource;
	resolveAdapter?: AdapterResolver;
	effects?: SessionCoordinatorEffects;
}

export interface SessionCoordinatorSnapshot {
	readonly status: SessionCoordinatorStatus;
	readonly generation: number;
	readonly session: VenueSessionRef | null;
	readonly markets: readonly MarketDescriptor[];
	readonly market: MarketDescriptor | null;
	readonly accountSnapshot: AccountSnapshot | null;
	readonly error: Error | null;
}

function asError(value: unknown): Error {
	return value instanceof Error ? value : new Error(String(value));
}

function assertTarget(target: VenueSessionTarget): void {
	if (!target || typeof target !== 'object') throw new Error('Venue session target is required');
	if (!target.venue || !target.environment) throw new Error('Venue session target requires venue and environment');
	if (!['demo', 'testnet', 'production'].includes(target.environment)) {
		throw new Error(`Unsupported venue environment ${target.environment}`);
	}
	if (target.account !== null && target.account !== undefined && target.account.venue !== target.venue) {
		throw new Error(`Venue session account venue ${target.account.venue} does not match target ${target.venue}`);
	}
	for (const [name, value] of [
		['marketKey', target.marketKey],
		['instrumentKey', target.instrumentKey]
	] as const) {
		if (value !== undefined && (typeof value !== 'string' || value.trim() !== value || value.length === 0)) {
			throw new Error(`Venue session target ${name} must be a non-blank trimmed string`);
		}
	}
}

function marketKeyOf(market: MarketDescriptor): string | undefined {
	return market.marketKey || market.instrument?.instrumentKey;
}

function sameMarket(left: MarketDescriptor, right: MarketDescriptor): boolean {
	const leftKey = marketKeyOf(left);
	const rightKey = marketKeyOf(right);
	return left === right || (leftKey !== undefined && leftKey === rightKey);
}

function normalizeOptions(
	input: SessionCoordinatorOptions | AdapterSource,
	effects?: SessionCoordinatorEffects
): SessionCoordinatorOptions {
	if (
		input &&
		typeof input === 'object' &&
		('adapters' in input || 'resolveAdapter' in input || 'effects' in input)
	) {
		return input as SessionCoordinatorOptions;
	}
	return { adapters: input as AdapterSource, effects };
}

function resolveFromSource(source: AdapterSource | undefined, venue: VenueId): VenueAdapter | undefined {
	if (!source) return undefined;
	if (typeof source === 'function') return source(venue);
	if (typeof (source as ReadonlyMap<VenueId, VenueAdapter>).get === 'function') {
		return (source as ReadonlyMap<VenueId, VenueAdapter>).get(venue);
	}
	return (source as Partial<Record<VenueId, VenueAdapter>>)[venue];
}

/**
 * Coordinates one venue/account session without importing or owning application
 * stores.  Adapters own transport; effects own projections.  The coordinator
 * owns ordering, aborts, cleanup, and generation fencing only.
 */
export class VenueSessionCoordinator {
	private readonly resolveAdapter: AdapterResolver;
	private readonly effects: SessionCoordinatorEffects;
	private transition: Promise<unknown> = Promise.resolve();
	private generationCounter = 0;
	private activeGeneration: number | null = null;
	private activeSession: VenueSessionRef | null = null;
	private activeTarget: VenueSessionTarget | null = null;
	private activeAdapter: VenueAdapter | null = null;
	private readController: AbortController | null = null;
	private stopPublicCleanup: Cleanup | null = null;
	private stopPrivateCleanup: Cleanup | null = null;
	private accountRefresh: Promise<AccountSnapshot | null> | null = null;
	private status: SessionCoordinatorStatus = 'idle';
	private error: Error | null = null;
	private markets: MarketDescriptor[] = [];
	private market: MarketDescriptor | null = null;
	private accountSnapshot: AccountSnapshot | null = null;

	constructor(options: SessionCoordinatorOptions);
	constructor(adapters: AdapterSource, effects?: SessionCoordinatorEffects);
	constructor(input: SessionCoordinatorOptions | AdapterSource, effects?: SessionCoordinatorEffects);
	constructor(
		input: SessionCoordinatorOptions | AdapterSource,
		effects?: SessionCoordinatorEffects
	) {
		const options = normalizeOptions(input, effects);
		this.effects = options.effects ?? {};
		const sourceResolver: (venue: VenueId) => VenueAdapter | undefined =
			options.resolveAdapter ?? ((venue: VenueId) => resolveFromSource(options.adapters, venue));
		this.resolveAdapter = (venue: VenueId): VenueAdapter => {
			const adapter = sourceResolver(venue);
			if (!adapter) throw new Error(`No venue adapter available for ${venue}`);
			if (adapter.id !== venue) throw new Error(`Venue adapter ${adapter.id} does not match ${venue}`);
			return adapter;
		};
	}

	/** Queue a switch; a queued transition never interleaves transport lifecycles. */
	switchTo(target: VenueSessionTarget): Promise<SessionCoordinatorSnapshot> {
		const run = this.transition.then(
			() => this.performSwitch(target),
			() => this.performSwitch(target)
		);
		this.transition = run.then(
			() => undefined,
			() => undefined
		);
		return run;
	}

	/** Descriptive alias for callers that model the operation as a session switch. */
	switchSession(target: VenueSessionTarget): Promise<SessionCoordinatorSnapshot> {
		return this.switchTo(target);
	}

	/** Stop the active session and invalidate all callbacks from its generation. */
	stop(): Promise<void> {
		const run = this.transition.then(
			() => this.performStop(),
			() => this.performStop()
		);
		this.transition = run.then(
			() => undefined,
			() => undefined
		);
		return run;
	}

	dispose(): Promise<void> {
		return this.stop();
	}

	snapshot(): SessionCoordinatorSnapshot {
		return {
			status: this.status,
			generation: this.generationCounter,
			session: this.activeSession,
			markets: [...this.markets],
			market: this.market,
			accountSnapshot: this.accountSnapshot,
			error: this.error
		};
	}

	getState(): SessionCoordinatorSnapshot {
		return this.snapshot();
	}

	get generation(): number {
		return this.generationCounter;
	}

	get currentSession(): VenueSessionRef | null {
		return this.activeSession;
	}

	private setStatus(status: SessionCoordinatorStatus, error: Error | null = null): void {
		this.status = status;
		this.error = error;
		this.effects.onStatusChange?.(this.snapshot());
	}

	private context(
		target: VenueSessionTarget | null,
		session: VenueSessionRef | null,
		generation: number
	): SessionTransitionContext {
		return {
			target,
			session,
			generation,
			isCurrent: () => this.isCurrent(generation)
		};
	}

	private isCurrent(generation: number): boolean {
		return (
			this.activeGeneration === generation &&
			this.activeSession?.generation === generation &&
			(this.status === 'switching' || this.status === 'live')
		);
	}

	private async clearState(context: SessionTransitionContext | null): Promise<void> {
		if (this.effects.clearState) {
			await this.effects.clearState(context);
			return;
		}
		await this.effects.clearMarketState?.(context);
		await this.effects.clearAccountState?.(context);
	}

	private async stopResources(): Promise<Error | null> {
		let firstError: Error | null = null;
		const privateCleanup = this.stopPrivateCleanup;
		this.stopPrivateCleanup = null;
		if (privateCleanup) {
			try {
				await privateCleanup();
			} catch (error) {
				firstError ??= asError(error);
			}
		}

		const publicCleanup = this.stopPublicCleanup;
		this.stopPublicCleanup = null;
		if (publicCleanup) {
			try {
				await publicCleanup();
			} catch (error) {
				firstError ??= asError(error);
			}
		}

		const controller = this.readController;
		this.readController = null;
		this.accountRefresh = null;
		controller?.abort();
		return firstError;
	}

	private async performSwitch(input: VenueSessionTarget): Promise<SessionCoordinatorSnapshot> {
		assertTarget(input);
		const target: VenueSessionTarget = { ...input, account: input.account ?? null };
		const adapter = this.resolveAdapter(target.venue);
		this.setStatus('switching');

		// Fence callbacks before awaiting user/adapter cleanup. The numeric
		// generation advances immediately after the prescribed abort step.
		this.activeGeneration = null;
		this.activeSession = null;
		this.activeTarget = null;
		this.activeAdapter = null;
		const teardownError = await this.stopResources();
		const generation = this.nextGeneration();
		const session: VenueSessionRef = {
			venue: target.venue,
			environment: target.environment,
			account: target.account,
			generation
		};
		const transitionContext = this.context(target, session, generation);

		this.markCleared();
		await this.clearState(transitionContext);
		if (teardownError) return this.failBeforeBoot(teardownError);

		this.activeGeneration = generation;
		this.activeSession = session;
		this.activeTarget = target;
		this.activeAdapter = adapter;
		const controller = new AbortController();
		this.readController = controller;

		try {
			const loadedMarkets = await adapter.loadMarkets(target.environment, controller.signal);
			this.ensureCurrent(generation);
			if (!Array.isArray(loadedMarkets)) throw new Error('Venue adapter loadMarkets must return an array');
			this.markets = [...loadedMarkets];

			const selectedMarket = await this.selectMarket(loadedMarkets, target, transitionContext);
			this.ensureCurrent(generation);
			this.market = selectedMarket;
			this.effects.onMarketSelected?.(selectedMarket, transitionContext);

			const emit = (event: EventEnvelope<unknown>): void => {
				if (!this.isCurrent(generation)) return;
				this.effects.onPublicEvent?.(event, transitionContext);
			};
			this.stopPublicCleanup = await adapter.startPublic(session, selectedMarket, emit);
			this.ensureCurrent(generation);

			if (target.account !== null) {
				const accountSnapshot = await adapter.readAccount(session, controller.signal);
				this.ensureCurrent(generation);
				this.commitAccountSnapshot(accountSnapshot, transitionContext);
				this.stopPrivateCleanup = await adapter.startPrivate(session, async () => {
					await this.refreshAccount(generation);
				});
				this.ensureCurrent(generation);
			}

			this.setStatus('live');
			return this.snapshot();
		} catch (error) {
			return this.failActive(generation, asError(error));
		}
	}

	private nextGeneration(): number {
		if (this.generationCounter === Number.MAX_SAFE_INTEGER) throw new Error('Venue session generation exhausted');
		this.generationCounter += 1;
		return this.generationCounter;
	}

	private markCleared(): void {
		this.markets = [];
		this.market = null;
		this.accountSnapshot = null;
	}

	private async selectMarket(
		loadedMarkets: readonly MarketDescriptor[],
		target: VenueSessionTarget,
		context: SessionTransitionContext
	): Promise<MarketDescriptor> {
		if (loadedMarkets.length === 0) throw new Error(`Venue ${target.venue} returned no markets`);
		let selection: MarketSelection;
		if (this.effects.selectMarket) {
			selection = await this.effects.selectMarket(loadedMarkets, context);
		} else {
			const requestedKey = target.marketKey ?? target.instrumentKey ?? target.market?.marketKey ?? target.market?.instrument?.instrumentKey;
			selection = requestedKey ?? target.market;
		}

		if (selection === null) throw new Error('Venue session market selection was rejected');
		const selected =
			typeof selection === 'string'
				? loadedMarkets.find((candidate) => marketKeyOf(candidate) === selection)
				: selection ?? loadedMarkets[0];
		if (!selected) throw new Error('Venue session requested market was not found in the loaded catalog');
		const canonical = loadedMarkets.find((candidate) => sameMarket(candidate, selected));
		if (!canonical) throw new Error('Venue session selected market is not in the loaded catalog');
		return canonical;
	}

	private commitAccountSnapshot(snapshot: AccountSnapshot, context: SessionTransitionContext): void {
		if (!snapshot || !snapshot.account) throw new Error('Venue account snapshot is malformed');
		if (
			snapshot.account.venue !== context.session?.venue ||
			snapshot.account.accountKey !== context.session?.account?.accountKey
		) {
			throw new Error('Venue account snapshot identity does not match the active session');
		}
		this.accountSnapshot = snapshot;
		this.effects.onAccountSnapshot?.(snapshot, context);
	}

	private refreshAccount(generation: number): Promise<AccountSnapshot | null> {
		if (!this.isCurrent(generation) || !this.activeAdapter || !this.activeSession || !this.readController) {
			return Promise.resolve(null);
		}
		if (this.accountRefresh) return this.accountRefresh;
		const adapter = this.activeAdapter;
		const session = this.activeSession;
		const controller = this.readController;
		const context = this.context(this.activeTarget, session, generation);
		let refresh: Promise<AccountSnapshot | null> = Promise.resolve(null);
		refresh = (async (): Promise<AccountSnapshot | null> => {
			try {
				const snapshot = await adapter.readAccount(session, controller.signal);
				if (!this.isCurrent(generation)) return null;
				this.commitAccountSnapshot(snapshot, context);
				return snapshot;
			} catch (error) {
				if (controller.signal.aborted || !this.isCurrent(generation)) return null;
				this.setStatus('error', asError(error));
				return null;
			} finally {
				if (this.accountRefresh === refresh) this.accountRefresh = null;
			}
		})();
		this.accountRefresh = refresh;
		return refresh;
	}

	private ensureCurrent(generation: number): void {
		if (!this.isCurrent(generation)) throw new Error('Venue session became stale during transition');
	}

	private markInactive(): void {
		this.activeGeneration = null;
		this.activeSession = null;
		this.activeTarget = null;
		this.activeAdapter = null;
	}

	private async failActive(generation: number, error: Error): Promise<SessionCoordinatorSnapshot> {
		if (this.activeGeneration === generation) {
			this.markInactive();
			await this.stopResources();
		}
		this.markCleared();
		this.setStatus('error', error);
		throw error;
	}

	private failBeforeBoot(error: Error): never {
		this.markInactive();
		this.markCleared();
		this.setStatus('error', error);
		throw error;
	}

	private async performStop(): Promise<void> {
		const previousSession = this.activeSession;
		const previousGeneration = this.activeGeneration ?? this.generationCounter;
		this.setStatus('switching');
		this.markInactive();
		const teardownError = await this.stopResources();
		this.nextGeneration();
		this.markCleared();
		await this.clearState(previousSession ? this.context(this.activeTarget, previousSession, previousGeneration) : null);
		this.setStatus('stopped', teardownError);
		if (teardownError) throw teardownError;
	}
}

export function createSessionCoordinator(
	options: SessionCoordinatorOptions
): VenueSessionCoordinator;
export function createSessionCoordinator(
	adapters: AdapterSource,
	effects?: SessionCoordinatorEffects
): VenueSessionCoordinator;
export function createSessionCoordinator(
	input: SessionCoordinatorOptions | AdapterSource,
	effects?: SessionCoordinatorEffects
): VenueSessionCoordinator {
	return new VenueSessionCoordinator(input, effects);
}

/** Short alias for code that treats the coordinator itself as the session. */
export { VenueSessionCoordinator as SessionCoordinator };
