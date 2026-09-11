// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { syncOrderPriceLines } from './overlays';

function fakeSeries() {
	const created = [];
	return {
		created,
		createPriceLine(options) {
			const line = { options };
			created.push(line);
			return line;
		},
		removePriceLine() {}
	};
}

const order = {
	id: 'order-1',
	market: 'BTC',
	side: 'buy',
	type: 'limit',
	price: 100,
	size: 1,
	filled: 0,
	remaining: 1,
	status: 'open',
	reduceOnly: false,
	postOnly: true,
	timestamp: 1
};

describe('US-CT-004 live order price lines', () => {
	test('moves the chart line with the optimistic pending price', () => {
		const series = fakeSeries();
		const lines = syncOrderPriceLines(series, [order], new Map(), new Map([['order-1', 105]]));
		expect(series.created[0].options.price).toBe(105);
		expect(lines.get('order-1').price).toBe(105);
	});

	test('uses trigger price and trigger title when an order has an explicit trigger', () => {
		const series = fakeSeries();
		const trigger = { ...order, triggerPrice: 98, type: 'stop_limit', triggerKind: 'stop' };
		syncOrderPriceLines(series, [trigger], new Map());
		expect(series.created[0].options.price).toBe(98);
		expect(series.created[0].options.title).toBe('STOP');
	});
});
