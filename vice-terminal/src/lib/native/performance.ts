export interface FeedKey {
	feed: string;
	sequence: number;
}

export interface FeedFrameReadySample extends FeedKey {
	receivedAt: number;
	storedAt: number;
	frameReadyAt: number;
	/** Source receipt to UI frame-ready latency. */
	latencyMs: number;
	/** Svelte-store commit to UI frame-ready latency. */
	storeToFrameReadyMs: number;

}

export interface FeedStoreSample extends FeedKey {
	receivedAt: number;
	storedAt: number;
	latencyMs: number;
}

export interface RuntimeHealthSnapshot {
	longTaskCount: number;
	longTaskMaxMs: number;
	longAnimationFrameCount: number;
	longAnimationFrameMaxMs: number;
	eventDelayCount: number;
	eventDelayMaxMs: number;
	inferredDroppedFrameCount: number;
	maxFrameIntervalMs: number;
	reconnectCount: number;
	maxStoreQueueDepth: number;
	maxFrameReadyQueueDepth: number;
	/** Chromium-only current heap value; omitted where the browser does not expose it. */
	usedJsHeapBytes?: number;
}

const MAX_SAMPLES = 1024;
const samples: FeedFrameReadySample[] = [];
const storeSamples: FeedStoreSample[] = [];
const pendingStoreReceives = new Map<string, { key: FeedKey; receivedAt: number }>();
const pendingPaintReceives = new Map<string, { key: FeedKey; receivedAt: number; storedAt: number }>();
let frameReadyScheduled = false;
let lastFrameReadyAt: number | undefined;
let runtimeObserverStop: (() => void) | undefined;
const runtimeHealth: Omit<RuntimeHealthSnapshot, 'usedJsHeapBytes'> = {
	longTaskCount: 0,
	longTaskMaxMs: 0,
	longAnimationFrameCount: 0,
	longAnimationFrameMaxMs: 0,
	eventDelayCount: 0,
	eventDelayMaxMs: 0,
	inferredDroppedFrameCount: 0,
	maxFrameIntervalMs: 0,
	reconnectCount: 0,
	maxStoreQueueDepth: 0,
	maxFrameReadyQueueDepth: 0
};

function feedKey(feed: string, sequence: number): FeedKey | null {
	if (!feed || !Number.isSafeInteger(sequence) || sequence < 0) return null;
	return { feed, sequence };
}

function feedKeyId(key: FeedKey): string {
	return `${key.feed}\u0000${key.sequence}`;
}

function recordFrameReady(key: FeedKey, receivedAt: number, storedAt: number, frameReadyAt: number): void {
	const latencyMs = Math.max(0, frameReadyAt - receivedAt);
	const storeToFrameReadyMs = Math.max(0, frameReadyAt - storedAt);
	samples.push({ ...key, receivedAt, storedAt, frameReadyAt, latencyMs, storeToFrameReadyMs });
	if (samples.length > MAX_SAMPLES) samples.shift();
}

function scheduleFrameReady(): void {
	if (frameReadyScheduled) return;
	if (typeof requestAnimationFrame !== 'function') return;
	frameReadyScheduled = true;
	requestAnimationFrame(() => {
		frameReadyScheduled = false;
		markUiFrameReady();
	});
}

export function markFeedReceive(feed: string, sequence: number, receivedAt = performance.now()): void {
	const key = feedKey(feed, sequence);
	if (!key || !Number.isFinite(receivedAt)) return;
	const id = feedKeyId(key);
	pendingStoreReceives.set(id, { key, receivedAt });
	while (pendingStoreReceives.size > MAX_SAMPLES) pendingStoreReceives.delete(pendingStoreReceives.keys().next().value!);
	runtimeHealth.maxStoreQueueDepth = Math.max(runtimeHealth.maxStoreQueueDepth, pendingStoreReceives.size);
}

