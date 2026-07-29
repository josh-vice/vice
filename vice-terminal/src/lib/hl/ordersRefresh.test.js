import { expect, test } from 'bun:test';

test('position refresh exposes whether authoritative reconciliation completed', async () => {
	const source = await Bun.file(new URL('./orders.ts', import.meta.url)).text();
	expect(source).toContain('export async function fetchPositions(): Promise<boolean>');
	expect(source).toContain('if (!res.ok) return false;');
	expect(source).toContain('if (!Array.isArray(data.positions)) return false;');
	expect(source).toContain('return true;');
});
