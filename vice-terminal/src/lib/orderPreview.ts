import type { OrderBook, OrderSide, OrderType, Position } from '$lib/types';

export type OrderPreviewStatus = 'not-applicable' | 'unavailable' | 'resting' | 'estimated' | 'insufficient' | 'post-only-crossing';
export type ReduceOnlyPreviewStatus = 'disabled' | 'unavailable' | 'no-position' | 'reduces' | 'capped';

export type OrderPreviewInput = {
	book: OrderBook;
	side: OrderSide;
	orderType: OrderType;
	size: number;
	limitPrice?: number | null;
	postOnly: boolean;
	reduceOnly: boolean;
	accountLive: boolean;
	position?: Pick<Position, 'side' | 'size'>;
	feeRateBps?: number;
};

export type OrderPreview = {
	status: OrderPreviewStatus;
	requestedSize: number;
	effectiveSize: number;
	displayedDepthSize: number;
	filledSize: number;
	unfilledSize: number;
	bestPrice?: number;
	averageFillPrice?: number;
	slippageBps?: number;
	estimatedNotional?: number;
	estimatedFee: number | null;
	feeRateBps?: number;
	reduceOnly: {
		status: ReduceOnlyPreviewStatus;
		requestedSize: number;
		effectiveSize: number;
		message: string;
	};
};

const BOOK_ORDER_TYPES = new Set<OrderType>(['market', 'limit']);

function nonNegative(value: number | null | undefined): number {
	return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function levelsForSide(book: OrderBook, side: OrderSide): Array<{ price: number; size: number }> {
	const levels = side === 'buy' ? book.asks : book.bids;
	return levels
		.filter((level) => Number.isFinite(level.price) && level.price > 0 && Number.isFinite(level.size) && level.size > 0)
		.map((level) => ({ price: level.price, size: level.size }))
		.sort((left, right) => (side === 'buy' ? left.price - right.price : right.price - left.price));
}

function reduceOnlySizing(input: OrderPreviewInput, requestedSize: number): OrderPreview['reduceOnly'] {
	if (!input.reduceOnly) {
		return { status: 'disabled', requestedSize, effectiveSize: requestedSize, message: 'Reduce-only is off' };
	}
	if (!input.accountLive) {
		return { status: 'unavailable', requestedSize, effectiveSize: 0, message: 'Position unavailable until account sync is live' };
	}
	const position = input.position;
	const reducesPosition = position && position.size > 0 && (position.side === 'long' ? input.side === 'sell' : input.side === 'buy');
	if (!reducesPosition) {
		return { status: 'no-position', requestedSize, effectiveSize: 0, message: 'No opposite-side position to reduce' };
	}
	const effectiveSize = Math.min(requestedSize, nonNegative(position.size));
	if (effectiveSize < requestedSize) {
		return { status: 'capped', requestedSize, effectiveSize, message: `Capped at ${effectiveSize} to current position` };
	}
	return { status: 'reduces', requestedSize, effectiveSize, message: 'Will reduce the matched position only' };
}

function basePreview(requestedSize: number, reduceOnly: OrderPreview['reduceOnly']): OrderPreview {
	return {
		status: 'not-applicable',
		requestedSize,
		effectiveSize: reduceOnly.effectiveSize,
		displayedDepthSize: 0,
		filledSize: 0,
		unfilledSize: reduceOnly.effectiveSize,
		estimatedFee: null,
		reduceOnly
	};
}

/**
 * Estimate immediate execution against the latest displayed book.
 * This is advisory UI state only; the execution boundary revalidates all values
 * and the fee estimate is null unless an explicit venue fee rate is supplied.
 */
export function estimateOrderPreview(input: OrderPreviewInput): OrderPreview {
	const requestedSize = nonNegative(input.size);
	const reduceOnly = reduceOnlySizing(input, requestedSize);
	const preview = basePreview(requestedSize, reduceOnly);
	if (!BOOK_ORDER_TYPES.has(input.orderType)) return preview;
	if (reduceOnly.status === 'unavailable') return { ...preview, status: 'unavailable' };
	if (requestedSize <= 0 || reduceOnly.effectiveSize <= 0) {
		return { ...preview, status: requestedSize <= 0 ? 'unavailable' : 'insufficient' };
	}

	const levels = levelsForSide(input.book, input.side);
	if (levels.length === 0) return { ...preview, status: 'unavailable' };
	const bestPrice = levels[0].price;
	const limitPrice = input.limitPrice;
	const isValidLimit = input.orderType !== 'limit' || (Number.isFinite(limitPrice) && (limitPrice as number) > 0);
	if (!isValidLimit) return { ...preview, status: 'unavailable', bestPrice };
	const crosses = input.orderType === 'market' || (input.side === 'buy' ? (limitPrice as number) >= bestPrice : (limitPrice as number) <= bestPrice);
	if (!crosses) {
		return { ...preview, status: 'resting', bestPrice };
	}
	const eligibleLevels = input.orderType === 'market'
		? levels
		: levels.filter((level) => input.side === 'buy' ? level.price <= (limitPrice as number) : level.price >= (limitPrice as number));
	const displayedDepthSize = eligibleLevels.reduce((total, level) => total + level.size, 0);
	if (input.orderType === 'limit' && input.postOnly) {
		return { ...preview, status: 'post-only-crossing', bestPrice, displayedDepthSize };
	}

	let remaining = reduceOnly.effectiveSize;
	let filledSize = 0;
	let notional = 0;
	for (const level of eligibleLevels) {
		if (remaining <= 0) break;
		const fillSize = Math.min(remaining, level.size);
		filledSize += fillSize;
		notional += fillSize * level.price;
		remaining -= fillSize;
	}
	const averageFillPrice = filledSize > 0 ? notional / filledSize : undefined;
	const slippageBps = averageFillPrice === undefined
		? undefined
		: Math.abs((averageFillPrice - bestPrice) / bestPrice) * 10_000;
	const estimatedFee = Number.isFinite(input.feeRateBps) && (input.feeRateBps as number) >= 0
		? notional * (input.feeRateBps as number) / 10_000
		: null;
	return {
		...preview,
		status: filledSize >= reduceOnly.effectiveSize ? 'estimated' : 'insufficient',
		displayedDepthSize,
		filledSize,
		unfilledSize: Math.max(0, reduceOnly.effectiveSize - filledSize),
		bestPrice,
		averageFillPrice,
		slippageBps,
		estimatedNotional: notional,
		estimatedFee,
		...(estimatedFee === null ? {} : { feeRateBps: input.feeRateBps })
	};
}
