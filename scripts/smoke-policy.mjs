/** Retry transient venue or proxy failures, never deterministic client errors. */
export function shouldRetrySmokeStatus(status) {
	return status === 429 || (status >= 500 && status <= 599);
}