export function dropFeedReceive(feed: string, sequence: number): void {
	const key = feedKey(feed, sequence);
	if (!key) return;
	const id = feedKeyId(key);
	pendingStoreReceives.delete(id);
	pendingPaintReceives.delete(id);
}
/** Mark the point at which a specific market event committed to its Svelte store. */
export function markStoreCommit(feed: string, sequence: number, storedAt = performance.now()): void {
	const key = feedKey(feed, sequence);
	if (!key || !Number.isFinite(storedAt)) return;
	const id = feedKeyId(key);
	const pending = pendingStoreReceives.get(id);
	if (!pending) return;
	pendingStoreReceives.delete(id);
	const latencyMs = Math.max(0, storedAt - pending.receivedAt);
	storeSamples.push({ ...key, receivedAt: pending.receivedAt, storedAt, latencyMs });
	if (storeSamples.length > MAX_SAMPLES) storeSamples.shift();
	pendingPaintReceives.set(feedKeyId(key), { key, receivedAt: pending.receivedAt, storedAt });
	while (pendingPaintReceives.size > MAX_SAMPLES) pendingPaintReceives.delete(pendingPaintReceives.keys().next().value!);
	runtimeHealth.maxFrameReadyQueueDepth = Math.max(runtimeHealth.maxFrameReadyQueueDepth, pendingPaintReceives.size);
	scheduleFrameReady();
}

/**
 * The next animation-frame callback means the UI is ready for that frame; it
 * does not prove compositor presentation. Keep this separate from any future
 * paint-timing source.
 */
export function markUiFrameReady(frameReadyAt = performance.now()): void {
	if (pendingPaintReceives.size === 0) return;
	if (!Number.isFinite(frameReadyAt)) return;
	if (lastFrameReadyAt !== undefined) {
		const interval = frameReadyAt - lastFrameReadyAt;
		if (Number.isFinite(interval) && interval >= 0) {
			runtimeHealth.maxFrameIntervalMs = Math.max(runtimeHealth.maxFrameIntervalMs, interval);
			runtimeHealth.inferredDroppedFrameCount += Math.max(0, Math.floor(interval / 16.667) - 1);
		}
	}
	lastFrameReadyAt = frameReadyAt;
	for (const [id, pending] of pendingPaintReceives) {
		recordFrameReady(pending.key, pending.receivedAt, pending.storedAt, frameReadyAt);
		pendingPaintReceives.delete(id);
	}
}

