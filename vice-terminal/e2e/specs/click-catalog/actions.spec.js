import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from '../_fixtures.js';
import catalog from '../../../../docs/user-stories/action-catalog.json' with { type: 'json' };

test.describe('catalogued interaction surface', () => {
	test('renders every route-backed action family with stable IDs', async ({ page, evidence }) => {
		const routeGroups = new Map();
		for (const action of catalog.actions.filter((item) => item.surface === 'route')) {
			const route = action.route === '*' ? '/' : action.route || '/';
			if (!routeGroups.has(route)) routeGroups.set(route, []);
			routeGroups.get(route).push(action);
		}
		for (const [route, actions] of routeGroups) {
			await page.goto(route, { waitUntil: 'domcontentloaded' });
			if (new URL(page.url()).pathname !== route) continue;
			const ids = await page.locator('[data-action-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-action-id')));
			const bodyText = await page.locator('body').innerText();
			if (ids.length === 0) {
				expect(bodyText, `${route} missing action IDs without an explicit unavailable state`).toMatch(/404|unavailable|disabled|not enabled/i);
			} else {
				const present = new Set(ids);
				for (const id of present) expect(catalog.actions.some((action) => action.id === id), `${route} rendered undocumented action ${id}`).toBe(true);
				expect(actions.some((action) => present.has(action.id)), `${route} rendered no catalogued action`).toBe(true);
			}
		}
		await assertCleanRuntime(evidence, { ignoreConsole: [/Failed to load resource: the server responded with a status of 404/] });
	});

	test('renders the terminal component catalog on /trade', async ({ page, evidence }) => {
		await page.goto('/trade', { waitUntil: 'domcontentloaded' });
		const expected = catalog.actions.filter((item) => item.surface === 'component');
		const ids = await page.locator('[data-action-id]').evaluateAll((nodes) => new Set(nodes.map((node) => node.getAttribute('data-action-id'))).size);
		expect(ids, `trade action catalog criteria ${expected.map((item) => item.criterion).join(',')}`).toBeGreaterThan(0);
		await assertCleanRuntime(evidence);
	});
});
