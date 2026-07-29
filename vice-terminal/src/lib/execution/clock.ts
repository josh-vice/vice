/**
 * Monotonic microsecond clock for local execution measurements.
 *
 * Wall-clock time is unsuitable for sub-millisecond SLOs because Date.now()
 * is coarse and can jump when the system clock is corrected. The fallback is
 * retained for non-browser runtimes that do not expose performance.now().
 */
export function monotonicNowUs(): number {
	if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
		return performance.now() * 1_000;
	}
	return Date.now() * 1_000;
}
