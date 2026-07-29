import { expect, test } from 'bun:test';

test('US-013 canonical trade route owns the single terminal workspace', async () => {
	const source = await Bun.file(new URL('../routes/trade/+page.svelte', import.meta.url)).text();
	expect(source).toContain("import TerminalWorkspace from '$lib/components/TerminalWorkspace.svelte';");
	expect(source).toContain('<TerminalWorkspace />');
});
