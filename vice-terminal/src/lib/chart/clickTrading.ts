import { get } from 'svelte/store';
import {
	orderPrice,
	orderSide,
	orderSize,
	designerMode,
	clickPlacementMode,
	priceInputFocused,
	chartPreviewPrice,
	chartActiveField,
	chartDraft,
	advancedConfig,
	postOnly,
	orderBook,
	selectedMarket
} from '$lib/stores';
import { placeOrder } from '$lib/hl/orders';
import { chartPriceUpdate } from './fields';

export function handleChartClick(price: number): void {
	const activeField = get(chartActiveField);
	const update = chartPriceUpdate(activeField, price);
	chartDraft.update((draft) => ({ ...draft, ...update.draft }));
	if (Object.keys(update.advanced).length) {
		advancedConfig.update((config) => ({ ...config, ...update.advanced }));
	}
	if (update.entryPrice !== undefined) orderPrice.set(update.entryPrice);

	if (get(priceInputFocused)) {
		return;
	}

	if (get(designerMode) || get(clickPlacementMode)) {
		chartPreviewPrice.set(price);
		return;
	}

	// Default: autofill price input
}

export async function submitChartOrder(price: number): Promise<void> {
	const size = get(orderSize);
	if (size <= 0) return;

	await placeOrder({
		marketKey: get(selectedMarket)?.marketKey,
		side: get(orderSide),
		type: 'limit',
		price,
		size,
		reduceOnly: false,
		postOnly: get(postOnly)
	});

	chartPreviewPrice.set(null);
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
