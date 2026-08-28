import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateActionCatalog, renderInteractionStories } from './action-catalog.mjs';

describe('exhaustive interaction catalog', () => {
	test('checked-in controls and generated stories are exact', async () => {
		const root = resolve(import.meta.dir, '..');
		const catalog = JSON.parse(await readFile(resolve(root, 'docs/user-stories/action-catalog.json'), 'utf8'));
		const errors = await validateActionCatalog(catalog);
		expect(errors).toEqual([]);
		expect(await readFile(resolve(root, 'docs/user-stories/INTERACTION_STORIES.md'), 'utf8')).toBe(renderInteractionStories(catalog));
	});

	test('rejects an orphaned action record', async () => {
		const catalog = { schemaVersion: 2, actions: [{ id: 'orphan.action', registry: false }] };
		const errors = await validateActionCatalog(catalog, []);
		expect(errors).toContain('orphan.action: catalog record is not backed by a discovered control or registry');
	});
});

	test('rejects an interactive control without an ID', async () => {
		const errors = await validateActionCatalog({ schemaVersion: 2, actions: [] }, [{ file: 'test.svelte', line: 1, kind: 'button', actionId: null }]);
		expect(errors).toContain('test.svelte:1: interactive button is missing data-action-id');
	});
test('rejects index-derived identifiers', async () => {
	const record = { id: 'ui.orderbook.button.1', route: '/trade', surface: 'component', channel: 'pointer', control: 'button', featureStory: 'US-029', criterion: 'US-029-AC-001', persona: 'tester', intent: 'act', benefit: 'proof', preconditions: [], success: [], failure: [], loading: [], disabled: [], stale: [], offline: [], reconnect: [], restart: [], custody: [], latency: [], telemetry: [], accessibility: [], proof: [] };
	const errors = await validateActionCatalog({ schemaVersion: 2, actions: [record] }, [{ file: 'test.svelte', line: 1, kind: 'button', actionId: record.id }]);
	expect(errors).toContain('test.svelte:1: action ID is index-derived: ui.orderbook.button.1');
});