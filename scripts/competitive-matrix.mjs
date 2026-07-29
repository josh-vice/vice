#!/usr/bin/env bun
import { resolve } from 'node:path';

const matrixPath = resolve(import.meta.dir, '../docs/competitive/insilico-matrix.json');
const validStatuses = new Set(['unverified', 'behind', 'partial', 'meets', 'exceeds', 'blocked']);

export function validateCompetitiveMatrix(matrix) {
	const errors = [];
	if (matrix?.schemaVersion !== 1) errors.push('matrix schemaVersion must be 1');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(matrix?.lastIndexed ?? '')) errors.push('matrix lastIndexed must be ISO date');
	const capabilities = Array.isArray(matrix?.capabilities) ? matrix.capabilities : [];
	if (!capabilities.length) errors.push('matrix must contain capabilities');
	const ids = new Set();
	for (const row of capabilities) {
		if (!row?.id || ids.has(row.id)) errors.push(`duplicate or missing capability id ${row?.id ?? '(missing)'}`);
		ids.add(row?.id);
		if (!/^https:\/\//.test(row?.sourceUrl ?? '')) errors.push(`${row?.id}: missing official source URL`);
		if (!Array.isArray(row?.viceStories) || !row.viceStories.length) errors.push(`${row?.id}: missing Vice story mapping`);
		if (!validStatuses.has(row?.status)) errors.push(`${row?.id}: invalid status ${row?.status}`);
		if (!row?.nextGate) errors.push(`${row?.id}: missing next gate`);
		if (['meets', 'exceeds'].includes(row?.status) && !row?.evidence) errors.push(`${row?.id}: green status requires direct evidence`);
	}
	return errors;
}

export async function validateCheckedInCompetitiveMatrix() {
	return validateCompetitiveMatrix(await Bun.file(matrixPath).json());
}

if (import.meta.main) {
	const errors = await validateCheckedInCompetitiveMatrix();
	if (errors.length) {
		console.error(`Competitive matrix validation failed:\n${errors.join('\n')}`);
		process.exit(1);
	}
	console.log('Competitive matrix schema passed; no unsupported parity claim is implied.');
}
