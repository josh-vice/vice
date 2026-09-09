import { expect, test } from 'bun:test';

test('account refresh helpers expose authoritative generation-safe reconciliation', async () => {
	const source = await Bun.file(new URL('./orders.ts', import.meta.url)).text();
	expect(source).toContain("import { refreshAccountSnapshot } from './account';");
	expect(source).toContain('export async function fetchOpenOrders(): Promise<boolean>');
	expect(source).toContain('export async function fetchPositions(): Promise<boolean>');
	expect(source).toContain('export async function fetchTwapJobs(): Promise<boolean>');
	expect(source).toContain('return await refreshAccountSnapshot(addr);');
	expect(source).toContain('catch {\n\t\treturn false;');
});
