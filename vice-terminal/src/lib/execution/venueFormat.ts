import type { MarketDescriptor } from '$lib/types';
import { formatChartPrice, normalizeChartPrice } from '$lib/chart/priceNormalization';

function trimDecimal(value: string): string {
	return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
}

export function formatVenueSize(size: number, market: MarketDescriptor): string {
	if (!Number.isFinite(size) || size <= 0) throw new Error('Order size must be positive');
	const formatted = trimDecimal(size.toFixed(market.szDecimals));
	if (Number(formatted) <= 0) throw new Error(`Order size is below ${market.symbol} precision`);
	return formatted;
}

export function formatVenuePrice(price: number, market: MarketDescriptor): string {
	const normalized = normalizeChartPrice(price, market);
	if (normalized === null) throw new Error('Order price must be positive');
	const formatted = trimDecimal(formatChartPrice(normalized, market));
	if (Number(formatted) <= 0) throw new Error(`Order price is below ${market.symbol} precision`);
	return formatted;
}
