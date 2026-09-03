import { get } from 'svelte/store';
import { fills, localAlgoJobs, marketRegistry, openOrders, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalScaleJob } from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { buildScaleLevels } from './scaleMath';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingScaleDispatch } from './scaleDispatchRecovery';

type ScaleParams = {
	side: 'buy' | 'sell';
	size: number;
	startPrice: number;
	endPrice: number;
	levels: number;
	skew: number;
	postOnly: boolean;
	reduceOnly: boolean;
	deadmanMs?: number;
};

const timers = new Map<string, ReturnType<typeof setInterval>>();
const running = new Set<string>();
const tickGuard = createTickGuard();
function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalScaleJob): void { upsertLocalAlgoJob(job); sync(); }
function stop(id: string): void { const timer = timers.get(id); if (timer) clearInterval(timer); timers.delete(id); running.delete(id); }
export function stopAllScaleTimers(): void {
	for (const id of timers.keys()) stop(id);
}

function recoverPendingDispatch(job: LocalScaleJob): LocalScaleJob {
	const owner = get(walletAddress);
	const recovered = recoverPendingScaleDispatch(job, owner ? loadExecutionJournal(owner) : []);
	if (recovered !== job) save(recovered);
	return recovered;
}

async function tick(id: string): Promise<void> {
	let job = loadLocalAlgoJobs('scale').find((candidate) => candidate.id === id);
	if (!job || job.status !== 'running') { stop(id); return; }
	const { localExecution } = await import('./localExecution');
	if (!running.has(id)) return;
	if (!localExecution.isReady()) { save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent')); stop(id); return; }
	if (get(selectedMarket)?.marketKey !== job.marketKey) { save(transitionLocalAlgoJob(job, 'paused', 'Select the scale market so its live book is authoritative')); stop(id); return; }
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	if (!market) { save(transitionLocalAlgoJob(job, 'paused', 'Scale market identity is unavailable after reconnect')); stop(id); return; }

	if (job.childOrderIds.length === 0) {
		if (job.deadmanMs) {
			const armed = await localExecution.armDeadman(job.deadmanMs);
			if (!running.has(id)) {
				if (armed.accepted) await localExecution.clearDeadman();
				return;
			}
			if (!armed.accepted) { save(transitionLocalAlgoJob(job, 'failed', armed.error ?? 'Dead-man switch could not be armed before scale placement')); stop(id); return; }
		}
		if (!running.has(id)) return;
		const dispatching = { ...job, pendingScaleCommandId: crypto.randomUUID(), updatedAt: Date.now() };
		save(dispatching);
		const ack = await localExecution.placeScale(market, {
			isBuy: job.side === 'buy', size: job.totalSize, reduceOnly: job.reduceOnly,
			postOnly: job.postOnly, startPrice: job.startPrice, endPrice: job.endPrice,
			levels: job.levels, skew: job.skew, commandId: dispatching.pendingScaleCommandId
		});
		if (!running.has(id)) {
			for (const orderId of ack.venueOrderIds) await localExecution.cancelOrder(market, orderId);
			return;
		}
		if (!ack.accepted || ack.venueOrderIds.length === 0) {
			save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Scale placement failed'), pendingScaleCommandId: ack.uncertain ? dispatching.pendingScaleCommandId : undefined });
			stop(id);
			return;
		}
		job = { ...dispatching, pendingScaleCommandId: undefined, childOrderIds: ack.venueOrderIds, updatedAt: Date.now() };
		save(job);
		if (job.deadmanMs) {
			const rearmed = await localExecution.armDeadman(job.deadmanMs);
			if (!running.has(id)) {
				if (rearmed.accepted) await localExecution.clearDeadman();
				return;
			}
			if (!rearmed.accepted) { save(transitionLocalAlgoJob(job, 'failed', rearmed.error ?? 'Dead-man switch could not be re-armed after scale placement')); stop(id); }
		}
		return;
	}

	const open = get(openOrders).filter((order) => job!.childOrderIds.includes(order.id));
	if (open.length > 0) return;
	await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
	if (!running.has(id)) return;
	const refreshed = get(openOrders).filter((order) => job!.childOrderIds.includes(order.id));
	if (refreshed.length > 0) return;
	const outcomes = await Promise.all(job.childOrderIds.map((orderId) => localExecution.getOrderOutcome(orderId)));
	if (!running.has(id)) return;
	// Never treat a temporarily missing local row as terminal. An authoritative
	// open child may be partially filled, and an unknown child must remain
	// recoverable rather than allowing a replacement batch or false completion.
	if (outcomes.some((outcome) => outcome.status === 'open')) return;
	if (outcomes.some((outcome) => outcome.status === 'unknown')) {
		save(transitionLocalAlgoJob(job, 'paused', 'Scale children disappeared without an authoritative outcome'));
		stop(id);
		return;
	}
	const observedFilled = Math.max(
		get(fills).filter((fill) => job!.childOrderIds.includes(fill.orderId)).reduce((sum, fill) => sum + fill.size, 0),
		outcomes.reduce((sum, outcome) => sum + outcome.filled, 0)
	);
	const filled = Math.min(job.totalSize, observedFilled);
	if (filled >= job.totalSize) {
		save({ ...transitionLocalAlgoJob(job, 'completed'), filledSize: filled });
		if (job.deadmanMs) await localExecution.clearDeadman();
	} else {
		save({ ...transitionLocalAlgoJob(job, 'paused', 'Scale children disappeared without authoritative completion'), filledSize: filled });
	}
	stop(id);
}

function startTimer(id: string): void {
	if (timers.has(id)) return;
	running.add(id);
	timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => {
		const job = loadLocalAlgoJobs('scale').find((candidate) => candidate.id === id);
		if (job?.status === 'running') save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Scale reconciliation failed'));
		stop(id);
	}), 250));
	void tickGuard.run(id, () => tick(id));
}

