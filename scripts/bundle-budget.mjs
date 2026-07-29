#!/usr/bin/env bun
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

export const MAX_DOCKVIEW_GZIP_BYTES = 80 * 1024;

export function evaluateDockviewBundle(chunks) {
	if (!Array.isArray(chunks) || chunks.length === 0) return { pass: false, reason: 'Dockview client chunk is missing', gzipBytes: 0 };
	const gzipBytes = chunks.reduce((total, chunk) => total + chunk.gzipBytes, 0);
	return gzipBytes <= MAX_DOCKVIEW_GZIP_BYTES
		? { pass: true, gzipBytes }
		: { pass: false, reason: `Dockview client bundle is ${gzipBytes} bytes gzip; budget is ${MAX_DOCKVIEW_GZIP_BYTES}`, gzipBytes };
}

export async function inspectDockviewBundle(clientDirectory) {
	const manifest = Bun.file(join(clientDirectory, '.vite/manifest.json'));
	if (!(await manifest.exists())) return evaluateDockviewBundle([]);
	const entries = JSON.parse(await manifest.text());
	// Vite may prefix dependency source keys with "../" depending on the build root.
	// Match the package segment rather than a root-relative path, while keeping the
	// gate scoped to Dockview's lazy client module.
	const dockviewEntries = Object.entries(entries).filter(([key, entry]) =>
		key.includes('/node_modules/dockview/') || entry?.src?.includes('/node_modules/dockview/')
	);
	const chunks = [];
	for (const [, entry] of dockviewEntries) {
		if (!entry || typeof entry !== 'object' || typeof entry.file !== 'string') continue;
		const file = Bun.file(join(clientDirectory, entry.file));
		if (await file.exists()) chunks.push({ path: entry.file, gzipBytes: gzipSync(await file.text()).byteLength });
	}
	return evaluateDockviewBundle(chunks);
}

if (import.meta.main) {
	const clientDirectory = resolve(import.meta.dir, '../vice-terminal/.svelte-kit/output/client');
	const result = await inspectDockviewBundle(clientDirectory);
	if (!result.pass) {
		console.error(`Bundle budget failed closed: ${result.reason}`);
		process.exit(1);
	}
	console.log(`Dockview bundle budget passed: ${result.gzipBytes} gzip bytes (limit ${MAX_DOCKVIEW_GZIP_BYTES}).`);
}
