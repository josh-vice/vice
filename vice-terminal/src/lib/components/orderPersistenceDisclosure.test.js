import { expect, test } from 'bun:test';

test('US-011 order ticket discloses the real persistence class before submission', async () => {
	const source = await Bun.file(new URL('./OrderTicket.svelte', import.meta.url)).text();
	const model = await Bun.file(new URL('../orderTicketModel.ts', import.meta.url)).text();
	expect(model).toContain("VENUE_NATIVE_ORDER_TYPES = new Set<OrderType>(['limit', 'market', 'stop', 'stop_limit', 'bracket', 'twap'])");
	expect(model).toContain("label: 'Venue-native'");
	expect(model).toContain('The venue manages this order after it is accepted. It can survive this browser closing.');
	expect(model).toContain("label: 'Device-local'");
	expect(model).toContain('It does not run on Vice servers; reopening this device reconciles before resuming.');
	expect(source).toContain('data-testid="order-persistence-class"');
});
