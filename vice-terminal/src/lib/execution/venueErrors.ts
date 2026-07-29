export type VenueErrorCode =
	| 'insufficient_margin'
	| 'invalid_price'
	| 'invalid_size'
	| 'post_only_cross'
	| 'reduce_only'
	| 'rate_limited'
	| 'unauthorized'
	| 'builder_rejected'
	| 'network'
	| 'unknown';

export interface SemanticVenueError {
	code: VenueErrorCode;
	message: string;
	retryable: boolean;
}

export function parseVenueError(input: unknown): SemanticVenueError {
	const raw = input instanceof Error ? input.message : String(input ?? 'Unknown Hyperliquid error');
	const value = raw.toLowerCase();
	if (value.includes('margin') || value.includes('not enough') || value.includes('insufficient')) {
		return { code: 'insufficient_margin', message: 'Insufficient available margin for this order.', retryable: false };
	}
	if (value.includes('price') || value.includes('tick') || value.includes('px')) {
		return { code: 'invalid_price', message: 'Price does not match Hyperliquid venue precision or bounds.', retryable: false };
	}
	if (value.includes('size') || value.includes('sz') || value.includes('minimum')) {
		return { code: 'invalid_size', message: 'Size does not match Hyperliquid minimum or precision.', retryable: false };
	}
	if (value.includes('post only') || value.includes('post-only') || value.includes('would cross')) {
		return { code: 'post_only_cross', message: 'Post-only order would cross the book.', retryable: false };
	}
	if (value.includes('reduce only') || value.includes('reduce-only')) {
		return { code: 'reduce_only', message: 'Reduce-only order is not valid for the current position.', retryable: false };
	}
	if (value.includes('rate limit') || value.includes('too many') || value.includes('429')) {
		return { code: 'rate_limited', message: 'Hyperliquid rate limit reached; retry after backoff.', retryable: true };
	}
	if (value.includes('builder') || value.includes('fee approval')) {
		return { code: 'builder_rejected', message: 'Builder fee approval or attribution was rejected; trading can continue without it.', retryable: false };
	}
	if (value.includes('unauthorized') || value.includes('signature') || value.includes('agent')) {
		return { code: 'unauthorized', message: 'The local trading agent is not authorized for this account.', retryable: false };
	}
	if (value.includes('network') || value.includes('fetch') || value.includes('timeout') || value.includes('socket')) {
		return { code: 'network', message: 'Hyperliquid transport failed; the outcome must be reconciled before retrying.', retryable: true };
	}
	return { code: 'unknown', message: raw, retryable: false };
}
