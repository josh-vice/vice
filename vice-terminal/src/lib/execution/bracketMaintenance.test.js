import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./localExecution.ts', import.meta.url), 'utf8');

describe('US-004 partial-fill bracket maintenance', () => {
	test('delegates TP/SL quantity maintenance to Hyperliquid positionTpsl', () => {
		expect(source).toContain("grouping: intent.orderType === 'bracket' ? 'positionTpsl' : 'na'");
		expect(source).not.toContain("grouping: intent.orderType === 'bracket' ? 'normalTpsl' : 'na'");
	});
});
