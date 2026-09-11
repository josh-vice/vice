import { get } from 'svelte/store';
import {
	orderPrice,
	designerMode,
	clickPlacementMode,
	priceInputFocused,
	chartPreviewPrice,
	chartActiveField,
	chartDraft,
	advancedConfig,
	postOnly,
	orderBook
} from '$lib/stores';
import { chartPriceUpdate } from './fields';

export function handleChartClick(price: number): void {
	const activeField = get(chartActiveField);
	const update = chartPriceUpdate(activeField, price);
	chartDraft.update((draft) => ({ ...draft, ...update.draft }));
	if (Object.keys(update.advanced).length) {
		advancedConfig.update((config) => ({ ...config, ...update.advanced }));
	}
	if (update.entryPrice !== undefined) orderPrice.set(update.entryPrice);

	if (get(designerMode) || get(clickPlacementMode)) {
		chartPreviewPrice.set(price);
		return;
	}

	if (get(priceInputFocused)) {
		return;
	}

	// Default: autofill price input
}


export function warnCrossSpread(side: 'buy' | 'sell', price: number): string | null {
	const book = get(orderBook);
	const bestAsk = book.asks[0]?.price;
	const bestBid = book.bids[0]?.price;

	if (side === 'buy' && bestAsk && price >= bestAsk && !get(postOnly)) {
		return 'Buy above ask — will execute as taker unless Post Only is enabled';
	}
	if (side === 'sell' && bestBid && price <= bestBid && !get(postOnly)) {
		return 'Sell below bid — will execute as taker unless Post Only is enabled';
	}
	return null;
}
