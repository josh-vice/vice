export async function withOneTransportRetry<T>(
	operation: () => Promise<T>,
	waitMs = 25,
	sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<T> {
	try {
		return await operation();
	} catch (firstError) {
		if (waitMs > 0) await sleep(waitMs);
		try {
			return await operation();
		} catch {
			throw firstError;
		}
	}
}
