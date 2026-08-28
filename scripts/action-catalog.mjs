#!/usr/bin/env bun
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';
import { parse } from 'svelte/compiler';

export const ACTION_CATALOG_SCHEMA_VERSION = 2;
export const REQUIRED_ARRAY_FIELDS = ['success', 'failure', 'loading', 'disabled', 'stale', 'offline', 'reconnect', 'restart', 'custody', 'latency', 'telemetry', 'accessibility', 'proof'];
const root = resolve(import.meta.dir, '..');
const sourceRoot = resolve(root, 'vice-terminal/src');
const catalogPath = resolve(root, 'docs/user-stories/action-catalog.json');
const markdownPath = resolve(root, 'docs/user-stories/INTERACTION_STORIES.md');

async function svelteFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...await svelteFiles(path));
		else if (entry.isFile() && entry.name.endsWith('.svelte')) files.push(path);
	}
	return files;
}
function attribute(node, name) {
	return node.attributes?.find((item) => item.name === name);
}
function hasEvent(node) {
	return (node.attributes ?? []).some((item) => /^(on|on:)/.test(item.name));
}
function isInteractive(node) {
	if (node.type !== 'Element') return false;
	if (['button', 'input', 'select', 'textarea', 'a', 'summary'].includes(node.name)) return node.name !== 'a' || Boolean(attribute(node, 'href')) || Boolean(attribute(node, '{href}'));
	return attribute(node, 'role')?.value?.[0]?.data === 'button' || hasEvent(node);
}
function walk(nodes, file, output) {
	for (const node of nodes ?? []) {
		if (isInteractive(node)) {
			const id = attribute(node, 'data-action-id');
			const value = id?.value?.[0]?.data ?? null;
			output.push({ file: relative(root, file), line: node.start ? sourceLine(file, node.start) : 0, kind: node.name, actionId: value });
		}
		walk(node.children, file, output);
		walk(node.fragment?.children, file, output);
	}
}
const sourceCache = new Map();
function sourceLine(file, offset) {
	const source = sourceCache.get(file) ?? '';
	return source.slice(0, offset).split('\n').length;
}

