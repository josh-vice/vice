import { describe, expect, test } from 'bun:test';

async function source(relativePath) {
	return Bun.file(new URL(relativePath, import.meta.url)).text();
}

describe('US-012 workspace row-9 surface wiring', () => {
	test('privacy masking is reachable from the navbar and applied on ticket, account, and chart surfaces', async () => {
		const [navbar, ticket, bottom, chart] = await Promise.all([
			source('../components/Navbar.svelte'),
			source('../components/OrderTicket.svelte'),
			source('../components/BottomPanel.svelte'),
			source('../components/Chart.svelte')
		]);
		expect(navbar).toContain('setPrivacyMode(!$privacyMode)');
		expect(navbar).toContain('Hide private account values');
		expect(ticket).toContain("$privacyMode ? '••••••'");
		expect(bottom).toContain('Private account values are hidden by privacy mode.');
		expect(chart).toContain("import { privacyMode } from '$lib/privacyMode'");
	});

	test('hotkeys are configurable in the navbar and routed by a global handler', async () => {
		const [navbar, layout] = await Promise.all([
			source('../components/Navbar.svelte'),
			source('../../routes/+layout.svelte')
		]);
		expect(navbar).toContain('setHotkeyBinding(action, hotkeyFromEvent(event))');
		expect(navbar).toContain('Click a binding, then press its new key.');
		expect(layout).toContain("const action = actionForHotkey(loadHotkeys(), hotkeyFromEvent(e));");
		expect(layout).toContain("case 'focusChart': case 'focusBook': case 'focusTicket': case 'focusBottom'");
	});

	test('CLI panel documents chains, bounded repeat, and local aliases/variables', async () => {
		const panel = await source('../components/CLIPanel.svelte');
		expect(panel).toContain('; chains commands');
		expect(panel).toContain('bounded to 10 and stops on the first error');
		expect(panel).toContain('set</span> size=1');
		expect(panel).toContain('alias</span> fast=buy $size BTC-PERP @ market');
	});

	test('panel controls expose per-panel visibility and a layout reset from the navbar', async () => {
		const [navbar, host] = await Promise.all([
			source('../components/Navbar.svelte'),
			source('../components/WorkspaceHost.svelte')
		]);
		expect(navbar).toContain('setWorkspacePanel(panel.id, event.currentTarget.checked)');
		expect(navbar).toContain('requestWorkspaceLayoutReset()');
		expect(host).toContain('synchronizePanelVisibility');
		expect(host).toContain('data-testid="workspace-host"');
	});
});
