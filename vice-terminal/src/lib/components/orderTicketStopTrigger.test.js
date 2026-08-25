import { expect, test } from 'bun:test';

test('ticket sends its configured stop trigger through the shared order boundary', async () => {
	const source = await Bun.file(new URL('./OrderTicket.svelte', import.meta.url)).text();
	expect(source).toContain('triggerPrice: needsTrigger ? $advancedConfig.triggerPrice : undefined');
	expect(source).toContain("triggerKind: needsTrigger ? 'stop' : undefined");
	expect(source).toContain("$: needsTrigger = marketProfile.supportsTriggers && ['stop', 'stop_limit'].includes($orderType);");
});
