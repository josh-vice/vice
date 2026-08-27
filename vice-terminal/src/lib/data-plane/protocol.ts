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
	| { type: 'allMids'; network: HyperliquidNetwork; epoch: number; sequence: number; receivedAtMs: number; receivedAtMonoMs: number; mids: Record<string, string> }
	| { type: 'trades'; network: HyperliquidNetwork; epoch: number; sequence: number; receivedAtMs: number; receivedAtMonoMs: number; coin: string; trades: PublicPlaneTrade[] }
	| { type: 'candle'; network: HyperliquidNetwork; epoch: number; sequence: number; receivedAtMs: number; receivedAtMonoMs: number; coin: string; interval: string; candle: PublicPlaneCandle }
	| { type: 'status'; network: HyperliquidNetwork; epoch: number; status: 'connecting' | 'open' | 'closed' | 'error'; reason?: string };

export function hyperliquidWsUrl(network: HyperliquidNetwork): string {
	return network === 'mainnet' ? 'wss://api.hyperliquid.xyz/ws' : 'wss://api.hyperliquid-testnet.xyz/ws';
}

export function isPublicPlaneEvent(value: unknown): value is PublicPlaneEvent {
	if (!value || typeof value !== 'object' || !('type' in value)) return false;
	const event = value as {
		type?: unknown;
		network?: unknown;
		epoch?: unknown;
		sequence?: unknown;
		receivedAtMs?: unknown;
		receivedAtMonoMs?: unknown;
		mids?: unknown;
		coin?: unknown;
		interval?: unknown;
		trades?: unknown;
		candle?: unknown;
		status?: unknown;
		reason?: unknown;
		receivedAt?: unknown;
	};
	if (!['allMids', 'trades', 'candle', 'status'].includes(event.type as string) ||
		!Number.isSafeInteger(event.epoch) || (event.epoch as number) < 0 ||
		(event.network !== 'testnet' && event.network !== 'mainnet') ||
		'receivedAt' in event) return false;
	if (event.type === 'status') {
		return ['connecting', 'open', 'closed', 'error'].includes(event.status as string) &&
			!('receivedAtMs' in event) && !('receivedAtMonoMs' in event);
	}
	if (!Number.isSafeInteger(event.sequence) || (event.sequence as number) < 0 ||
		!Number.isFinite(event.receivedAtMs) || (event.receivedAtMs as number) < 0 ||
		!Number.isFinite(event.receivedAtMonoMs) || (event.receivedAtMonoMs as number) < 0) return false;
	if (event.type === 'allMids') {
		return Boolean(event.mids) && typeof event.mids === 'object' && !Array.isArray(event.mids);
	}
	if (event.type === 'trades') return typeof event.coin === 'string' && Boolean(event.coin) && Array.isArray(event.trades);
	if (typeof event.coin !== 'string' || !event.coin || typeof event.interval !== 'string' || !event.interval ||
		!event.candle || typeof event.candle !== 'object' || Array.isArray(event.candle)) return false;
	const candle = event.candle as Record<string, unknown>;
	return ['time', 'open', 'high', 'low', 'close', 'volume'].every((key) => typeof candle[key] === 'number' && Number.isFinite(candle[key]));
}
