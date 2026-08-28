// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
	canPresentAccountState,
	healthLabel,
	unavailableFeedMessage
} from './productionTruth';

describe('US-001 production truth', () => {

	test('only presents account state after wallet and account synchronization are live', () => {
		expect(canPresentAccountState(false, 'live')).toBe(false);
		expect(canPresentAccountState(true, 'connecting')).toBe(false);
		expect(canPresentAccountState(true, 'live')).toBe(true);
	});

	test('keeps public data health independent and explicit', () => {
		expect(healthLabel('live')).toBe('LIVE');
		expect(healthLabel('degraded')).toBe('DEGRADED');
		expect(healthLabel('idle')).toBe('OFF');
		expect(unavailableFeedMessage('order book', 'error')).toBe('order book unavailable');
	});

	test('does not treat a stopped public feed as a live catalog', async () => {
		const source = await Bun.file(new URL('./hl/subscriptions.ts', import.meta.url)).text();
		expect(source).toContain("marketDataStatus.set('idle')");
		expect(source).toContain("marketCatalogStatus.set('idle')");
	});

});
