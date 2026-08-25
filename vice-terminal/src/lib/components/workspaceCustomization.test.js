import { describe, expect, test } from 'bun:test';

const source = async (path) => Bun.file(new URL(path, import.meta.url)).text();

describe('workspace customization user stories', () => {
	test('trader can discover widgets without entering drag mode', async () => {
		const navbar = await source('./Navbar.svelte');
		expect(navbar).toContain('data-testid="workspace-widgets-toggle"');
		expect(navbar).toContain('Choose visible widgets');
		expect(navbar).toContain("setWorkspacePanel(panel.id, event.currentTarget.checked)");
		expect(navbar).toContain("id: 'chat'");
	});

	test('trader gets a deliberate edit mode instead of accidental layout drift', async () => {
		const [navbar, host] = await Promise.all([source('./Navbar.svelte'), source('./WorkspaceHost.svelte')]);
		expect(navbar).toContain('data-testid="workspace-customize-toggle"');
		expect(navbar).toContain('EDIT LAYOUT');
		expect(host).toContain('group.header.hidden = $workspaceLocked');
		expect(host).toContain("data-layout-mode={$workspaceLocked ? 'view' : 'edit'}");
	});

	test('layout fitting uses measured viewport geometry, not a fixed subtraction', async () => {
		const host = await source('./WorkspaceHost.svelte');
		expect(host).toContain('api.layout(host.clientWidth, host.clientHeight, true)');
		expect(host).not.toContain('host.clientWidth - 870');
	});
});
