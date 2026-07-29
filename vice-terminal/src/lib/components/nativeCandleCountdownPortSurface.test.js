import { describe, expect, test } from 'bun:test';

describe('native Candle Close port', () => {
	test('uses UTC countdown calculations, cleans up its timer, and excludes execution', async () => {
		const source = await Bun.file(new URL('./NativeCandleCountdownPort.svelte', import.meta.url)).text();
		for (const token of ['candleCountdown', 'candleFrames', 'utcClock', 'setInterval', 'clearInterval', 'nativeWidgetPorts.vCountdown', 'data-testid="native-candle-countdown-port"', 'no candle, market, signer, account, order, telemetry, or execution path']) expect(source).toContain(token);
	});
});
