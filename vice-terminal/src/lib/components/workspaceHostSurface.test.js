import { describe, expect, test } from 'bun:test';

describe('US-012 Dockview workspace host', () => {
	test('owns client-only docking, persistence, and component mounting behind one host', async () => {
		const host = await Bun.file(new URL('./WorkspaceHost.svelte', import.meta.url)).text();
		for (const token of ['onMount', "import('dockview')", 'createDockview', "defaultRenderer: 'onlyWhenVisible'", "floatingGroupBounds: 'boundedWithinViewport'", "floatingGroupDragHandle: 'titlebar'", "popoutUrl: '/popout.html'", 'keyboardNavigation: true', 'getTabContextMenuItems', "label: 'Float panel'", 'addFloatingGroup(panel)', "label: 'Pop out panel'", 'addPopoutGroup(panel', "label: 'Open current market snapshot'", "component: 'market-snapshot'", 'crypto.randomUUID()', 'params: { marketKey: market.marketKey }', 'init: (params:', 'props: params.params', 'loadWorkspaceLayout', 'saveWorkspaceLayout', 'removeWorkspaceLayout', 'api.fromJSON', 'api.toJSON', 'floatingGroups', 'popoutGroups', "vice:workspace-layout-reset", "data-testid=\"workspace-host\""]) expect(host).toContain(token);
		expect(host).toContain('Unknown Vice workspace panel');
		expect(host).toContain('synchronizePanelVisibility');
		expect(host).toContain("chart.api.setSize({ width: Math.max(300, host.clientWidth - 870) })");
		expect(host).toContain('marketData?.api.setSize({ width: 270 });');
		expect(host).toContain('ticket?.api.setSize({ width: 320 });');
		expect(host).not.toContain('subscriptionsReady) createDefaultLayout()');
	});

	test('uses a static same-origin shell for a popout rather than a second terminal runtime', async () => {
		const shell = await Bun.file(new URL('../../../static/popout.html', import.meta.url)).text();
		expect(shell).toContain('<title>Vice Terminal panel</title>');
		expect(shell).toContain("Content-Security-Policy");
		expect(shell).toContain("default-src 'none'");
		expect(shell).toContain("connect-src 'none'");
		expect(shell).not.toContain('<script');
		expect(shell).not.toContain('Wallet');
	});
});
