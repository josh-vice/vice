import { describe, expect, test } from 'bun:test';

describe('native Price port', () => {
	test('reuses the shared chart only in read-only mode', async () => {
		const source = await Bun.file(new URL('./NativePriceChartPort.svelte', import.meta.url)).text();
		for (const token of ['Chart', 'readOnly={true}', 'suiteContext', 'nativeWidgetPorts.vPrice', 'data-testid="native-price-chart-port"', 'no signer, account, order, telemetry, or execution path']) expect(source).toContain(token);
		for (const token of ['placeOrder(', 'cancelOrder(', 'modifyOrderPrice(']) expect(source).not.toContain(token);
	});
});
