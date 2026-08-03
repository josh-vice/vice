#!/usr/bin/env bun
import { resolve } from 'node:path';

const matrixPath = resolve(import.meta.dir, '../docs/competitive/insilico-matrix.json');
const validStatuses = new Set(['unverified', 'behind', 'partial', 'meets', 'exceeds', 'blocked']);
/** An outdated official source date blocks any current-parity claim. */
export const MAX_SOURCE_AGE_DAYS = 30;

function isIsoDate(value) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '');
}

function dateIsCurrent(iso, now = new Date()) {
	if (!isIsoDate(iso)) return false;
	const atMidnight = new Date(`${iso}T00:00:00Z`);
	if (Number.isNaN(atMidnight.getTime())) return false;
	const ageDays = (now.getTime() - atMidnight.getTime()) / 86_400_000;
	return ageDays >= 0 && ageDays <= MAX_SOURCE_AGE_DAYS;
}

export function validateCompetitiveMatrix(matrix, now = new Date()) {
	const errors = [];
	if (matrix?.schemaVersion !== 1) errors.push('matrix schemaVersion must be 1');
	if (!isIsoDate(matrix?.lastIndexed ?? '')) errors.push('matrix lastIndexed must be ISO date');
	else if (!dateIsCurrent(matrix.lastIndexed, now)) errors.push(`matrix lastIndexed ${matrix.lastIndexed} is older than ${MAX_SOURCE_AGE_DAYS} days; an outdated source date blocks a current-parity claim`);
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
		if (['meets', 'exceeds'].includes(row?.status) && !dateIsCurrent(row?.verificationDate, now)) errors.push(`${row?.id}: green status requires a current verificationDate within ${MAX_SOURCE_AGE_DAYS} days`);
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
