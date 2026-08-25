import { describe, expect, test } from 'bun:test';

describe('US-001 unsupported production surfaces', () => {
	test('keeps simulated fixture data out of production surfaces', async () => {
		const strategy = await Bun.file(new URL('./components/StrategyBuilder.svelte', import.meta.url)).text();
		expect(strategy).toContain('$demoFixturesEnabled && isOpen');
		const pitChat = await Bun.file(new URL('./components/PitChat.svelte', import.meta.url)).text();
		expect(pitChat).toContain('if (!demoFixturesEnabled)');
		expect(pitChat).toContain('Community transport not connected');
		expect(pitChat).toContain("void import('$lib/trollboxFixtures')");
		expect(pitChat).not.toContain('const X_ACCOUNTS');
		expect(pitChat).not.toContain('const POST_TEMPLATES');
		expect(pitChat).not.toContain('const SEED_MESSAGES');
		expect(pitChat).not.toContain('const BOT_CHATTER');
		expect(pitChat).not.toContain('const LIQ_TEMPLATES');
		const publicIndex = await Bun.file(new URL('./index.ts', import.meta.url)).text();
		expect(publicIndex).not.toContain("export * from './data';");
		const stores = await Bun.file(new URL('./stores.ts', import.meta.url)).text();
		expect(stores).not.toContain("from './data'");
		expect(stores).toContain("await import('./data')");
		const marketWatchlist = await Bun.file(new URL('./components/MarketWatchlist.svelte', import.meta.url)).text();
		expect(marketWatchlist).not.toContain("from '$lib/data'");
		expect(marketWatchlist).toContain("from '$lib/format'");
		const bottomPanel = await Bun.file(new URL('./components/BottomPanel.svelte', import.meta.url)).text();
		expect(bottomPanel).not.toContain("from '$lib/data'");
		expect(bottomPanel).toContain("from '$lib/format'");
		for (const file of ['../routes/+page.svelte', './components/OrderBook.svelte', './components/RecentTrades.svelte']) {
			const source = await Bun.file(new URL(file, import.meta.url)).text();
			expect(source).not.toContain("from '$lib/data'");
		}
		const navbar = await Bun.file(new URL('./components/Navbar.svelte', import.meta.url)).text();
		expect(navbar).toContain("from '$lib/execution/latencyEvidence'");
		expect(navbar).toContain('downloadLatencyEvidence');
	});
});
