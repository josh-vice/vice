import type { Trade } from '$lib/types';

export function publicVolume(trades: Trade[], windowTrades: number): number {
	return trades.slice(0, Math.max(1, Math.min(200, Math.round(windowTrades)))).reduce((sum, trade) => sum + (Number.isFinite(trade.size) ? Math.max(0, trade.size) : 0), 0);
}

export function participationSlice(remainingSize: number, trades: Trade[], participation: number, windowTrades: number): number {
	if (!Number.isFinite(remainingSize) || remainingSize <= 0) return 0;
	const cap = Math.max(0.01, Math.min(1, participation));
	return Math.min(remainingSize, publicVolume(trades, windowTrades) * cap);
}
