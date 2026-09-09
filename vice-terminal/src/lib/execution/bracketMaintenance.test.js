import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./localExecution.ts', import.meta.url), 'utf8');

describe('US-004 bracket grouping', () => {
	test('uses Hyperliquid normalTpsl for an order-form entry plus TP/SL children', () => {
		expect(source).toContain("grouping: intent.orderType === 'bracket' ? 'normalTpsl' : 'na'");
		expect(source).not.toContain("grouping: intent.orderType === 'bracket' ? 'positionTpsl' : 'na'");
	});
});
