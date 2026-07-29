import { describe, expect, test } from 'bun:test';

describe('Hyperliquid public transport boundaries', () => {
	test('isolates selected-book subscriptions from the general public transport', async () => {
		const source = await Bun.file(new URL('./client.ts', import.meta.url)).text();
		expect(source).toContain('let bookTransport: WebSocketTransport | null = null;');
		expect(source).toContain('let bookSubClient: SubscriptionClient | null = null;');
		expect(source).toContain('export function getBookTransport(): WebSocketTransport');
		expect(source).toContain('export function getBookSubscriptionClient(): SubscriptionClient');
		expect(source).toContain('transport: getBookTransport()');
	});

	test('resets both public transports and the read-only client on shutdown', async () => {
		const source = await Bun.file(new URL('./client.ts', import.meta.url)).text();
		expect(source).toContain('const transports = [transport, bookTransport]');
		expect(source).toContain('await Promise.allSettled');
		expect(source).toContain('bookTransport = null;');
		expect(source).toContain('bookSubClient = null;');
		expect(source).toContain('infoClient = null;');
	});
});
