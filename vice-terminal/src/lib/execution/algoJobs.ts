export type LocalAlgoStatus = 'running' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'emergencyStopped';

/** Set only when a process restart leaves a strategy without a complete child-command recovery path. */
export interface LocalAlgoRestartBoundary {
	restartRecoveryRequired?: boolean;
}

export interface LocalChaseJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'chase';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	totalSize: number;
	remainingSize: number;
	offsetTicks: number;
	maxChases: number;
	chases: number;
	currentOrderId?: string;
	/** Persisted before a child placement so restart recovery can adopt its exact venue order. */
	pendingChildCommandId?: string;
	childOrderIds: string[];
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalOcoJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'oco';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	size: number;
	takeProfit: number;
	stopLoss: number;
	takeProfitOrderId?: string;
	stopLossOrderId?: string;
	/** Present only on jobs that journal each sequential OCO child before signing. */
	dispatchRecoveryVersion?: 1;
	pendingTakeProfitCommandId?: string;
	pendingStopLossCommandId?: string;
	childOrderIds: string[];
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalTrailingJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'trailing';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	size: number;
	offset: number;
	peakOrTrough: number;
	currentOrderId?: string;
	/** Present only on jobs that journal every child placement before signing. */
	dispatchRecoveryVersion?: 1;
	/** Persisted before a child placement so restart recovery can adopt its exact venue order. */
	pendingChildCommandId?: string;
	childOrderIds: string[];
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalBreakEvenJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'break_even';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	size: number;
	entryPrice: number;
	triggerDistance: number;
	offset: number;
	activated: boolean;
	currentOrderId?: string;
	dispatchRecoveryVersion?: 1;
	pendingChildCommandId?: string;
	childOrderIds: string[];
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalConditionalLadderJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'conditional_ladder';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	size: number;
	triggerPrice: number;
	startPrice: number;
	endPrice: number;
	levels: number;
	skew: number;
	triggerKind: 'stop' | 'takeProfit';
	/** Price-cross remains the legacy default; candle sources require a live, exact interval. */
	triggerSource?: 'priceCross' | 'candleClose' | 'candleVolume' | 'time' | 'syntheticPair';
	triggerInterval?: string;
	triggerThreshold?: number;
	triggerAtMs?: number;
	pairMarketKey?: string;
	pairApiCoin?: string;
	pairOperation?: import('./conditionalTriggers').SyntheticPairOperation;
	/** Persisted before dispatch so a restart cannot replay a crossed trigger. */
	triggerState?: import('./conditionalTriggers').ConditionalTriggerState;
	/** Persisted before a Scale dispatch so restart recovery can adopt its exact venue children. */
	pendingScaleCommandId?: string;
	activated: boolean;
	childOrderIds: string[];
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalScaleJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'scale';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	totalSize: number;
	startPrice: number;
	endPrice: number;
	levels: number;
	skew: number;
	postOnly: boolean;
	reduceOnly: boolean;
	filledSize: number;
	childOrderIds: string[];
	/** Persisted before dispatch; never resend until the journal proves the outcome. */
	pendingScaleCommandId?: string;
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalIcebergJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'iceberg';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	totalSize: number;
	remainingSize: number;
	displaySize: number;
	price: number;
	currentOrderId?: string;
	/** Present only on jobs that journal every slice placement before signing. */
	dispatchRecoveryVersion?: 1;
	/** Persisted before a slice placement so restart recovery can adopt its exact venue order. */
	pendingChildCommandId?: string;
	childOrderIds: string[];
	filledSize: number;
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalSwarmJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'swarm';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	totalSize: number;
	sliceSize: number;
	slicesTotal: number;
	slicesPlaced: number;
	centerPrice: number;
	spreadPct: number;
	deadmanMs?: number;
	/** Present only on jobs that journal every ladder child before signing. */
	dispatchRecoveryVersion?: 1;
	pendingChildCommandId?: string;
	pendingChildIndex?: number;
	childOrderIds: string[];
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalPingPongJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'ping_pong';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	totalSize: number;
	cycles: number;
	completedLegs: number;
	rangePct: number;
	pauseMs: number;
	centerPrice: number;
	nextSide: 'buy' | 'sell';
	deadmanMs?: number;
	currentOrderId?: string;
	/** Present only on jobs that journal every alternating leg before signing. */
	dispatchRecoveryVersion?: 1;
	pendingChildCommandId?: string;
	childOrderIds: string[];
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export interface LocalAdaptiveJob extends LocalAlgoRestartBoundary {
	id: string;
	type: 'adaptive_twap' | 'vwap' | 'pov';
	marketKey: string;
	apiCoin: string;
	assetId: number;
	side: 'buy' | 'sell';
	totalSize: number;
	remainingSize: number;
	executedSize: number;
	durationMinutes: number;
	intervals: number;
	participation: number;
	offsetTicks: number;
	sliceIndex: number;
	nextSliceAt: number;
	currentOrderId?: string;
	dispatchRecoveryVersion?: 1;
	pendingChildCommandId?: string;
	childOrderIds: string[];
	deadmanMs?: number;
	status: LocalAlgoStatus;
	error?: string;
	createdAt: number;
	updatedAt: number;
}

