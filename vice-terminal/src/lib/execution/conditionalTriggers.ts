/**
 * Pure, runtime-neutral conditional-trigger state machine. It owns no timer,
 * credential, or execution path, so the browser and a future user-run runner
 * must make the same decision from the same live observations.
 */
export type TriggerComparator = 'atOrAbove' | 'atOrBelow';
export type SyntheticPairOperation = 'ratio' | 'spread';

export type ConditionalTrigger =
	| { type: 'priceCross'; marketKey: string; comparator: TriggerComparator; threshold: number }
	| { type: 'candleClose'; marketKey: string; interval: string; comparator: TriggerComparator; threshold: number }
	| { type: 'candleVolume'; marketKey: string; interval: string; comparator: TriggerComparator; threshold: number }
	| { type: 'time'; fireAtMs: number }
	| { type: 'syntheticPair'; leftMarketKey: string; rightMarketKey: string; operation: SyntheticPairOperation; comparator: TriggerComparator; threshold: number };

export type ConditionalTriggerState = {
	status: 'new' | 'armed' | 'paused' | 'missed' | 'fired';
	lastValue?: number;
	lastCandleCloseMs?: number;
	lastObservedAtMs?: number;
	pausedAtMs?: number;
};

export type ConditionalTriggerObservation = {
	nowMs: number;
	clockLive?: boolean;
	price?: { marketKey: string; value: number; live: boolean };
	candle?: { marketKey: string; interval: string; close: number; volume: number; closedAtMs: number; complete: boolean; live: boolean };
	pair?: { leftMarketKey: string; leftValue: number; leftLive: boolean; rightMarketKey: string; rightValue: number; rightLive: boolean };
};

export type ConditionalTriggerDecision = {
	action: 'armed' | 'pending' | 'fired' | 'paused' | 'missed' | 'invalid';
	state: ConditionalTriggerState;
	reason?: string;
};

const fresh = (): ConditionalTriggerState => ({ status: 'new' });
const validPositive = (value: number): boolean => Number.isFinite(value) && value > 0;
const conditionMet = (value: number, comparator: TriggerComparator, threshold: number): boolean => comparator === 'atOrAbove' ? value >= threshold : value <= threshold;
const crossed = (previous: number, next: number, comparator: TriggerComparator, threshold: number): boolean => comparator === 'atOrAbove'
	? previous < threshold && next >= threshold
	: previous > threshold && next <= threshold;

export function pauseConditionalTrigger(state: ConditionalTriggerState | undefined, nowMs: number): ConditionalTriggerState {
	const current = state ?? fresh();
	if (current.status === 'fired' || current.status === 'missed') return current;
	return { ...current, status: 'paused', pausedAtMs: nowMs, lastObservedAtMs: nowMs };
}

function invalid(state: ConditionalTriggerState, reason: string): ConditionalTriggerDecision {
	return { action: 'invalid', state, reason };
}

function evaluateCross(
	state: ConditionalTriggerState,
	nowMs: number,
	value: number,
	live: boolean,
	comparator: TriggerComparator,
	threshold: number,
	allowSigned = false
): ConditionalTriggerDecision {
	const valid = allowSigned ? Number.isFinite : validPositive;
	if (!valid(value) || !valid(threshold)) return invalid(state, allowSigned ? 'Trigger values must be finite numbers' : 'Trigger values must be finite positive numbers');
	if (state.status === 'fired' || state.status === 'missed') return { action: state.status, state };
	if (!live) return { action: 'paused', state: pauseConditionalTrigger({ ...state, lastValue: value }, nowMs), reason: 'Trigger source is stale' };
	if (state.status === 'paused') {
		// A transition may have happened while source health was unknown. Do not
		// dispatch from the recovered value; require an explicit re-arm instead.
		if (state.lastValue === undefined ? conditionMet(value, comparator, threshold) : crossed(state.lastValue, value, comparator, threshold)) {
			return { action: 'missed', state: { ...state, status: 'missed', lastValue: value, lastObservedAtMs: nowMs }, reason: 'Trigger may have crossed while the source was stale' };
		}
		return { action: 'armed', state: { ...state, status: 'armed', lastValue: value, lastObservedAtMs: nowMs, pausedAtMs: undefined } };
	}
	if (state.lastValue === undefined) return { action: 'armed', state: { ...state, status: 'armed', lastValue: value, lastObservedAtMs: nowMs } };
	if (crossed(state.lastValue, value, comparator, threshold)) return { action: 'fired', state: { ...state, status: 'fired', lastValue: value, lastObservedAtMs: nowMs } };
	return { action: 'pending', state: { ...state, status: 'armed', lastValue: value, lastObservedAtMs: nowMs } };
}

