#!/usr/bin/env bun
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const REQUIRED_STORY_FIELDS = [
	'Persona', 'Preconditions', 'Success behavior', 'Failure behavior',
	'Reconnect behavior', 'Restart behavior', 'Stale/offline behavior',
	'Custody expectations', 'Latency expectations', 'Telemetry',
	'Linked tests', 'Funded-mainnet evidence', 'Action IDs'
];
export const REQUIRED_PROOF_CLASSES = ['unit/contract', 'hydrated UI', 'funded-mainnet', 'reconnect/restart', 'final-cleanup'];
const CRITERION_ID = /^US-\d{3}-AC-\d{3}$/;
const BLOCKING_EVIDENCE_WORDS = /\b(?:planned|placeholder|pending|invalidated|stale|absent)\b/i;

export async function readStoryCatalog(root = resolve(import.meta.dir, '..')) {
	const directory = resolve(root, 'docs/user-stories');
	const names = (await readdir(directory)).filter((name) => /^US-\d+-.+\.md$/.test(name)).sort();
	return Promise.all(names.map(async (name) => ({ name, source: await Bun.file(resolve(directory, name)).text() })));
}

export function extractCriteria(source) {
	return [...source.matchAll(/^[-*]\s+(US-\d{3}-AC-\d{3}):\s+(Given\b.*)$/gim)].map((match) => ({ id: match[1], text: match[2] }));
}
function criterionActionIds(source, criterionId) {
	const line = source.split('\n').find((value) => value.includes(criterionId)) ?? '';
	return [...line.matchAll(/`([a-z][a-z0-9]*(?:\.[a-z0-9][a-z0-9-]*)+)`/g)].map((match) => match[1]);
}
function hasProofClass(source, proofClass) {
	const normalized = source.toLowerCase();
	const aliases = {
		'unit/contract': ['linked tests:', 'contract'],
		'hydrated UI': ['browser', 'hydrated', 'e2e'],
		'funded-mainnet': ['funded-mainnet evidence:', 'mainnet evidence'],
		'reconnect/restart': ['reconnect behavior:', 'restart behavior:', 'reconnect', 'restart'],
		'final-cleanup': ['cleanup', 'zero open orders', 'zero unintended positions']
	}[proofClass].map((alias) => alias.toLowerCase());
	return aliases.some((alias) => normalized.includes(alias));
}

export function validateStory(name, source, { actionCatalog = null } = {}) {
	const errors = [];
	if (!/^# US-\d{3}[: —]/.test(source)) errors.push('missing versioned story heading');
	if (!/schema v2/i.test(source)) errors.push('missing schema v2 marker');
	for (const field of REQUIRED_STORY_FIELDS) {
		if (!new RegExp(`^[-*]\\s*${field}:`, 'im').test(source)) errors.push(`missing ${field}`);
	}
	const criteria = extractCriteria(source);
	if (!criteria.length) errors.push('missing explicit Given/When/Then acceptance criteria IDs');
	const ids = new Set();
	for (const criterion of criteria) {
		if (!CRITERION_ID.test(criterion.id) || ids.has(criterion.id)) errors.push(`duplicate or invalid criterion ID ${criterion.id}`);
		ids.add(criterion.id);
		for (const actionId of criterionActionIds(source, criterion.id)) {
			if (actionCatalog && !actionCatalog.has(actionId)) errors.push(`${criterion.id}: unknown action ID ${actionId}`);
		}
	}
	if (!/Given .* When .* Then /is.test(source)) errors.push('missing explicit Given/When/Then acceptance');
	return { name, errors, criteria };
}

export async function validateStoryCatalog(root = resolve(import.meta.dir, '..')) {
	const stories = await readStoryCatalog(root);
	let actionCatalog = null;
	try {
		const catalog = JSON.parse(await readFile(resolve(root, 'docs/user-stories/action-catalog.json'), 'utf8'));
		actionCatalog = new Set((catalog.actions ?? []).map((action) => action.id));
	} catch {
		// The shape validator remains useful for isolated story fixtures.
	}
	return stories.flatMap(({ name, source }) => validateStory(name, source, { actionCatalog }).errors.map((error) => `${name}: ${error}`));
}

export async function generateStoryStatus(root = resolve(import.meta.dir, '..')) {
	const stories = await readStoryCatalog(root);
	return stories.map(({ name, source }) => {
		const id = name.match(/^US-\d{3}/)?.[0] ?? name;
		const title = source.match(/^# US-\d{3}[: —]\s*(.+)$/m)?.[1] ?? name;
		const criteria = extractCriteria(source).map(({ id: criterionId }) => criterionId);
		const shapeErrors = validateStory(name, source).errors;
		const status = shapeErrors.length || BLOCKING_EVIDENCE_WORDS.test(source) || REQUIRED_PROOF_CLASSES.some((proofClass) => !hasProofClass(source, proofClass)) ? 'blocked' : 'implemented';
		return { id, title, criteria, status, errors: shapeErrors };
	});
}

export function renderStoryStatusTable(statuses) {
	const lines = ['| ID | Story | Criteria | Status |', '| --- | --- | ---: | --- |'];
	for (const story of statuses) lines.push(`| ${story.id} | ${story.title} | ${story.criteria.length} | ${story.status} |`);
	return lines.join('\n');
}

if (import.meta.main) {
	const errors = await validateStoryCatalog();
	if (errors.length) {
		console.error(`User-story catalog validation failed:\n${errors.join('\n')}`);
		process.exit(1);
	}
	const statuses = await generateStoryStatus();
	const readmePath = resolve(import.meta.dir, '../docs/user-stories/README.md');
	const readme = await Bun.file(readmePath).text();
	const start = '<!-- GENERATED STORY STATUS START -->';
	const end = '<!-- GENERATED STORY STATUS END -->';
	const generated = `${start}\n${renderStoryStatusTable(statuses)}\n${end}`;
	const current = readme.match(new RegExp(`${start}[\\s\\S]*?${end}`))?.[0];
	if (current && current !== generated) await writeFile(readmePath, readme.replace(current, generated));
	else if (!current) await writeFile(readmePath, `${readme.trimEnd()}\n\n${generated}\n`);
	console.log(`User-story catalog schema v2 passed (${statuses.length} stories, ${statuses.reduce((total, story) => total + story.criteria.length, 0)} criteria).`);
}
