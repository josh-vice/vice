import { describe, expect, test } from 'bun:test';

describe('BloFin public review surface', () => {
	test('is separately gated and cannot gain a private or execution path', async () => {
		const gate = await Bun.file(new URL('./+page.ts', import.meta.url)).text();
		const page = await Bun.file(new URL('./+page.svelte', import.meta.url)).text();
		const csp = await Bun.file(new URL('../../../../svelte.config.js', import.meta.url)).text();
		expect(gate).toContain('blofinPublicReviewEnabled');
		expect(gate).toContain("error(404");
		expect(page).toContain('fetchBlofinReviewCatalog');
		const route = await Bun.file(new URL('../../api/blofin/public/catalog/+server.ts', import.meta.url)).text();
		expect(route).toContain('blofinPublicReviewEnabled');
		expect(route).toContain('fetchBlofinMarkets');
		expect(route).toContain("'cache-control': 'no-store'");
		expect(page).toContain('no wallet, API key, account, order, or transfer control');
		expect(csp).toContain("'https://openapi.blofin.com'");
		expect(csp).toContain("'https://demo-trading-openapi.blofin.com'");
		expect(csp).not.toContain("'wss://openapi.blofin.com'");
		expect(csp).not.toContain("'wss://demo-trading-openapi.blofin.com'");
		for (const forbidden of ['blofinAuthHeaders', 'fetchBlofinAccountSnapshot', 'placeOrder', 'localExecution']) {
			expect(page).not.toContain(forbidden);
			expect(route).not.toContain(forbidden);
		}
	});
});
