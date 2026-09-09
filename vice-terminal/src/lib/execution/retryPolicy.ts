import { parseVenueError } from './venueErrors';

export async function withOneTransportRetry<T>(
	operation: () => Promise<T>,
	waitMs = 25,
	sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<T> {
	try {
		return await operation();
	} catch (firstError) {
		// The Hyperliquid SDK throws for explicit venue rejections as well as
		// transport failures. Never resend a known-invalid mutation (for example
		// a price outside the venue oracle bounds), but keep retryable transport
		// failures such as a bounded 429 retryable with the same operation ID.
		const semanticError = parseVenueError(firstError);
		if (semanticError.code !== 'unknown' && !semanticError.retryable) throw firstError;
		if (waitMs > 0) await sleep(waitMs);
		try {
			return await operation();
		} catch (secondError) {
			// The second response is authoritative for the retried operation. In
			// particular, do not hide a definitive venue rejection behind the
			// original transport/rate-limit error.
			throw secondError;
		}
	}
}
