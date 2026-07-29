import { get } from 'svelte/store';
import { candleDataStatus, chartCandles, chartTimeframe, fills, localAlgoJobs, marketDataStatus, marketRegistry, openOrders, orderBook, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { loadLocalAlgoJobs, transitionLocalAlgoJob, upsertLocalAlgoJob, type LocalConditionalLadderJob } from './algoJobs';
import { cancelAlgoChildren } from './algoCancellation';
import { createTickGuard } from './tickGuard';
import { validConditionalLadderParameters } from './conditionalLadderMath';
import { evaluateConditionalTrigger, pauseConditionalTrigger, type ConditionalTrigger, type TriggerComparator } from './conditionalTriggers';
import { exactAllMidIsLive } from '$lib/hl/subscriptions';
import { recordAutomationTriggerOutcome } from './automationTelemetry';
import { loadExecutionJournal } from './commandJournal';
import { recoverPendingScaleDispatch } from './scaleDispatchRecovery';

type ConditionalLadderTrigger = Extract<ConditionalTrigger, { type: 'priceCross' | 'candleClose' | 'candleVolume' | 'time' | 'syntheticPair' }>;

type ConditionalLadderParams = {
	side: 'buy' | 'sell'; size: number; triggerPrice: number; startPrice: number; endPrice: number;
	levels: number; skew: number; triggerKind?: 'stop' | 'takeProfit'; triggerSource?: 'priceCross' | 'candleClose' | 'candleVolume' | 'time' | 'syntheticPair'; triggerInterval?: string; triggerThreshold?: number; triggerAtMs?: number; pairMarketKey?: string; pairOperation?: 'ratio' | 'spread'; deadmanMs?: number;
};
const timers = new Map<string, ReturnType<typeof setInterval>>();
const tickGuard = createTickGuard();
function sync(): void { localAlgoJobs.set(loadLocalAlgoJobs()); }
function save(job: LocalConditionalLadderJob): void { upsertLocalAlgoJob(job); sync(); }
function stop(id: string): void { const timer = timers.get(id); if (timer) clearInterval(timer); timers.delete(id); }
function recoverPendingDispatch(job: LocalConditionalLadderJob): LocalConditionalLadderJob {
	const owner = get(walletAddress);
	const recovered = recoverPendingScaleDispatch(job, owner ? loadExecutionJournal(owner) : []);
	if (recovered !== job) save(recovered);
	return recovered;
}
function mark(): number | null {
	const book = get(orderBook); const bid = book.bids[0]?.price; const ask = book.asks[0]?.price;
	return bid && ask ? (bid + ask) / 2 : null;
}

function triggerComparator(side: ConditionalLadderParams['side'], kind: NonNullable<ConditionalLadderParams['triggerKind']>): TriggerComparator {
	if (kind === 'takeProfit') return side === 'buy' ? 'atOrBelow' : 'atOrAbove';
	return side === 'buy' ? 'atOrAbove' : 'atOrBelow';
}

function triggerFor(job: LocalConditionalLadderJob): ConditionalLadderTrigger {
	const source = job.triggerSource ?? 'priceCross';
	const threshold = job.triggerThreshold ?? job.triggerPrice;
	const comparator = triggerComparator(job.side, job.triggerKind);
	if (source === 'priceCross') return { type: source, marketKey: job.marketKey, comparator, threshold };
	if (source === 'time') return { type: source, fireAtMs: job.triggerAtMs ?? Number.NaN };
	if (source === 'syntheticPair') return { type: source, leftMarketKey: job.marketKey, rightMarketKey: job.pairMarketKey ?? '', operation: job.pairOperation ?? 'ratio', comparator, threshold };
	return { type: source, marketKey: job.marketKey, interval: job.triggerInterval ?? '1h', comparator, threshold };
}

function candleClosedAtMs(timeSeconds: number, interval: string): number | null {
	const intervalMs: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1D': 86_400_000 };
	const duration = intervalMs[interval];
	return duration && Number.isFinite(timeSeconds) ? timeSeconds * 1_000 + duration : null;
}

async function tick(id: string): Promise<void> {
	let job = loadLocalAlgoJobs('conditional_ladder').find((candidate) => candidate.id === id);
	if (!job || job.status !== 'running') { stop(id); return; }
	const { localExecution } = await import('./localExecution');
	if (!localExecution.isReady()) { save(transitionLocalAlgoJob(job, 'paused', 'Secure trading is locked; resume after unlocking the local agent')); stop(id); return; }
	if (get(selectedMarket)?.marketKey !== job.marketKey) { save(transitionLocalAlgoJob(job, 'paused', 'Select the conditional-ladder market so its live book is authoritative')); stop(id); return; }
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === job!.marketKey);
	if (!market) return;
	if (!job.activated) {
		const alreadyFired = job.triggerState?.status === 'fired';
		const now = Date.now();
		const trigger = triggerFor(job);
		if ((trigger.type === 'priceCross' || trigger.type === 'time' || trigger.type === 'syntheticPair') && get(marketDataStatus) !== 'live') {
			recordAutomationTriggerOutcome(trigger.type, 'paused', now);
			save({ ...transitionLocalAlgoJob(job, 'paused', `Conditional ${trigger.type === 'time' ? 'time' : trigger.type === 'syntheticPair' ? 'pair' : 'price'} trigger paused because the selected market feed is stale`), triggerState: pauseConditionalTrigger(job.triggerState, now) });
			stop(id);
			return;
		}
		if ((trigger.type === 'candleClose' || trigger.type === 'candleVolume') && (get(candleDataStatus) !== 'live' || get(chartTimeframe) !== trigger.interval)) {
			recordAutomationTriggerOutcome(trigger.type, 'paused', now);
			save({ ...transitionLocalAlgoJob(job, 'paused', 'Conditional candle trigger paused because its exact live interval is unavailable'), triggerState: pauseConditionalTrigger(job.triggerState, now) });
			stop(id);
			return;
		}
		let decision: ReturnType<typeof evaluateConditionalTrigger>;
		if (trigger.type === 'priceCross') {
			const current = mark();
			if (current == null) return;
			decision = evaluateConditionalTrigger(trigger, job.triggerState, { nowMs: now, price: { marketKey: job.marketKey, value: current, live: true } });
		} else if (trigger.type === 'time') {
			decision = evaluateConditionalTrigger(trigger, job.triggerState, { nowMs: now, clockLive: true });
		} else if (trigger.type === 'syntheticPair') {
			const pairMarket = get(marketRegistry).find((candidate) => candidate.marketKey === trigger.rightMarketKey);
			if (!pairMarket || !job.pairApiCoin || !exactAllMidIsLive(job.apiCoin, now) || !exactAllMidIsLive(job.pairApiCoin, now)) {
				recordAutomationTriggerOutcome(trigger.type, 'paused', now);
				save({ ...transitionLocalAlgoJob(job, 'paused', 'Conditional pair trigger paused because an exact all-mids leg is stale or unavailable'), triggerState: pauseConditionalTrigger(job.triggerState, now) });
				stop(id);
				return;
			}
			decision = evaluateConditionalTrigger(trigger, job.triggerState, { nowMs: now, pair: { leftMarketKey: job.marketKey, leftValue: market.lastPrice, leftLive: true, rightMarketKey: pairMarket.marketKey, rightValue: pairMarket.lastPrice, rightLive: true } });
		} else {
			const candle = get(chartCandles).at(-1);
			const closedAtMs = candle ? candleClosedAtMs(candle.time, trigger.interval) : null;
			if (!candle || closedAtMs == null) return;
			decision = evaluateConditionalTrigger(trigger, job.triggerState, { nowMs: now, candle: { marketKey: job.marketKey, interval: trigger.interval, close: candle.close, volume: candle.volume ?? 0, closedAtMs, complete: true, live: true } });
		}
		job = { ...job, triggerState: decision.state, updatedAt: Date.now() };
		if (decision.action === 'invalid') { save(transitionLocalAlgoJob(job, 'failed', decision.reason ?? 'Conditional trigger state is invalid')); stop(id); return; }
		if (decision.action === 'paused') { recordAutomationTriggerOutcome(trigger.type, 'paused', now); save(transitionLocalAlgoJob(job, 'paused', decision.reason ?? 'Conditional trigger source is stale')); stop(id); return; }
		if (decision.action === 'missed') { recordAutomationTriggerOutcome(trigger.type, 'missed', now); save(transitionLocalAlgoJob(job, 'paused', `${decision.reason ?? 'Conditional trigger was missed'}. Resume to explicitly re-arm from a live price.`)); stop(id); return; }
		if (decision.action === 'armed' || decision.action === 'pending') { save(job); return; }
		// Persist the fired edge before dispatch. A restart after this point must
		// reconcile, not send another ladder from the same observed crossing.
		save(job);
		if (alreadyFired) { save(transitionLocalAlgoJob(job, 'paused', 'Conditional trigger was already dispatched; reconcile or cancel before creating a new ladder')); stop(id); return; }
		recordAutomationTriggerOutcome(trigger.type, 'fired', now);
		if (job.deadmanMs) {
			const armed = await localExecution.armDeadman(job.deadmanMs);
			if (!armed.accepted) { save(transitionLocalAlgoJob(job, 'failed', armed.error ?? 'Dead-man switch could not be armed before ladder placement')); stop(id); return; }
		}
		const dispatching = { ...job, pendingScaleCommandId: crypto.randomUUID(), updatedAt: Date.now() };
		save(dispatching);
		const ack = await localExecution.placeScale(market, { isBuy: job.side === 'buy', size: job.size, reduceOnly: false, postOnly: true, startPrice: job.startPrice, endPrice: job.endPrice, levels: job.levels, skew: job.skew, commandId: dispatching.pendingScaleCommandId });
		if (!ack.accepted || ack.venueOrderIds.length === 0) { save({ ...transitionLocalAlgoJob(dispatching, ack.uncertain ? 'paused' : 'failed', ack.error ?? 'Conditional ladder placement failed'), pendingScaleCommandId: ack.uncertain ? dispatching.pendingScaleCommandId : undefined }); stop(id); return; }
		job = { ...dispatching, pendingScaleCommandId: undefined, activated: true, childOrderIds: ack.venueOrderIds, updatedAt: Date.now() };
		save(job);
		if (job.deadmanMs) {
			const rearmed = await localExecution.armDeadman(job.deadmanMs);
			if (!rearmed.accepted) { save(transitionLocalAlgoJob(job, 'failed', rearmed.error ?? 'Dead-man switch could not be re-armed after ladder placement')); stop(id); }
		}
		return;
	}
	const open = get(openOrders).filter((order) => job!.childOrderIds.includes(order.id));
	if (open.length > 0) return;
	await import('$lib/hl/orders').then(({ fetchOpenOrders }) => fetchOpenOrders());
	const refreshed = get(openOrders).filter((order) => job!.childOrderIds.includes(order.id));
	if (refreshed.length > 0) return;
	const filled = get(fills).filter((fill) => job!.childOrderIds.includes(fill.orderId)).reduce((sum, fill) => sum + fill.size, 0);
	if (filled >= job.size) save(transitionLocalAlgoJob(job, 'completed'));
	else save(transitionLocalAlgoJob(job, 'paused', 'Conditional ladder children disappeared without authoritative completion'));
	if (job.deadmanMs && filled >= job.size) await localExecution.clearDeadman();
	stop(id);
}
function startTimer(id: string): void {
	if (timers.has(id)) return;
	timers.set(id, setInterval(() => void tickGuard.run(id, () => tick(id)).catch((error) => { const job = loadLocalAlgoJobs('conditional_ladder').find((candidate) => candidate.id === id); if (job) save(transitionLocalAlgoJob(job, 'failed', error instanceof Error ? error.message : 'Conditional ladder reconciliation failed')); stop(id); }), 250));
	void tickGuard.run(id, () => tick(id));
}

