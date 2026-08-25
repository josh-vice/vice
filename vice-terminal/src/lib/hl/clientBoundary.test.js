import { describe, expect, test } from 'bun:test';

describe('Hyperliquid public transport boundaries', () => {
	test('isolates selected-book subscriptions from the general public transport', async () => {
		const source = await Bun.file(new URL('./client.ts', import.meta.url)).text();
		expect(source).toContain('let publicBookTransport: WebSocketTransport | null = null;');
		expect(source).toContain('let publicBookSubClient: SubscriptionClient | null = null;');
		expect(source).toContain('export function getPublicBookTransport(): WebSocketTransport');
		expect(source).toContain('export function getPublicBookSubscriptionClient(): SubscriptionClient');
		expect(source).toContain('transport: getPublicBookTransport()');
	});

	test('resets both public transports and the read-only client on shutdown', async () => {
		const source = await Bun.file(new URL('./client.ts', import.meta.url)).text();
		expect(source).toContain('const transports = [publicTransport, publicBookTransport, tradingTransport]');
		expect(source).toContain('await Promise.allSettled');
		expect(source).toContain('publicBookTransport = null;');
		expect(source).toContain('publicBookSubClient = null;');
		expect(source).toContain('publicInfoClient = null;');
	});
});
