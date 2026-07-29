/** Official Nado public subscription roots. This module has no signer or UI route. */
export const NADO_MAINNET_PUBLIC_WS = 'wss://gateway.prod.nado.xyz/v1/subscribe';
export const NADO_TESTNET_PUBLIC_WS = 'wss://gateway.test.nado.xyz/v1/subscribe';

export type NadoX18Level = readonly [string, string];
export type NadoBookSnapshot = {
	productId: number;
	/** Matching-engine timestamp in nanoseconds from the authoritative snapshot. */
	timestamp: string;
	bids: readonly NadoX18Level[];
	asks: readonly NadoX18Level[];
};

export type NadoBookState = {
	productId: number;
	/** Last accepted matching-engine timestamp; all values remain exact x18 strings. */
	maxTimestamp: string;
	/** The first queued delta may bridge from before the snapshot timestamp. */
	awaitingFirstDelta: boolean;
	bids: Map<string, string>;
	asks: Map<string, string>;
};

export type NadoBookResult =
	| { status: 'applied'; state: NadoBookState }
	| { status: 'ignored' | 'gap' | 'invalid'; state: NadoBookState };

type NadoBookDepthFrame = {
	type?: unknown;
	product_id?: unknown;
	min_timestamp?: unknown;
	max_timestamp?: unknown;
	last_max_timestamp?: unknown;
	bids?: unknown;
	asks?: unknown;
};

const UNSIGNED = /^(?:0|[1-9]\d*)$/;

function timestamp(value: unknown, field: string): string | null {
	if ((typeof value !== 'string' && typeof value !== 'number') || !UNSIGNED.test(String(value))) return null;
	const text = String(value);
	if (BigInt(text) < 0n) return null;
	return text;
}

function positiveProductId(value: number): void {
	if (!Number.isSafeInteger(value) || value < 0) throw new Error('Nado public subscription requires an exact non-negative product id');
}

function levels(value: unknown, allowZero: boolean): Map<string, string> | null {
	if (!Array.isArray(value)) return null;
	const output = new Map<string, string>();
	for (const row of value) {
		if (!Array.isArray(row) || row.length !== 2) return null;
		const price = timestamp(row[0], 'price');
		const quantity = timestamp(row[1], 'quantity');
		if (!price || BigInt(price) === 0n || !quantity || (!allowZero && BigInt(quantity) === 0n)) return null;
		output.set(price, quantity);
	}
	return output;
}

function merge(base: Map<string, string>, changes: Map<string, string>): Map<string, string> {
	const next = new Map(base);
	for (const [price, quantity] of changes) {
		if (BigInt(quantity) === 0n) next.delete(price);
		else next.set(price, quantity);
	}
	return next;
}

/** Construct the unauthenticated exact-product Nado book-depth subscription. */
export function nadoBookDepthSubscribe(productId: number, id = 1): string {
	positiveProductId(productId);
	if (!Number.isSafeInteger(id) || id < 0) throw new Error('Nado public subscription requires a non-negative request id');
	return JSON.stringify({ method: 'subscribe', stream: { type: 'book_depth', product_id: productId }, id });
}

/** Validate an authoritative MarketLiquidity snapshot without converting x18 values to floats. */
export function nadoBookStateFromSnapshot(snapshot: NadoBookSnapshot): NadoBookState {
	positiveProductId(snapshot.productId);
	const snapshotTimestamp = timestamp(snapshot.timestamp, 'snapshot timestamp');
	const bids = levels(snapshot.bids, false);
	const asks = levels(snapshot.asks, false);
	if (!snapshotTimestamp || !bids || !asks) throw new Error('Nado public book snapshot is invalid');
	return { productId: snapshot.productId, maxTimestamp: snapshotTimestamp, awaitingFirstDelta: true, bids, asks };
}

/**
 * Apply a queued Nado book-depth delta after an authoritative snapshot.
 * The first delta must bridge from at or before the snapshot timestamp; every
 * subsequent delta must chain exactly from the prior max timestamp. Gaps and
 * malformed x18 data are never reconstructed or rounded.
 */
export function applyNadoBookDepthFrame(previous: NadoBookState, frame: NadoBookDepthFrame): NadoBookResult {
	if (frame.type !== 'book_depth' || frame.product_id !== previous.productId) return { status: 'invalid', state: previous };
	const minTimestamp = timestamp(frame.min_timestamp, 'min_timestamp');
	const maxTimestamp = timestamp(frame.max_timestamp, 'max_timestamp');
	const lastMaxTimestamp = timestamp(frame.last_max_timestamp, 'last_max_timestamp');
	const bids = levels(frame.bids, true);
	const asks = levels(frame.asks, true);
	if (!minTimestamp || !maxTimestamp || !lastMaxTimestamp || !bids || !asks || BigInt(minTimestamp) > BigInt(maxTimestamp)) {
		return { status: 'invalid', state: previous };
	}
	if (BigInt(maxTimestamp) <= BigInt(previous.maxTimestamp)) return { status: 'ignored', state: previous };
	if (previous.awaitingFirstDelta) {
		// Queued events may have begun before the snapshot. A first event that
		// starts after the snapshot would leave an unknown interval, so fail closed.
		if (BigInt(lastMaxTimestamp) > BigInt(previous.maxTimestamp)) return { status: 'gap', state: previous };
	} else if (lastMaxTimestamp !== previous.maxTimestamp) return { status: 'gap', state: previous };
	return {
		status: 'applied',
		state: { productId: previous.productId, maxTimestamp, awaitingFirstDelta: false, bids: merge(previous.bids, bids), asks: merge(previous.asks, asks) }
	};
}