export async function startConditionalLadder(market: MarketDescriptor, params: ConditionalLadderParams): Promise<{ ok: boolean; jobId?: string; error?: string }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before starting a conditional ladder' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the conditional-ladder market so its live book is authoritative' };
	const triggerSource = params.triggerSource ?? 'priceCross';
	const triggerThreshold = params.triggerThreshold ?? params.triggerPrice;
	if (!['priceCross', 'candleClose', 'candleVolume', 'time', 'syntheticPair'].includes(triggerSource) || ((triggerSource === 'candleClose' || triggerSource === 'candleVolume') && !candleClosedAtMs(0, params.triggerInterval ?? ''))) return { ok: false, error: 'Conditional trigger source or interval is invalid' };
	if (triggerSource === 'time' && (!Number.isFinite(params.triggerAtMs) || params.triggerAtMs! <= Date.now())) return { ok: false, error: 'Choose a future local time for the conditional ladder' };
	const pair = triggerSource === 'syntheticPair' ? get(marketRegistry).find((candidate) => candidate.marketKey === params.pairMarketKey) : undefined;
	if (triggerSource === 'syntheticPair' && (!pair || pair.marketKey === market.marketKey || !params.pairOperation)) return { ok: false, error: 'Choose one distinct exact reference market and a pair operation' };
	if (!validConditionalLadderParameters(params.size, triggerThreshold, params.startPrice, params.endPrice, Math.round(params.levels), params.skew, triggerSource === 'priceCross' || triggerSource === 'candleClose' || triggerSource === 'candleVolume' || triggerSource === 'syntheticPair', triggerSource === 'syntheticPair' && params.pairOperation === 'spread')) return { ok: false, error: 'Conditional ladder parameters are invalid' };
	const now = Date.now();
	const job: LocalConditionalLadderJob = { id: crypto.randomUUID(), type: 'conditional_ladder', marketKey: market.marketKey, apiCoin: market.apiCoin, assetId: market.assetId, side: params.side, size: params.size, triggerPrice: triggerThreshold, startPrice: params.startPrice, endPrice: params.endPrice, levels: Math.round(params.levels), skew: params.skew, triggerKind: params.triggerKind ?? 'stop', triggerSource, triggerInterval: triggerSource === 'candleClose' || triggerSource === 'candleVolume' ? params.triggerInterval : undefined, triggerThreshold, triggerAtMs: triggerSource === 'time' ? params.triggerAtMs : undefined, pairMarketKey: pair?.marketKey, pairApiCoin: pair?.apiCoin, pairOperation: triggerSource === 'syntheticPair' ? params.pairOperation : undefined, activated: false, childOrderIds: [], deadmanMs: params.deadmanMs, status: 'running', createdAt: now, updatedAt: now };
	save(job); await tick(job.id);
	const started = loadLocalAlgoJobs('conditional_ladder').find((candidate) => candidate.id === job.id);
	if (!started || started.status !== 'running') { stop(job.id); return { ok: false, error: started?.error ?? 'Conditional ladder could not start' }; }
	startTimer(job.id); return { ok: true, jobId: job.id };
}
export async function pauseConditionalLadder(id: string): Promise<void> { stop(id); const job = loadLocalAlgoJobs('conditional_ladder').find((candidate) => candidate.id === id); if (job) save(transitionLocalAlgoJob(job, 'paused')); }
export async function resumeConditionalLadder(id: string): Promise<void> {
	const job = loadLocalAlgoJobs('conditional_ladder').find((candidate) => candidate.id === id);
	if (!job || job.status !== 'paused') return;
	const recovered = recoverPendingDispatch(job);
	if (recovered.pendingScaleCommandId) return;
	// A user who resumes after a recorded missed crossing explicitly starts a
	// new observation window. Other persisted states retain their safe history.
	save({ ...recovered, status: 'running', error: undefined, triggerState: recovered.triggerState?.status === 'missed' ? undefined : recovered.triggerState, updatedAt: Date.now() });
	startTimer(id);
}
export async function cancelConditionalLadder(id: string, emergency = false): Promise<void> {
	const job = loadLocalAlgoJobs('conditional_ladder').find((candidate) => candidate.id === id); if (!job) return; stop(id);
	const cancellation = await cancelAlgoChildren(job.childOrderIds, (orderId) => import('$lib/hl/orders').then(({ cancelOrder }) => cancelOrder(orderId, job.apiCoin)));
	if (!cancellation.ok) { save(transitionLocalAlgoJob(job, 'paused', cancellation.error ?? 'Conditional ladder cancellation requires reconciliation')); return; }
	if (!emergency && job.deadmanMs) { const cleared = await import('./localExecution').then(({ localExecution }) => localExecution.clearDeadman()); if (!cleared.accepted) { save(transitionLocalAlgoJob(job, 'paused', cleared.error ?? 'Conditional ladder dead-man clear requires reconciliation')); return; } }
	save(transitionLocalAlgoJob(job, emergency ? 'emergencyStopped' : 'cancelled', emergency ? 'Emergency stop requested' : undefined));
}
export function resumePersistedConditionalLadders(): void {
	sync();
	for (const job of loadLocalAlgoJobs('conditional_ladder').filter((candidate) => candidate.status === 'running')) {
		const recovered = recoverPendingDispatch(job);
		if (recovered.status === 'running') startTimer(recovered.id);
	}
}
export function stopAllConditionalLadderTimers(): void { for (const id of timers.keys()) stop(id); }
