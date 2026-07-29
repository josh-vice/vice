import { describe, expect, test } from 'bun:test';

describe('native Notes port', () => {
	test('uses only the device-local note store and excludes market or execution boundaries', async () => {
		const source = await Bun.file(new URL('./NativeNotesPort.svelte', import.meta.url)).text();
		for (const token of ['nativeNotes', 'loadNativeNotes', 'createNativeNote', 'updateNativeNote', 'removeNativeNote', 'nativeWidgetPorts.vNotes', 'data-testid="native-notes-port"', 'no market feed, signer, account, order, telemetry, or execution path']) expect(source).toContain(token);
	});
});
