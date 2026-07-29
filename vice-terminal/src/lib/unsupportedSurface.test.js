import { describe, expect, test } from 'bun:test';

describe('US-001 unsupported production surfaces', () => {
	test('keeps simulated non-Hyperliquid and options surfaces behind demo fixtures', async () => {
		for (const file of ['DexPanel.svelte', 'RfqPanel.svelte', 'OptionsChain.svelte', 'OptionsBottomPanel.svelte', 'MobileOptionsChain.svelte']) {
			const source = await Bun.file(new URL(`./components/${file}`, import.meta.url)).text();
			expect(source).toContain('demoFixturesEnabled');
			expect(source).toMatch(/\{#if !\$?demoFixturesEnabled\}/);
		}
		const strategy = await Bun.file(new URL('./components/StrategyBuilder.svelte', import.meta.url)).text();
		expect(strategy).toContain('$demoFixturesEnabled && isOpen');
		const trollbox = await Bun.file(new URL('./components/Trollbox.svelte', import.meta.url)).text();
		expect(trollbox).toContain('if (!demoFixturesEnabled) return;');
		expect(trollbox).toContain('Live community and news feeds are not connected');
		expect(trollbox).toContain("void import('$lib/trollboxFixtures')");
		expect(trollbox).not.toContain('const X_ACCOUNTS');
		expect(trollbox).not.toContain('const POST_TEMPLATES');
		expect(trollbox).not.toContain('const SEED_MESSAGES');
		expect(trollbox).not.toContain('const BOT_CHATTER');
		expect(trollbox).not.toContain('const LIQ_TEMPLATES');
		const publicIndex = await Bun.file(new URL('./index.ts', import.meta.url)).text();
		expect(publicIndex).not.toContain("export * from './data';");
		expect(publicIndex).not.toContain('OptionsChain');
		const stores = await Bun.file(new URL('./stores.ts', import.meta.url)).text();
		expect(stores).not.toContain("from './data'");
		expect(stores).toContain("await import('./data')");
		const marketWatchlist = await Bun.file(new URL('./components/MarketWatchlist.svelte', import.meta.url)).text();
		expect(marketWatchlist).not.toContain("from '$lib/data'");
		expect(marketWatchlist).toContain("from '$lib/format'");
		const bottomPanel = await Bun.file(new URL('./components/BottomPanel.svelte', import.meta.url)).text();
		expect(bottomPanel).not.toContain("from '$lib/data'");
		expect(bottomPanel).toContain("from '$lib/format'");
		for (const file of ['../routes/+page.svelte', './components/OrderBook.svelte', './components/RecentTrades.svelte', './components/OptionsChain.svelte']) {
			const source = await Bun.file(new URL(file, import.meta.url)).text();
			expect(source).not.toContain("from '$lib/data'");
		}
		const navbar = await Bun.file(new URL('./components/Navbar.svelte', import.meta.url)).text();
		expect(navbar).toContain("from '$lib/execution/latencyEvidence'");
		expect(navbar).toContain('downloadLatencyEvidence');
	});
});