export async function discoverInteractiveActions() {
	const output = [];
	for (const file of await svelteFiles(resolve(sourceRoot, 'routes'))) {
		const source = await readFile(file, 'utf8');
		sourceCache.set(file, source);
		walk(parse(source).html.children, file, output);
	}
	for (const file of await svelteFiles(resolve(sourceRoot, 'lib/components'))) {
		const source = await readFile(file, 'utf8');
		sourceCache.set(file, source);
		walk(parse(source).html.children, file, output);
	}
	return output;
}
async function discoverRegistryActions() {
	const ids = new Set();
	const cli = await readFile(resolve(root, 'vice-terminal/src/lib/cli/executor.ts'), 'utf8');
	for (const match of cli.matchAll(/(?:execute|chain|repeat|alias|variable):\s*'([^']+)'/g)) ids.add(match[1]);
	const hotkeys = await readFile(resolve(root, 'vice-terminal/src/lib/hotkeys.ts'), 'utf8');
	const defaults = hotkeys.match(/DEFAULT_HOTKEYS[\s\S]*?\{([\s\S]*?)\n\};/)?.[1] ?? '';
	for (const match of defaults.matchAll(/(?:^|,)\s*([A-Za-z][A-Za-z0-9]*):\s*'[^']+'/g)) ids.add(`hotkey.${match[1]}`);
	return ids;
}

function validateRecord(record, seen, errors) {
	if (!record || typeof record !== 'object') return errors.push('catalog contains a non-object record');
	if (!record.id || seen.has(record.id)) errors.push(`duplicate or missing action id ${record?.id ?? '(missing)'}`);
	seen.add(record.id);
	for (const key of ['route', 'surface', 'channel', 'control', 'featureStory', 'criterion', 'persona', 'intent', 'benefit']) if (typeof record[key] !== 'string' || !record[key].trim()) errors.push(`${record.id ?? '(missing)'}: missing ${key}`);
	if (!['pointer', 'keyboard', 'touch', 'cli', 'gesture', 'system'].includes(record.channel)) errors.push(`${record.id}: invalid channel`);
	for (const field of ['preconditions', ...REQUIRED_ARRAY_FIELDS]) if (!Array.isArray(record[field])) errors.push(`${record.id}: ${field} must be an array`);
	if (record.registry !== undefined && !['production', 'story'].includes(record.registry)) errors.push(`${record.id}: registry source must be production or story`);
	if (record.registry && record.control !== record.id) errors.push(`${record.id}: registry control must equal its stable action ID`);
}
export async function validateActionCatalog(catalog, discovered = null) {
	const errors = [];
	if (catalog?.schemaVersion !== ACTION_CATALOG_SCHEMA_VERSION) errors.push(`schemaVersion must be ${ACTION_CATALOG_SCHEMA_VERSION}`);
	const records = Array.isArray(catalog?.actions) ? catalog.actions : [];
	const seen = new Set();
	for (const record of records) validateRecord(record, seen, errors);
	const byId = new Map(records.map((record) => [record.id, record]));
	const discoveredActions = discovered ?? await discoverInteractiveActions();
	const discoveredIds = new Set();
	for (const item of discoveredActions) {
		if (!item.actionId) errors.push(`${item.file}:${item.line}: interactive ${item.kind} is missing data-action-id`);
		else {
			if (discoveredIds.has(item.actionId)) errors.push(`${item.file}:${item.line}: duplicate discovered action ID ${item.actionId}`);
			discoveredIds.add(item.actionId);
			if (!byId.has(item.actionId)) errors.push(`${item.file}:${item.line}: orphan action ${item.actionId}`);
			else if (!/^[a-z][a-z0-9]*(?:\.[a-z0-9][a-z0-9-]*)+$/.test(item.actionId)) errors.push(`${item.file}:${item.line}: action ID is not stable: ${item.actionId}`);
			else if (/(?:^|\.)(?:button|input|select|textarea|a|div|form|summary)\.\d+$/.test(item.actionId)) errors.push(`${item.file}:${item.line}: action ID is index-derived: ${item.actionId}`);
		}
	}
	for (const record of records) if (!discoveredIds.has(record.id) && !record.registry) errors.push(`${record.id}: catalog record is not backed by a discovered control or registry`);
	if (discovered === null) {
		for (const actionId of await discoverRegistryActions()) if (!byId.has(actionId)) errors.push(`registry action ${actionId} is missing from the catalog`);
	}
	return errors;
}
export function renderInteractionStories(catalog) {
	const lines = ['# Interaction stories', '', `Generated from action catalog schema v${catalog.schemaVersion}.`, ''];
	for (const action of catalog.actions) {
		lines.push(`## ${action.id}`, '', `- Route: ${action.route}`, `- Surface: ${action.surface}`, `- Channel: ${action.channel}`, `- Control: ${action.control}`, `- Feature story: ${action.featureStory}`, `- Criterion: ${action.criterion}`, `- Persona: ${action.persona}`, `- Intent: ${action.intent}`, `- Benefit: ${action.benefit}`);
		for (const field of ['preconditions', ...REQUIRED_ARRAY_FIELDS]) lines.push(`- ${field}: ${action[field].join('; ') || 'None declared'}`);
		lines.push('');
	}
	return lines.join('\n');
}

if (import.meta.main) {
	const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
	const errors = await validateActionCatalog(catalog);
	if (errors.length) {
		console.error(`Action catalog validation failed:\n${errors.join('\n')}`);
		process.exit(1);
	}
	const generated = renderInteractionStories(catalog);
	const current = await readFile(markdownPath, 'utf8').catch(() => '');
	if (current !== generated) {
		console.error('INTERACTION_STORIES.md is stale; regenerate with bun scripts/action-catalog.mjs --write');
		process.exit(1);
	}
	console.log(`Action catalog passed: ${catalog.actions.length} records.`);
}
