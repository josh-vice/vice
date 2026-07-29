export interface FeedFrameReadySample {
	receivedAt: number;
	frameReadyAt: number;
	latencyMs: number;
}

export interface FeedStoreSample {
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
const pendingStoreReceives: number[] = [];
const pendingPaintReceives: number[] = [];
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

function recordFrameReady(receivedAt: number, frameReadyAt: number): void {
	samples.push({ receivedAt, frameReadyAt, latencyMs: frameReadyAt - receivedAt });
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

export function markFeedReceive(receivedAt = performance.now()): void {
	if (!Number.isFinite(receivedAt)) return;
	pendingStoreReceives.push(receivedAt);
	if (pendingStoreReceives.length > MAX_SAMPLES) pendingStoreReceives.shift();
	runtimeHealth.maxStoreQueueDepth = Math.max(runtimeHealth.maxStoreQueueDepth, pendingStoreReceives.length);
}

/** Mark the point at which a market event has committed to its Svelte store. */
export function markStoreCommit(): void {
	const receivedAt = pendingStoreReceives.shift();
	if (receivedAt === undefined) return;
	const storedAt = performance.now();
	storeSamples.push({ receivedAt, storedAt, latencyMs: storedAt - receivedAt });
	if (storeSamples.length > MAX_SAMPLES) storeSamples.shift();
	pendingPaintReceives.push(receivedAt);
	if (pendingPaintReceives.length > MAX_SAMPLES) pendingPaintReceives.shift();
	runtimeHealth.maxFrameReadyQueueDepth = Math.max(runtimeHealth.maxFrameReadyQueueDepth, pendingPaintReceives.length);
	scheduleFrameReady();
}

/**
 * The next animation-frame callback means the UI is ready for that frame; it
 * does not prove compositor presentation. Keep this separate from any future
 * paint-timing source.
 */
export function markUiFrameReady(frameReadyAt = performance.now()): void {
	if (pendingPaintReceives.length === 0) return;
	if (!Number.isFinite(frameReadyAt)) return;
	if (lastFrameReadyAt !== undefined) {
		const interval = frameReadyAt - lastFrameReadyAt;
		if (Number.isFinite(interval) && interval >= 0) {
			runtimeHealth.maxFrameIntervalMs = Math.max(runtimeHealth.maxFrameIntervalMs, interval);
			runtimeHealth.inferredDroppedFrameCount += Math.max(0, Math.floor(interval / 16.667) - 1);
		}
	}
	lastFrameReadyAt = frameReadyAt;
	while (pendingPaintReceives.length > 0) {
		const receivedAt = pendingPaintReceives.shift();
		if (receivedAt !== undefined) recordFrameReady(receivedAt, frameReadyAt);
	}
}

export function latencySnapshot(): { count: number; p50: number; p99: number; max: number; storeCount: number; storeP50: number; storeP99: number; storeMax: number } {
	if (samples.length === 0 && storeSamples.length === 0) return { count: 0, p50: 0, p99: 0, max: 0, storeCount: 0, storeP50: 0, storeP99: 0, storeMax: 0 };
	const values = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
	const storeValues = storeSamples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
	return {
		count: values.length,
		p50: values[Math.floor(values.length * 0.5)] ?? 0,
		p99: values[Math.min(values.length - 1, Math.floor(values.length * 0.99))] ?? 0,
		max: values[values.length - 1] ?? 0,
		storeCount: storeValues.length,
		storeP50: storeValues[Math.floor(storeValues.length * 0.5)] ?? 0,
		storeP99: storeValues[Math.min(storeValues.length - 1, Math.floor(storeValues.length * 0.99))] ?? 0,
		storeMax: storeValues[storeValues.length - 1] ?? 0
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
	pendingStoreReceives.length = 0;
	pendingPaintReceives.length = 0;
	frameReadyScheduled = false;
	lastFrameReadyAt = undefined;
	for (const key of Object.keys(runtimeHealth) as Array<keyof typeof runtimeHealth>) runtimeHealth[key] = 0;
}
