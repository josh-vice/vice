import { describe, expect, test } from 'bun:test';
import { READ_RETRY_DELAY_MS, READ_TIMEOUT_MS, withReadRetry, withReadTimeout } from './server';

describe('read-only Hyperliquid reliability boundary', () => {
	test('fails a stalled venue read explicitly and clears the timer after success', async () => {
		await expect(withReadTimeout('test read', () => Promise.resolve('ok'), 20)).resolves.toBe('ok');
		await expect(withReadTimeout('test read', () => new Promise(() => {}), 5)).rejects.toThrow('test read timed out');
	});

	test('keeps the production timeout bounded and materially below a human session hang', () => {
		expect(READ_TIMEOUT_MS).toBeGreaterThan(0);
		expect(READ_TIMEOUT_MS).toBeLessThanOrEqual(15_000);
		expect(READ_RETRY_DELAY_MS).toBeLessThanOrEqual(250);
	});

	test('retries an idempotent public read once after a transient failure', async () => {
		let calls = 0;
		await expect(withReadRetry('book', async () => {
			calls += 1;
			if (calls === 1) throw new Error('temporary venue failure');
			return 'ok';
		}, 2)).resolves.toBe('ok');
		expect(calls).toBe(2);
	});

	test('account snapshots query every venue perp DEX instead of silently dropping HIP-3 state', async () => {
		const source = await Bun.file(new URL('./server.ts', import.meta.url)).text();
		expect(source).toContain('client.perpDexs()');
		expect(source).toContain('PERP_DEX_CACHE_MS');
		expect(source).toContain('perpDexNamesPromise ??=');
		expect(source).toContain('client.frontendOpenOrders({ user, dex })');
		expect(source).toContain('client.clearinghouseState({ user, dex })');
		expect(source).toContain('fetchPerpOpenOrders(address)');
		expect(source).toContain('const names = await fetchPerpDexNames()');
		expect(source).toContain('mapPerpPositions(perpSlices)');
		expect(source).toContain('id: `position:${p.position.coin}`');
		expect(source).not.toContain('pos-${index}');
		expect(source).toContain('boundedReadMap');
		expect(source).toContain('Hyperliquid ${dex || \'core\'} account slice');
	});

	test('lost-ack open-order reconciliation uses bounded DEX reads', async () => {
		const source = await Bun.file(new URL('../execution/localExecution.ts', import.meta.url)).text();
		expect(source).toContain("import { boundedReadMap } from '$lib/hl/boundedReads';");
		expect(source).toContain('this.info!.frontendOpenOrders');
		expect(source).toContain('2,\n\t\t\t50');
	});

	test('public book proxy uses the bounded live-feed shape and extra transient retry', async () => {
		const source = await Bun.file(new URL('./server.ts', import.meta.url)).text();
		expect(source).toContain('l2Book({ coin, nSigFigs: 5 })');
		expect(source).toContain("}, 3);\n}");
	});

	test('account websocket reconciliation covers all perp DEXs', async () => {
		const source = await Bun.file(new URL('./account.ts', import.meta.url)).text();
		expect(source).toContain('client.allDexsClearinghouseState');
		expect(source).not.toContain('client.clearinghouseState({ user: address as `0x${string}` }, () => scheduleSnapshot(address))');
	});
});