export async function startScale(market: MarketDescriptor, params: ScaleParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting a scale' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the scale market so its live book is authoritative' };
	try {
		// Validate before persistence so a malformed preset cannot leave a job
		// that later fails only when its child orders are about to be sent.
		buildScaleLevels(params.startPrice, params.endPrice, params.size, params.levels, params.skew);
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Scale parameters are invalid' };
	}
	const now = Date.now();
	const job: LocalScaleJob = {
		id: crypto.randomUUID(), type: 'scale', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId,
		side: params.side, totalSize: params.size, startPrice: params.startPrice, endPrice: params.endPrice,
		levels: Math.round(params.levels), skew: params.skew, postOnly: params.postOnly, reduceOnly: params.reduceOnly,
		filledSize: 0, childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: now, updatedAt: now
	};
	running.add(job.id);
	save(job);
	try {
		await tick(job.id);
	} catch (error) {
		const current = loadLocalAlgoJobs('scale').find((candidate) => candidate.id === job.id);
		if (current?.status === 'running') save(transitionLocalAlgoJob(current, 'paused', error instanceof Error ? error.message : 'Scale could not start'));
		stop(job.id);
	}
	const started = loadLocalAlgoJobs('scale').find((candidate) => candidate.id === job.id);
	if (!started || started.status !== 'running') { stop(job.id); return { ok: false, error: started?.error ?? 'Scale could not start' }; }
	startTimer(job.id);
	return { ok: true, jobId: job.id };
}

export async function pauseScale(id: string): Promise<void> {
	stop(id);
	const job = loadLocalAlgoJobs('scale').find((candidate) => candidate.id === id);
	if (job) save(transitionLocalAlgoJob(job, 'paused'));
}

export async function resumeScale(id: string): Promise<void> {
	const job = loadLocalAlgoJobs('scale').find((candidate) => candidate.id === id);
	if (job && ['paused', 'failed'].includes(job.status)) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.pendingScaleCommandId) return;
		running.add(id);
		save({ ...recovered, status: 'running', error: undefined, updatedAt: Date.now() });
		startTimer(id);
	}
}

export async function cancelScale(id: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('scale').find((candidate) => candidate.id === id);
	if (!job) return;
	stop(id);
	const cancellation = await cancelAlgoChildren(job.childOrderIds, (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin)));
	if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Scale cancellation requires reconciliation')); return; }
	if (!emergency && job.deadmanMs) {
		const cleared = await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman());
		if (!cleared.accepted) { save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'Scale dead-man clear requires reconciliation')); return; }
	}
	save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined));
}

export function resumePersistedScales(): void {
	sync();
	for (const job of loadLocalAlgoJobs('scale').filter((candidate) => candidate.status === 'running')) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.status === 'running') startTimer(recovered.id);
	}
}
