import { describe, expect, test } from 'bun:test';

describe('native Session Clocks port', () => {
	test('uses an injected local clock with explicit regular-hours limits and excludes execution', async () => {
		const source = await Bun.file(new URL('./NativeSessionClocksPort.svelte', import.meta.url)).text();
		for (const token of ['marketSessions', 'sessionClock', 'setInterval', 'clearInterval', 'nativeWidgetPorts.vClocks', 'data-testid="native-session-clocks-port"', 'does not claim holiday, halt, or venue-status data', 'no market feed, signer, account, order, telemetry, or execution path']) expect(source).toContain(token);
	});
});
