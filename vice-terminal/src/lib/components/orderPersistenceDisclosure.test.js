import { expect, test } from 'bun:test';

test('US-011 order ticket discloses the real persistence class before submission', async () => {
	const source = await Bun.file(new URL('./OrderTicket.svelte', import.meta.url)).text();
	expect(source).toContain("const venueNativeOrderTypes = new Set<OrderType>(['limit', 'market', 'stop', 'stop_limit', 'bracket', 'twap'])");
	expect(source).toContain("label: 'Venue-native'");
	expect(source).toContain('The venue manages this order after it is accepted. It can survive this browser closing.');
	expect(source).toContain("label: 'Device-local'");
	expect(source).toContain('It does not run on Vice servers; reopening this device reconciles before resuming.');
	expect(source).toContain('data-testid="order-persistence-class"');
});
