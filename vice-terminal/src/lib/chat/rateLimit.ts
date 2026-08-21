/**
 * Token-bucket rate limiter for chat messages.
 *
 * A strong primitive for spam control: each sender holds a bucket that refills
 * at `refillPerSec` tokens per second up to `capacity`. A message consumes one
 * token; when the bucket is empty the message is rejected until `waitMs()`
 * elapses. This allows short natural bursts (capacity) while capping sustained
 * spam (refill rate).
 */
export class TokenBucketRateLimiter {
	private buckets = new Map<string, { tokens: number; updatedAt: number }>();

	constructor(
		private readonly capacity = 5,
		private readonly refillPerSec = 1 / 2, // 1 token per 2s = 30 msg/min sustained
		private readonly clock: () => number = Date.now
	) {}

	/** Consume one token for `key`. Returns {ok:true} or {ok:false, retryAfterMs}. */
	take(key: string): { ok: true; retryAfterMs: 0 } | { ok: false; retryAfterMs: number } {
		const now = this.clock();
		const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
		// Refill proportionally to elapsed time since the last update.
		const elapsedSec = Math.max(0, (now - bucket.updatedAt) / 1000);
		bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSec);
		bucket.updatedAt = now;
		if (bucket.tokens >= 1) {
			bucket.tokens -= 1;
			this.buckets.set(key, bucket);
			return { ok: true, retryAfterMs: 0 };
		}
		this.buckets.set(key, bucket);
		const retryAfterMs = Math.max(1, Math.ceil((1 - bucket.tokens) / this.refillPerSec * 1000));
		return { ok: false, retryAfterMs };
	}

	/** Reset a sender (e.g. after a ban is lifted or for tests). */
	clear(key: string): void {
		this.buckets.delete(key);
	}

	/** Clear all buckets (session reset). */
	clearAll(): void {
		this.buckets.clear();
	}
}
