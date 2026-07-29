import { describe, expect, test } from 'bun:test';

describe('Vice Hub SvelteKit migration boundary', () => {
	test('ships the preserved Hub island and an exact public-context bridge', async () => {
		const [route, hub, bridge] = await Promise.all([
			Bun.file(new URL('../vice-terminal/src/routes/hub/+page.svelte', import.meta.url)).text(),
			Bun.file(new URL('../vice-terminal/static/legacy/hub/index.html', import.meta.url)).text(),
			Bun.file(new URL('../vice-terminal/static/legacy/suite-bridge.js', import.meta.url)).text()
		]);
		expect(route).toContain('src="/legacy/hub/index.html"');
		expect(route).toContain("type: 'vice-suite-context'");
		expect(hub).toContain('../suite-bridge.js');
		expect(bridge).toContain("event.origin !== window.location.origin");
		expect(bridge).toContain('marketKey');
		expect(bridge).not.toContain('walletAddress');
		expect(bridge).not.toContain('context.account');
	});
});
