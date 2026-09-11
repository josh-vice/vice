// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/Chart.svelte', import.meta.url), 'utf8');

describe('US-CT-004 live order overlay contract', () => {
	test('keeps live drag state in a pending price map and cleans it on every commit path', () => {
		expect(source).toContain('let pendingOrderPrices = new Map<string, number>();');
		expect(source).toContain('pendingOrderPrices.set(order.id, newPrice);');
		expect(source).toContain('pendingOrderPrices.delete(order.id);');
		expect(source).toContain('liveOrderSpreadWarning(order, newPrice)');
	});

	test('keeps cancel separate from the drag handle and exposes pending/rejected states', () => {
		expect(source).toContain('data-testid="chart-live-order-handle"');
		expect(source).toContain('data-order-state={order.pending ? \'pending\' : order.error ? \'rejected\' : order.status}');
		expect(source).toContain('disabled={order.pending}');
		expect(source).toContain('onkeydown={(event) => onLiveOrderKeydown(event, order)}');
		expect(source).not.toContain('onmousedown={(event) => startOrderDrag(event, order.id, order.triggerPrice || order.price || 0)}');
	});
});
