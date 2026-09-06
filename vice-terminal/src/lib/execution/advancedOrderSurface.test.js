import { describe, expect, test } from 'bun:test';
import { advancedOrderTypes } from './capabilities';
import { ORDER_TYPE_GROUPS } from '../orderTicketModel';

describe('US-004 advanced order surface', () => {
	test('lists every state-machine capability and locks uncertified types instead of hiding them', async () => {
		const source = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		const model = await Bun.file(new URL('../orderTicketModel.ts', import.meta.url)).text();
		for (const type of advancedOrderTypes()) expect(model).toContain(`id: '${type}'`);
		expect(source).toContain('marketProfile.supportsAdvancedOrders && isAdvancedOrderType(type.id)');
		expect(source).toContain('isAdvancedOrderCertified');
		expect(source).toContain('Live certification required');
		expect(source).toContain('disabled={!certified}');
		expect(source).toContain('unavailableOrderTypeMessage(t.id)');
		expect(source).toContain('availableQuickTypes = QUICK_ORDER_TYPES.filter');
		expect(source).toContain('if (!isAdvancedOrderCertified($orderType))');
	});

	test('uses the selected position as a plain reactive value in break-even defaults', async () => {
		const source = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		expect(source).toContain('$advancedConfig.breakEvenEntryPrice ?? selectedPosition?.entryPrice');
		expect(source).not.toContain('$advancedConfig.breakEvenEntryPrice ?? $selectedPosition?.entryPrice');
	});

	test('does not expose a dead server-side advanced-order start route', async () => {
		const route = await Bun.file(new URL('../../routes/api/algo/start/+server.ts', import.meta.url)).exists();
		expect(route).toBe(false);
		const source = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		expect(source).not.toContain('/api/algo/start');
	});

	test('keeps the full 15-type catalog discoverable while execution remains gated', async () => {
		const source = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		const model = await Bun.file(new URL('../orderTicketModel.ts', import.meta.url)).text();
		const catalog = new Set(ORDER_TYPE_GROUPS.flatMap((group) => group.types.map((type) => type.id)));
		expect(advancedOrderTypes()).toHaveLength(15);
		for (const type of advancedOrderTypes()) {
			expect(catalog.has(type)).toBe(true);
			expect(model).toContain(`id: '${type}'`);
			if (type === 'scale') expect(source).toContain("params.type !== 'scale'");
			else if (type === 'bracket') expect(source).toContain("params.type === 'bracket' && capabilities.supportsAdvancedOrders");
			else expect(source).toContain(`params.type === '${type}'`);
		}
		expect(source).toContain('if (!isAdvancedOrderCertified(params.type))');
	});

	test('routes OCO and trailing stop through the advanced submission path', async () => {
		const source = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		expect(source).toContain("'oco'");
		expect(source).toContain("'trailing_stop'");
		expect(source).toContain('startAlgoOrder');
	});
});
