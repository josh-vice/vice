// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { chartPriceUpdate } from './fields';

describe('US-003 active-field chart placement', () => {
	test('maps every chart handle to its authoritative ticket field', () => {
		expect(chartPriceUpdate('entry', 100)).toEqual({ draft: { entry: 100 }, advanced: {}, entryPrice: 100 });
		expect(chartPriceUpdate('trigger', 99).advanced).toEqual({ triggerPrice: 99 });
		expect(chartPriceUpdate('takeProfit', 110).advanced).toEqual({ takeProfit: 110 });
		expect(chartPriceUpdate('stopLoss', 95).advanced).toEqual({ stopLoss: 95 });
		expect(chartPriceUpdate('scaleStart', 90).advanced).toEqual({ scaleStartPrice: 90 });
		expect(chartPriceUpdate('scaleEnd', 105).advanced).toEqual({ scaleEndPrice: 105 });
	});
});
