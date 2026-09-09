import { describe, expect, test } from 'bun:test';

describe('secure trading initialization failure boundary', () => {
	test('locks a partially initialized signer before surfacing an error', async () => {
		const source = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
		const start = source.indexOf('export async function enableTrading');
		const end = source.indexOf('\nexport function disconnectWallet', start);
		const block = source.slice(start, end);
		expect(block).toContain('localExecution.initialize(provider, address, options, report);');
		expect(block).toContain('assertFreshExecutionState(get(isConnected), get(accountSyncStatus), get(marketDataStatus));');
		expect(block).toContain('localExecution.lock();');
		expect(block).toContain("executionStatus.set('error');");
	});
});
