import type { HyperliquidNetwork } from '$lib/hl/networkPolicy';

export type PublicPlaneRequest =
	| { type: 'connect'; network: HyperliquidNetwork }
	| { type: 'setTrades'; coin?: string }
	| { type: 'setCandle'; coin?: string; interval?: string }
	| { type: 'disconnect' };

/** The worker keeps only display-safe trade fields on the UI message path. */
export type PublicPlaneTrade = {
	id: string;
	price: number;
	size: number;
	side: 'buy' | 'sell';
	timestamp: number;
};

export type PublicPlaneCandle = {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
};

export type PublicPlaneEvent =
	| { type: 'allMids'; network: HyperliquidNetwork; epoch: number; receivedAt: number; mids: Record<string, string> }
	| { type: 'trades'; network: HyperliquidNetwork; epoch: number; receivedAt: number; coin: string; trades: PublicPlaneTrade[] }
	| { type: 'candle'; network: HyperliquidNetwork; epoch: number; receivedAt: number; coin: string; interval: string; candle: PublicPlaneCandle }
	| { type: 'status'; network: HyperliquidNetwork; epoch: number; status: 'connecting' | 'open' | 'closed' | 'error'; reason?: string };

export function hyperliquidWsUrl(network: HyperliquidNetwork): string {
	return network === 'mainnet' ? 'wss://api.hyperliquid.xyz/ws' : 'wss://api.hyperliquid-testnet.xyz/ws';
}

export function isPublicPlaneEvent(value: unknown): value is PublicPlaneEvent {
	if (!value || typeof value !== 'object' || !('type' in value)) return false;
	const event = value as { type?: unknown; epoch?: unknown; network?: unknown; receivedAt?: unknown; coin?: unknown; interval?: unknown; trades?: unknown; candle?: unknown };
	if (!['allMids', 'trades', 'candle', 'status'].includes(event.type as string) || typeof event.epoch !== 'number' ||
		(event.network !== 'testnet' && event.network !== 'mainnet')) return false;
	if (event.type === 'trades') return typeof event.receivedAt === 'number' && typeof event.coin === 'string' && Array.isArray(event.trades);
	if (event.type === 'candle') {
		if (typeof event.receivedAt !== 'number' || typeof event.coin !== 'string' || typeof event.interval !== 'string' || !event.candle || typeof event.candle !== 'object') return false;
		const candle = event.candle as Record<string, unknown>;
		return ['time', 'open', 'high', 'low', 'close', 'volume'].every((key) => typeof candle[key] === 'number' && Number.isFinite(candle[key]));
	}
	return true;
}
