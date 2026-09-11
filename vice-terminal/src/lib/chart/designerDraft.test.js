// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { chartDraftPrice, designerDraftPresentation } from './designerDraft';

describe('US-CT-002 Designer draft cursor', () => {
	test('prefers the clicked preview price and falls back to the active draft field', () => {
	const draft = { entry: 100, trigger: 95 };
	expect(chartDraftPrice('entry', draft, 101.5)).toBe(101.5);
	expect(chartDraftPrice('trigger', draft, null)).toBe(95);
	expect(chartDraftPrice('stopLoss', draft, null)).toBeNull();
	});

	test('describes the pending order with field, side, size, and normalized display price', () => {
		expect(designerDraftPresentation({
			field: 'entry',
			orderType: 'limit',
			side: 'buy',
			size: 0.25,
			baseAsset: 'BTC',
			priceText: '76,599.0'
		})).toEqual({
			action: 'PLACE LIMIT',
			field: 'ENTRY',
			side: 'BUY',
			details: 'BUY · 0.25 BTC @ 76,599.0',
			ariaLabel: 'Place limit BUY entry draft at 76,599.0'
		});
	});

	test('uses trigger semantics for conditional fields without implying execution', () => {
		expect(designerDraftPresentation({
			field: 'stopLoss',
			orderType: 'bracket',
			side: 'sell',
			size: 1,
			baseAsset: 'ETH',
			priceText: '3,100.5'
		})).toMatchObject({
			action: 'PLACE BRACKET',
			field: 'STOP LOSS',
			side: 'SELL',
			ariaLabel: 'Place bracket SELL stop loss draft at 3,100.5'
		});
	});
});
