import { describe, expect, test } from 'bun:test';

/**
 * The Pit is a LOCAL beta command console. Non-command input must never
 * masquerade as community delivery, and the panel must be clearly labelled.
 * This is a source-token gate so a regression in the boundary fails the build.
 */
describe('The Pit local-only boundary', () => {
	const sourceOf = () => Bun.file(new URL('./components/PitChat.svelte', import.meta.url)).text();

	test('labels the panel as a local beta command console', async () => {
		const source = await sourceOf();
		expect(source).toContain('local · beta');
		expect(source).toContain('local command console');
	});

	test('only slash commands reach the live-state handler', async () => {
		const source = await sourceOf();
		// Non-command input is refused before any delivery happens.
		expect(source).toContain('if (!isChatCommand(raw))');
		expect(source).toContain('pushModeration(');
		expect(source).toContain('commands start with "/"');
	});

	test('a plain peer message can never be pushed as community delivery', async () => {
		const source = await sourceOf();
		// The previous plain-chat push (`type: 'chat'` with user 'You' for
		// arbitrary text) must be gone — only slash-command results are echoed.
		expect(source).not.toContain('user: \'You\',\n\t\t\thandle: customHandle || null,\n\t\t\ttext: raw');
	});

	test('composer affordance is command-only, not a chat send', async () => {
		const source = await sourceOf();
		expect(source).toContain('placeholder="/ for commands (local console)…"');
		expect(source).not.toContain('placeholder="Chat or type / for commands…"');
		expect(source).toContain('>Run</button>');
	});
});
