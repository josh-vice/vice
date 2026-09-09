export type HlCandleInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

const TIMEFRAME_MAP: Record<string, HlCandleInterval> = {
	'1m': '1m',
	'5m': '5m',
	'15m': '15m',
	'1h': '1h',
	'4h': '4h',
	'1D': '1d',
	'1d': '1d',
	'1W': '1w',
	'1w': '1w'
};

export function toHlInterval(tf: string): HlCandleInterval {
	return TIMEFRAME_MAP[tf] ?? '1h';
}
