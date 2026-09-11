import type { IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';
import type { MarketDescriptor, Order } from '$lib/types';
import { formatChartPrice, normalizeChartPrice } from './priceNormalization';

export type PriceLineEntry = {
	orderId: string;
	line: IPriceLine;
	price: number;
	side: 'buy' | 'sell';
};

export function syncOrderPriceLines(
	series: ISeriesApi<'Candlestick'>,
	orders: Order[],
	existing: Map<string, PriceLineEntry>,
	priceOverrides: ReadonlyMap<string, number> = new Map()
): Map<string, PriceLineEntry> {
	const open = orders.filter((o) => o.status === 'open' || o.status === 'partial');
	const next = new Map<string, PriceLineEntry>();

	for (const order of open) {
		const overlayPrice = priceOverrides.get(order.id) ?? order.triggerPrice ?? order.price;
		if (overlayPrice == null) continue;
		const color = order.side === 'buy' ? '#2ee6c2' : '#ff3d9a';
		const title = order.triggerPrice != null ? (order.type.includes('stop') ? 'STOP' : 'TP') : '';

		const prev = existing.get(order.id);
		if (prev && prev.price === overlayPrice) {
			next.set(order.id, prev);
			continue;
		}
		if (prev) series.removePriceLine(prev.line);

		const line = series.createPriceLine({
			price: overlayPrice,
			color,
			lineWidth: 2,
			lineStyle: 0,
			axisLabelVisible: true,
			title
		});
		next.set(order.id, { orderId: order.id, line, price: overlayPrice, side: order.side });
	}

	for (const [id, entry] of existing) {
		if (!next.has(id)) series.removePriceLine(entry.line);
	}

	return next;
}

export function setPreviewLine(
	series: ISeriesApi<'Candlestick'>,
	current: IPriceLine | null,
	price: number | null,
	side: 'buy' | 'sell' = 'buy',
	market?: Pick<MarketDescriptor, 'priceDecimals' | 'instrument'> | null
): IPriceLine | null {
	if (current) series.removePriceLine(current);
	if (price == null) return null;

	return series.createPriceLine({
		price,
		color: side === 'buy' ? '#4fd6f7' : '#ff3d9a',
		lineWidth: 2,
		lineStyle: 2,
		axisLabelVisible: true,
		title: `Preview ${side.toUpperCase()} @ ${formatChartPrice(price, market)}`
	});
}

export function priceFromClick(
	_chart: IChartApi,
	series: ISeriesApi<'Candlestick'>,
	param: { point?: { x: number; y: number } },
	market?: Pick<MarketDescriptor, 'priceDecimals' | 'instrument'> | null
): number | null {
	if (!param.point) return null;
	const price = series.coordinateToPrice(param.point.y);
	return normalizeChartPrice(price ?? null, market);
}