function percentile(values: number[], fraction: number): number {
	if (values.length === 0) return 0;
	return values[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? 0;
}

export function latencySnapshot(): {
	count: number;
	p50: number;
	p95: number;
	p99: number;
	max: number;
	storeCount: number;
	storeP50: number;
	storeP95: number;
	storeP99: number;
	storeMax: number;
	storeToPaintCount: number;
	storeToPaintP50: number;
	storeToPaintP95: number;
	storeToPaintP99: number;
	storeToPaintMax: number;
} {
	if (samples.length === 0 && storeSamples.length === 0) {
		return {
			count: 0, p50: 0, p95: 0, p99: 0, max: 0,
			storeCount: 0, storeP50: 0, storeP95: 0, storeP99: 0, storeMax: 0,
			storeToPaintCount: 0, storeToPaintP50: 0, storeToPaintP95: 0, storeToPaintP99: 0, storeToPaintMax: 0
		};
	}
	const values = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
	const storeValues = storeSamples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
	const storeToPaintValues = samples.map((sample) => sample.storeToFrameReadyMs).sort((a, b) => a - b);
	return {
		count: values.length,
		p50: percentile(values, 0.5),
		p95: percentile(values, 0.95),
		p99: percentile(values, 0.99),
		max: values.at(-1) ?? 0,
		storeCount: storeValues.length,
		storeP50: percentile(storeValues, 0.5),
		storeP95: percentile(storeValues, 0.95),
		storeP99: percentile(storeValues, 0.99),
		storeMax: storeValues.at(-1) ?? 0,
		storeToPaintCount: storeToPaintValues.length,
		storeToPaintP50: percentile(storeToPaintValues, 0.5),
		storeToPaintP95: percentile(storeToPaintValues, 0.95),
		storeToPaintP99: percentile(storeToPaintValues, 0.99),
		storeToPaintMax: storeToPaintValues.at(-1) ?? 0
	};
}

/** Return copies for the browser-local release evidence exporter. */
export function feedStoreLatencySamples(): number[] {
	return storeSamples.map((sample) => sample.latencyMs);
}

/** Return copies for the browser-local release evidence exporter. */
export function feedFrameReadyLatencySamples(): number[] {
	return samples.map((sample) => sample.latencyMs);
}
export function causalFeedLatencySamples(): Array<{ feed: string; sequence: number; receiptToStoreMs: number; storeToPaintMs: number; feedToFrameReadyMs: number }> {
	const frameByKey = new Map(samples.map((sample) => [feedKeyId(sample), sample]));
	return storeSamples.flatMap((sample) => {
		const frame = frameByKey.get(feedKeyId(sample));
		return frame
			? [{ feed: sample.feed, sequence: sample.sequence, receiptToStoreMs: sample.latencyMs, storeToPaintMs: frame.storeToFrameReadyMs, feedToFrameReadyMs: frame.latencyMs }]
			: [];
	});
}

/** Count an actual reconnect attempt without retaining venue, account, or market data. */
export function markFeedReconnect(): void {
	runtimeHealth.reconnectCount += 1;
}

/** Feed browser PerformanceObserver entries into privacy-safe aggregate health. */
export function recordRuntimePerformanceEntry(kind: 'longtask' | 'long-animation-frame' | 'event', duration: number): void {
	if (!Number.isFinite(duration) || duration < 0) return;
	if (kind === 'longtask') {
		runtimeHealth.longTaskCount += 1;
		runtimeHealth.longTaskMaxMs = Math.max(runtimeHealth.longTaskMaxMs, duration);
	} else if (kind === 'long-animation-frame') {
		runtimeHealth.longAnimationFrameCount += 1;
		runtimeHealth.longAnimationFrameMaxMs = Math.max(runtimeHealth.longAnimationFrameMaxMs, duration);
	} else {
		runtimeHealth.eventDelayCount += 1;
		runtimeHealth.eventDelayMaxMs = Math.max(runtimeHealth.eventDelayMaxMs, duration);
	}
}

/** Start browser-native observers; unsupported entry types remain absent, never faked. */
export function startRuntimeHealthTelemetry(): () => void {
	if (runtimeObserverStop) return runtimeObserverStop;
	if (typeof PerformanceObserver === 'undefined') return () => undefined;
	const supported = new Set((PerformanceObserver as typeof PerformanceObserver & { supportedEntryTypes?: string[] }).supportedEntryTypes ?? []);
	const entryTypes = ['longtask', 'long-animation-frame', 'event'].filter((entryType) => supported.has(entryType));
	if (entryTypes.length === 0) return () => undefined;
	const observer = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			if (entry.entryType === 'longtask' || entry.entryType === 'long-animation-frame' || entry.entryType === 'event') {
				const eventDelay = entry.entryType === 'event'
					? Math.max(0, (entry as PerformanceEventTiming).processingStart - entry.startTime)
					: entry.duration;
				recordRuntimePerformanceEntry(entry.entryType, eventDelay);
			}
		}
	});
	observer.observe({ entryTypes });
	const stop = () => {
		observer.disconnect();
		if (runtimeObserverStop === stop) runtimeObserverStop = undefined;
	};
	runtimeObserverStop = stop;
	return stop;
}

/** Return privacy-safe aggregates only; no event, account, market, or order identifiers are retained. */
export function runtimeHealthSnapshot(): RuntimeHealthSnapshot {
	const memory = typeof performance !== 'undefined'
		? (performance as Performance & { memory?: { usedJSHeapSize?: unknown } }).memory?.usedJSHeapSize
		: undefined;
	return {
		...runtimeHealth,
		...(typeof memory === 'number' && Number.isFinite(memory) && memory >= 0 ? { usedJsHeapBytes: memory } : {})
	};
}

export function resetLatencyForTest(): void {
	samples.length = 0;
	storeSamples.length = 0;
	pendingStoreReceives.clear();
	pendingPaintReceives.clear();
	frameReadyScheduled = false;
	lastFrameReadyAt = undefined;
	for (const key of Object.keys(runtimeHealth) as Array<keyof typeof runtimeHealth>) runtimeHealth[key] = 0;
}
