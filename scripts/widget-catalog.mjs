#!/usr/bin/env bun
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const sourcePath = resolve(root, 'vice-terminal/static/legacy/hub.js');
const catalogPath = resolve(root, 'docs/widgets/vice-suite-widget-catalog.json');

export function idsFromWidgetDescriptions(source) {
	const start = source.indexOf('const WIDGET_DESC = {');
	const end = source.indexOf('\n  };', start);
	if (start < 0 || end < 0) throw new Error('ViceSuite widget descriptions are missing');
	return [...source.slice(start, end).matchAll(/^\s{4}([A-Za-z][A-Za-z0-9]*):\s*'/gm)].map((match) => match[1]);
}

export function validateWidgetCatalog(source, catalog) {
	const actual = idsFromWidgetDescriptions(source);
	const expected = Array.isArray(catalog?.widgets) ? catalog.widgets : [];
	const errors = [];
	if (catalog?.schemaVersion !== 1) errors.push('catalog schemaVersion must be 1');
	if (catalog?.acceptanceStory !== 'US-014') errors.push('catalog must map widgets to US-014');
	if (catalog?.expectedCount !== actual.length) errors.push(`catalog expectedCount=${catalog?.expectedCount}; source has ${actual.length}`);
	if (new Set(expected).size !== expected.length) errors.push('catalog contains duplicate widget IDs');
	if (expected.length !== actual.length) errors.push(`catalog lists ${expected.length} widget IDs; source has ${actual.length}`);
	for (const id of actual) if (!expected.includes(id)) errors.push(`missing catalog record for ${id}`);
	for (const id of expected) if (!actual.includes(id)) errors.push(`catalog references removed widget ${id}`);
	return { actual, errors };
}

export async function validateCheckedInWidgetCatalog() {
	const [source, catalog] = await Promise.all([
		Bun.file(sourcePath).text(),
		Bun.file(catalogPath).json()
	]);
	return validateWidgetCatalog(source, catalog);
}

if (import.meta.main) {
	const result = await validateCheckedInWidgetCatalog();
	if (result.errors.length) {
		console.error(`Widget catalog validation failed:\n${result.errors.join('\n')}`);
		process.exit(1);
	}
	console.log(`Widget catalog passed: ${result.actual.length} ViceSuite widgets map to US-014.`);
}