export type LocalAlgoJob = LocalChaseJob | LocalOcoJob | LocalTrailingJob | LocalBreakEvenJob | LocalConditionalLadderJob | LocalScaleJob | LocalIcebergJob | LocalSwarmJob | LocalPingPongJob | LocalAdaptiveJob;
import { hyperliquidNetwork } from '$lib/hl/network';

const STORAGE_KEY = 'vice.local-algo-jobs.v1';
let activeOwner: string | null = null;

export function setLocalAlgoOwner(owner: string | null): void {
	activeOwner = owner?.toLowerCase() ?? null;
}

function scopedStorageKey(): string {
	return `${STORAGE_KEY}:${hyperliquidNetwork.network}:${activeOwner ?? 'locked'}`;
}

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

export function loadLocalAlgoJobs(): LocalAlgoJob[];
export function loadLocalAlgoJobs(type: 'chase'): LocalChaseJob[];
export function loadLocalAlgoJobs(type: 'oco'): LocalOcoJob[];
export function loadLocalAlgoJobs(type: 'trailing'): LocalTrailingJob[];
export function loadLocalAlgoJobs(type: 'break_even'): LocalBreakEvenJob[];
export function loadLocalAlgoJobs(type: 'conditional_ladder'): LocalConditionalLadderJob[];
export function loadLocalAlgoJobs(type: 'scale'): LocalScaleJob[];
export function loadLocalAlgoJobs(type: 'iceberg'): LocalIcebergJob[];
export function loadLocalAlgoJobs(type: 'swarm'): LocalSwarmJob[];
export function loadLocalAlgoJobs(type: 'ping_pong'): LocalPingPongJob[];
export function loadLocalAlgoJobs(type: 'adaptive_twap' | 'vwap' | 'pov'): LocalAdaptiveJob[];
export function loadLocalAlgoJobs(type?: 'chase' | 'oco' | 'trailing' | 'break_even' | 'conditional_ladder' | 'scale' | 'iceberg' | 'swarm' | 'ping_pong' | 'adaptive_twap' | 'vwap' | 'pov'): LocalAlgoJob[] {
	if (!canUseStorage() || !activeOwner) return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(scopedStorageKey()) ?? '[]');
		const jobs = Array.isArray(parsed) ? parsed.filter((job) => ['chase', 'oco', 'trailing', 'break_even', 'conditional_ladder', 'scale', 'iceberg', 'swarm', 'ping_pong', 'adaptive_twap', 'vwap', 'pov'].includes(job?.type)) : [];
		return type ? jobs.filter((job) => job.type === type) : jobs;
	} catch {
		return [];
	}
}

export function persistLocalAlgoJobs(jobs: LocalAlgoJob[]): void {
	if (canUseStorage() && activeOwner) localStorage.setItem(scopedStorageKey(), JSON.stringify(jobs));
}

export function upsertLocalAlgoJob(job: LocalAlgoJob): LocalAlgoJob[] {
	const jobs = loadLocalAlgoJobs();
	const index = jobs.findIndex((candidate) => candidate.id === job.id);
	if (index < 0) jobs.push(job);
	else jobs[index] = job;
	persistLocalAlgoJobs(jobs);
	return jobs;
}

export function updateLocalAlgoJob(id: string, update: Partial<LocalAlgoJob>): LocalAlgoJob | undefined {
	const jobs = loadLocalAlgoJobs();
	const current = jobs.find((job) => job.id === id);
	if (!current) return undefined;
	const next = { ...current, ...update, updatedAt: Date.now() } as LocalAlgoJob;
	upsertLocalAlgoJob(next);
	return next;
}

export function clearLocalAlgoJobs(): void {
	if (canUseStorage() && activeOwner) localStorage.removeItem(scopedStorageKey());
}

/**
 * Browser restarts stop timers but can interrupt an unjournaled child update.
 * Scale, conditional ladders, Chase, and versioned child-order jobs recover
 * through the command journal. Every other running local strategy must stop for review
 * until it gains the same complete recovery evidence.
 */
export function pauseRestartUnsafeLocalAlgoJobs(): LocalAlgoJob[] {
	const jobs = loadLocalAlgoJobs();
	const guarded = jobs.map((job) => {
		if (
			job.status !== 'running' ||
			job.type === 'scale' ||
			job.type === 'conditional_ladder' ||
			job.type === 'chase' ||
			(['trailing', 'iceberg', 'oco', 'ping_pong', 'swarm', 'break_even', 'adaptive_twap', 'vwap', 'pov'].includes(job.type) && 'dispatchRecoveryVersion' in job && job.dispatchRecoveryVersion === 1)
		) return job;
		return {
			...job,
			status: 'paused' as const,
			restartRecoveryRequired: true,
			error: 'Automatic resume is blocked after restart until this strategy has complete child-command recovery',
			updatedAt: Date.now()
		};
	});
	if (guarded.some((job, index) => job !== jobs[index])) persistLocalAlgoJobs(guarded);
	return guarded;
}

export function transitionLocalAlgoJob<T extends LocalAlgoJob>(job: T, status: LocalAlgoStatus, error?: string): T {
	return { ...job, status, error, updatedAt: Date.now() } as T;
}
