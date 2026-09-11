// @ts-nocheck
import { afterEach, describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { handleChartClick } from './clickTrading';
import {
	chartActiveField,
	chartDraft,
	chartPreviewPrice,
	designerMode,
	priceInputFocused
} from '$lib/stores';

afterEach(() => {
	designerMode.set(false);
	priceInputFocused.set(false);
	chartActiveField.set('entry');
	chartPreviewPrice.set(null);
	chartDraft.set({});
});

describe('US-CT-002 Designer click behavior', () => {
	test('keeps a chart preview when the selected ticket input is still focused', () => {
		designerMode.set(true);
		priceInputFocused.set(true);
		chartActiveField.set('entry');

		handleChartClick(76599);

		expect(get(chartPreviewPrice)).toBe(76599);
		expect(get(chartDraft)).toEqual({ entry: 76599 });
	});
});