function evaluateCandle(
	trigger: Extract<ConditionalTrigger, { type: 'candleClose' | 'candleVolume' }>,
	state: ConditionalTriggerState,
	observation: ConditionalTriggerObservation
): ConditionalTriggerDecision {
	const candle = observation.candle;
	if (!candle || candle.marketKey !== trigger.marketKey || candle.interval !== trigger.interval || !candle.complete) return invalid(state, 'A matching completed candle is required');
	const value = trigger.type === 'candleClose' ? candle.close : candle.volume;
	if (!validPositive(value) || !validPositive(trigger.threshold) || !Number.isFinite(candle.closedAtMs)) return invalid(state, 'Candle trigger values are invalid');
	if (state.status === 'fired' || state.status === 'missed') return { action: state.status, state };
	if (!candle.live) return { action: 'paused', state: pauseConditionalTrigger({ ...state, lastCandleCloseMs: candle.closedAtMs }, observation.nowMs), reason: 'Candle source is stale' };
	if (state.status === 'paused') {
		return { action: 'armed', state: { ...state, status: 'armed', lastCandleCloseMs: candle.closedAtMs, lastObservedAtMs: observation.nowMs, pausedAtMs: undefined } };
	}
	if (state.lastCandleCloseMs === undefined) return { action: 'armed', state: { ...state, status: 'armed', lastCandleCloseMs: candle.closedAtMs, lastObservedAtMs: observation.nowMs } };
	if (candle.closedAtMs <= state.lastCandleCloseMs) return { action: 'pending', state };
	if (conditionMet(value, trigger.comparator, trigger.threshold)) return { action: 'fired', state: { ...state, status: 'fired', lastCandleCloseMs: candle.closedAtMs, lastObservedAtMs: observation.nowMs } };
	return { action: 'pending', state: { ...state, status: 'armed', lastCandleCloseMs: candle.closedAtMs, lastObservedAtMs: observation.nowMs } };
}

function evaluateTime(trigger: Extract<ConditionalTrigger, { type: 'time' }>, state: ConditionalTriggerState, observation: ConditionalTriggerObservation): ConditionalTriggerDecision {
	if (!Number.isFinite(trigger.fireAtMs) || !Number.isFinite(observation.nowMs)) return invalid(state, 'Time trigger values are invalid');
	if (state.status === 'fired' || state.status === 'missed') return { action: state.status, state };
	if (observation.clockLive === false) return { action: 'paused', state: pauseConditionalTrigger(state, observation.nowMs), reason: 'Clock source is unavailable' };
	if (state.status === 'new') {
		if (observation.nowMs >= trigger.fireAtMs) return { action: 'missed', state: { ...state, status: 'missed', lastObservedAtMs: observation.nowMs }, reason: 'Time trigger was already due when armed' };
		return { action: 'armed', state: { ...state, status: 'armed', lastObservedAtMs: observation.nowMs } };
	}
	if (state.status === 'paused' && observation.nowMs >= trigger.fireAtMs) return { action: 'missed', state: { ...state, status: 'missed', lastObservedAtMs: observation.nowMs }, reason: 'Time trigger elapsed while the clock was unavailable' };
	if (state.status === 'paused') return { action: 'armed', state: { ...state, status: 'armed', lastObservedAtMs: observation.nowMs, pausedAtMs: undefined } };
	if ((state.lastObservedAtMs ?? observation.nowMs) < trigger.fireAtMs && observation.nowMs >= trigger.fireAtMs) return { action: 'fired', state: { ...state, status: 'fired', lastObservedAtMs: observation.nowMs } };
	return { action: 'pending', state: { ...state, status: 'armed', lastObservedAtMs: observation.nowMs } };
}

export function evaluateConditionalTrigger(
	trigger: ConditionalTrigger,
	state: ConditionalTriggerState | undefined,
	observation: ConditionalTriggerObservation
): ConditionalTriggerDecision {
	const current = state ?? fresh();
	if (!Number.isFinite(observation.nowMs)) return invalid(current, 'Observation time is invalid');
	if (trigger.type === 'priceCross') {
		const price = observation.price;
		if (!price || price.marketKey !== trigger.marketKey) return invalid(current, 'A matching live price is required');
		return evaluateCross(current, observation.nowMs, price.value, price.live, trigger.comparator, trigger.threshold);
	}
	if (trigger.type === 'candleClose' || trigger.type === 'candleVolume') return evaluateCandle(trigger, current, observation);
	if (trigger.type === 'time') return evaluateTime(trigger, current, observation);
	const pair = observation.pair;
	if (!pair || pair.leftMarketKey !== trigger.leftMarketKey || pair.rightMarketKey !== trigger.rightMarketKey) return invalid(current, 'An exact matching market pair is required');
	if (!validPositive(pair.leftValue) || !validPositive(pair.rightValue)) return invalid(current, 'Synthetic pair values are invalid');
	const value = trigger.operation === 'ratio' ? pair.leftValue / pair.rightValue : pair.leftValue - pair.rightValue;
	return evaluateCross(current, observation.nowMs, value, pair.leftLive && pair.rightLive, trigger.comparator, trigger.threshold, trigger.operation === 'spread');
}
