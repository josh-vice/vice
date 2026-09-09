import { expect, test } from 'bun:test';

test('US-010 multi-market flatten waits for a newly live exact market before closing', async () => {
	const [stores, panel] = await Promise.all([
		Bun.file(new URL('../stores.ts', import.meta.url)).text(),
		Bun.file(new URL('../components/BottomPanel.svelte', import.meta.url)).text()
	]);
	expect(stores).toContain('export async function selectMarketForExecution');
	expect(stores).toContain("marketDataStatus.set('connecting');");
	expect(stores).toContain("selected?.marketKey === registered.marketKey && selected.apiCoin === registered.apiCoin && get(marketDataStatus) === 'live'");
	expect(panel).toContain('await selectMarketForExecution(target.market)');
	expect(panel).toContain('reverseCloseReconciliation(get(positions), target)');
});
