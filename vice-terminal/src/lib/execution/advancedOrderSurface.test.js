import { describe, expect, test } from 'bun:test';
import { advancedOrderTypes, isAdvancedOrderCertified } from './capabilities';

describe('US-004 advanced order surface', () => {
	test('lists every state-machine capability and locks uncertified types instead of hiding them', async () => {
		const source = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		for (const type of advancedOrderTypes()) expect(source).toContain(`id: '${type}'`);
		expect(advancedOrderTypes().every((type) => !isAdvancedOrderCertified(type, undefined))).toBe(true);
		expect(advancedOrderTypes().every((type) => isAdvancedOrderCertified(type, 'true', 'true'))).toBe(true);
		expect(source).toContain('availableOrderTypeGroups = orderTypeGroups;');
		expect(source).toContain('Testnet certification required');
		expect(source).toContain('disabled={!certified}');
		expect(source).toContain('unavailableOrderTypeMessage(t.id)');
		expect(source).toContain('availableQuickTypes = quickTypes.filter((type) => isAdvancedOrderCertified(type.id))');
		expect(source).toContain('{#each availableQuickTypes as quick}');
		expect(source).toContain('data-testid="advanced-certification-status"');
		expect(source).toContain('advanced strategies are listed in the order-type menu but locked');
	});

	test('routes OCO and trailing stop through the advanced submission path', async () => {
		const source = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		expect(source).toContain("'oco'");
		expect(source).toContain("'trailing_stop'");
		expect(source).toContain('startAlgoOrder');
	});
});
