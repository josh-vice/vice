import { describe, expect, test } from 'bun:test';
import { MAX_DOCKVIEW_GZIP_BYTES, evaluateDockviewBundle } from './bundle-budget.mjs';

describe('Dockview bundle budget', () => {
	test('fails closed when the lazy client chunk is absent', () => {
		expect(evaluateDockviewBundle([])).toEqual({ pass: false, reason: 'Dockview client chunk is missing', gzipBytes: 0 });
	});

	test('accepts a bounded lazy chunk and rejects a regression', () => {
		expect(evaluateDockviewBundle([{ path: 'dockview.js', gzipBytes: MAX_DOCKVIEW_GZIP_BYTES }]).pass).toBe(true);
		expect(evaluateDockviewBundle([{ path: 'dockview.js', gzipBytes: MAX_DOCKVIEW_GZIP_BYTES + 1 }])).toMatchObject({ pass: false, gzipBytes: MAX_DOCKVIEW_GZIP_BYTES + 1 });
	});
});
