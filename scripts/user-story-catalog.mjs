#!/usr/bin/env bun
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

export const REQUIRED_STORY_FIELDS = [
	'Persona', 'Preconditions', 'Success behavior', 'Failure behavior',
	'Reconnect behavior', 'Restart behavior', 'Stale/offline behavior',
	'Custody expectations', 'Latency expectations', 'Telemetry',
	'Linked tests', 'Funded-testnet evidence'
];

export async function readStoryCatalog(root = resolve(import.meta.dir, '..')) {
	const directory = resolve(root, 'docs/user-stories');
	const names = (await readdir(directory)).filter((name) => /^US-\d+-.+\.md$/.test(name)).sort();
	return Promise.all(names.map(async (name) => ({ name, source: await Bun.file(resolve(directory, name)).text() })));
}

export function validateStory(name, source) {
	const errors = [];
	if (!/^# US-\d+[: —]/.test(source)) errors.push('missing versioned story heading');
	if (!/schema v1/i.test(source)) errors.push('missing schema v1 marker');
	for (const field of REQUIRED_STORY_FIELDS) {
		if (!new RegExp(`^[-*]\\s*${field}:`, 'im').test(source)) errors.push(`missing ${field}`);
	}
	if (!/Given .* When .* Then /is.test(source)) errors.push('missing explicit Given/When/Then acceptance');
	return { name, errors };
}

export async function validateStoryCatalog(root) {
	const stories = await readStoryCatalog(root);
	return stories.flatMap(({ name, source }) => validateStory(name, source).errors.map((error) => `${name}: ${error}`));
}

if (import.meta.main) {
	const errors = await validateStoryCatalog();
	if (errors.length) {
		console.error(`User-story catalog validation failed:\n${errors.join('\n')}`);
		process.exit(1);
	}
	console.log('User-story catalog schema v1 passed.');
}
