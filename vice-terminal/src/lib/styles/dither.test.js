import { describe, expect, test } from 'bun:test';

const css = await Bun.file(new URL('./dither.css', import.meta.url)).text();
const appCss = await Bun.file(new URL('../../app.css', import.meta.url)).text();

describe('CSS-only dither surfaces', () => {
	test('defines pointer-inert compositor primitives without per-tick scripting', () => {
		expect(appCss).toContain("@import './lib/styles/dither.css';");
		for (const token of ['.dither-token', '.dither-stale', '.dither-disabled', '.dither-halftone']) {
			expect(css).toContain(token);
		}
		expect(css).toContain('pointer-events: none');
		expect(css).toContain('transform: translateZ(0)');
		expect(css).toContain('radial-gradient');
		expect(css).not.toContain('animation');
	});
});
