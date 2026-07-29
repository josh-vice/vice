import { writable } from 'svelte/store';

export type AutomationTriggerSource = 'priceCross' | 'candleClose' | 'candleVolume' | 'time' | 'syntheticPair';
export type AutomationTriggerOutcome = 'fired' | 'paused' | 'missed';

export type AutomationTriggerTelemetry = {
	schemaVersion: 1;
	runtime: 'browser';
	persistenceClass: 'deviceLocal';
	updatedAt: number;
	counts: Record<AutomationTriggerSource, Record<AutomationTriggerOutcome, number>>;
};

const STORAGE_KEY = 'vice.automation-trigger-telemetry.v1';
const MAX_COUNT = 1_000_000;
const sources: AutomationTriggerSource[] = ['priceCross', 'candleClose', 'candleVolume', 'time', 'syntheticPair'];
const outcomes: AutomationTriggerOutcome[] = ['fired', 'paused', 'missed'];

function emptyCounts(): AutomationTriggerTelemetry['counts'] {
	return Object.fromEntries(sources.map((source) => [source, Object.fromEntries(outcomes.map((outcome) => [outcome, 0]))])) as AutomationTriggerTelemetry['counts'];
}

function emptyTelemetry(): AutomationTriggerTelemetry {
	return { schemaVersion: 1, runtime: 'browser', persistenceClass: 'deviceLocal', updatedAt: 0, counts: emptyCounts() };
}

function validCount(value: unknown): number {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_COUNT ? value : 0;
}

function readTelemetry(): AutomationTriggerTelemetry {
	if (typeof localStorage === 'undefined') return emptyTelemetry();
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
		if (parsed?.schemaVersion !== 1 || parsed.runtime !== 'browser' || parsed.persistenceClass !== 'deviceLocal') return emptyTelemetry();
		const counts = emptyCounts();
		for (const source of sources) for (const outcome of outcomes) counts[source][outcome] = validCount(parsed?.counts?.[source]?.[outcome]);
		return { schemaVersion: 1, runtime: 'browser', persistenceClass: 'deviceLocal', updatedAt: validCount(parsed.updatedAt), counts };
	} catch {
		return emptyTelemetry();
	}
}

function persist(value: AutomationTriggerTelemetry): void {
	if (typeof localStorage === 'undefined') return;
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* telemetry must never block a safety decision */ }
}

export const automationTriggerTelemetry = writable<AutomationTriggerTelemetry>(readTelemetry());

/** Records no account, market, price, strategy, or order data. */
export function recordAutomationTriggerOutcome(source: AutomationTriggerSource, outcome: AutomationTriggerOutcome, now = Date.now()): void {
	automationTriggerTelemetry.update((current) => {
		const next: AutomationTriggerTelemetry = {
			...current,
			updatedAt: Number.isFinite(now) && now >= 0 ? Math.floor(now) : current.updatedAt,
			counts: { ...current.counts, [source]: { ...current.counts[source], [outcome]: Math.min(MAX_COUNT, current.counts[source][outcome] + 1) } }
		};
		persist(next);
		return next;
	});
}

export function resetAutomationTriggerTelemetryForTest(): void {
	automationTriggerTelemetry.set(emptyTelemetry());
}
