export function buildSwarmPrices(side: 'buy' | 'sell', center: number, spreadPct: number, count: number): number[] {
	if (!Number.isFinite(center) || center <= 0) throw new Error('Swarm center price must be positive');
	if (!Number.isFinite(spreadPct) || spreadPct <= 0 || spreadPct >= 100) throw new Error('Swarm spread must be between 0 and 100 percent');
	if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('Swarm order count must be between 1 and 100');
	const spread = spreadPct / 100;
	return Array.from({ length: count }, (_, index) => {
		const t = count === 1 ? 0.5 : index / (count - 1);
		return side === 'buy' ? center * (1 - spread + t * spread) : center * (1 + t * spread);
	});
}
