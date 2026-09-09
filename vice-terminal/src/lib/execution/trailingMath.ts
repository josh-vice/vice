export function trailingTrigger(side: 'buy' | 'sell', extreme: number, offset: number, tick: number): number {
	if (!Number.isFinite(extreme) || !Number.isFinite(offset) || offset <= 0 || !Number.isFinite(tick) || tick <= 0) {
		throw new Error('Invalid trailing-stop parameters');
	}
	const raw = side === 'sell' ? extreme - offset : extreme + offset;
	return Math.round(raw / tick) * tick;
}

export function nextTrailingExtreme(side: 'buy' | 'sell', previous: number, mark: number): number {
	return side === 'sell' ? Math.max(previous, mark) : Math.min(previous, mark);
}
