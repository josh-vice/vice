#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const STREAM_CATALOG_SCHEMA_VERSION = 1;
export const STREAM_REQUIRED_FIELDS = ['id', 'venue', 'network', 'product', 'instrument', 'sourceProtocol', 'subscription', 'authoritativeSourceTimestamp', 'receiptTimestamp', 'epoch', 'freshnessThresholdMs', 'bootstrapRule', 'reconnectRule', 'consumer', 'healthStore', 'degradedBehavior', 'actionDependencies', 'privacy', 'evidenceIds'];
const catalogPath = resolve(import.meta.dir, '../docs/data/stream-catalog.json');

export function validateStreamCatalog(catalog, { actionIds = null } = {}) {
	const errors = [];
	if (catalog?.schemaVersion !== STREAM_CATALOG_SCHEMA_VERSION) errors.push(`stream catalog schemaVersion must be ${STREAM_CATALOG_SCHEMA_VERSION}`);
	const streams = Array.isArray(catalog?.streams) ? catalog.streams : [];
	if (!streams.length) errors.push('stream catalog must contain streams');
	const ids = new Set();
	for (const stream of streams) {
		if (!stream?.id || ids.has(stream.id)) errors.push(`duplicate or missing stream id ${stream?.id ?? '(missing)'}`);
		ids.add(stream?.id);
		for (const field of STREAM_REQUIRED_FIELDS) if (stream?.[field] === undefined || stream[field] === null || stream[field] === '') errors.push(`${stream?.id ?? '(missing)'}: missing ${field}`);
		if (stream?.network !== 'mainnet') errors.push(`${stream?.id ?? '(missing)'}: network must be mainnet`);
		if (!Number.isInteger(stream?.freshnessThresholdMs) || stream.freshnessThresholdMs <= 0) errors.push(`${stream?.id ?? '(missing)'}: freshnessThresholdMs must be positive integer`);
		if (!Array.isArray(stream?.actionDependencies) || stream.actionDependencies.length === 0) errors.push(`${stream?.id ?? '(missing)'}: actionDependencies must be non-empty`);
		if (actionIds) for (const actionId of stream.actionDependencies ?? []) if (!actionIds.has(actionId)) errors.push(`${stream.id}: unknown action dependency ${actionId}`);
		if (!Array.isArray(stream?.evidenceIds) || stream.evidenceIds.length === 0) errors.push(`${stream?.id ?? '(missing)'}: evidenceIds must be non-empty`);
	}
	return errors;
}

export async function readStreamCatalog() {
	return JSON.parse(await readFile(catalogPath, 'utf8'));
}
if (import.meta.main) {
	const catalog = await readStreamCatalog();
	const actions = JSON.parse(await readFile(resolve(import.meta.dir, '../docs/user-stories/action-catalog.json'), 'utf8'));
	const errors = validateStreamCatalog(catalog, { actionIds: new Set((actions.actions ?? []).map((action) => action.id)) });
	if (errors.length) {
		console.error(`Stream catalog validation failed:\n${errors.join('\n')}`);
		process.exit(1);
	}
	console.log('Stream catalog schema passed.');
}
