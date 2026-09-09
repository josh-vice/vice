export function resolveClickPlacementSide(
	mode: 'auto' | 'buy' | 'sell',
	price: number,
	marketPrice: number
): 'buy' | 'sell' {
	if (mode !== 'auto') return mode;
	return price < marketPrice ? 'buy' : 'sell';
}

export function wouldCrossSpread(
	side: 'buy' | 'sell',
	price: number,
	bestBid?: number,
	bestAsk?: number
): boolean {
	return side === 'buy'
		? bestAsk !== undefined && price >= bestAsk
		: bestBid !== undefined && price <= bestBid;
}

export function riskBasedSize(input: {
	equity: number;
	riskPercent: number;
	entry: number;
	stop: number;
	marginFree: number;
	leverage: number;
	szDecimals: number;
}): number {
	const distance = Math.abs(input.entry - input.stop);
	if (distance <= 0 || input.entry <= 0) return 0;
	const riskSize = (input.equity * (input.riskPercent / 100)) / distance;
	const marginSize = (input.marginFree * input.leverage) / input.entry;
	const scale = 10 ** input.szDecimals;
	return Math.max(0, Math.floor(Math.min(riskSize, marginSize) * scale) / scale);
}
