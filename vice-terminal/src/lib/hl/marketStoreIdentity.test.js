import { describe, expect, test } from 'bun:test';

describe('live market store identity boundary', () => {
	test('live perp and spot stores are descriptor-only', async () => {
		const source = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
		expect(source).toContain('Writable<MarketDescriptor[]>');
		expect(source).toContain('Readable<MarketDescriptor[]>');
		expect(source).not.toContain('Writable<Market[]>');
		expect(source).not.toContain('Readable<Market[]>');
	});

	test('the live store type imports no legacy Market routing shape', async () => {
		const source = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
		expect(source).not.toMatch(/import type \{[^}]*\bMarket,\s*MarketDescriptor/s);
	});

	test('authoritative descriptor does not inherit optional legacy identity fields', async () => {
		const source = await Bun.file(new URL('../types.ts', import.meta.url)).text();
		expect(source).toContain('export interface MarketDescriptor {');
		expect(source).not.toContain('export interface MarketDescriptor extends Market');
		expect(source).toContain('marketKey: string;');
		expect(source).toContain('apiCoin: string;');
		expect(source).toContain('assetId: number;');
	});
});
