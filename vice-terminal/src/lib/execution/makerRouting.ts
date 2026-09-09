import { get } from 'svelte/store';
import { orderBook, selectedMarket, walletAddress } from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';

type MakerParams = { side: 'buy' | 'sell'; size: number; offsetTicks?: number; reduceOnly?: boolean };

function passivePrice(market: MarketDescriptor, side: 'buy' | 'sell', offsetTicks: number): number | null {
	const book = get(orderBook);
	const level = side === 'buy' ? book.bids[0]?.price : book.asks[0]?.price;
	if (!Number.isFinite(level) || !level || offsetTicks < 0) return null;
	const tick = 10 ** -market.priceDecimals;
	const raw = side === 'buy' ? level - tick * offsetTicks : level + tick * offsetTicks;
	return Math.round(raw / tick) * tick;
}

export async function startMakerRoute(market: MarketDescriptor, params: MakerParams): Promise<{ ok: boolean; error?: string; data?: unknown }> {
	if (!get(walletAddress)) return { ok: false, error: 'Connect and unlock the local agent before maker routing' };
	if (get(selectedMarket)?.marketKey !== market.marketKey) return { ok: false, error: 'Select the maker market so its live book is authoritative' };
	if (params.size <= 0) return { ok: false, error: 'Maker routing requires a positive size' };
	const price = passivePrice(market, params.side, Math.round(params.offsetTicks ?? 0));
	if (price == null) return { ok: false, error: 'Live order book is unavailable for maker routing' };
	const book = get(orderBook);
	const bestAsk = book.asks[0]?.price;
	const bestBid = book.bids[0]?.price;
	if (params.side === 'buy' && bestAsk != null && price >= bestAsk) return { ok: false, error: 'Maker price would cross the live ask' };
	if (params.side === 'sell' && bestBid != null && price <= bestBid) return { ok: false, error: 'Maker price would cross the live bid' };
	const { localExecution } = await import('./localExecution');
	const ack = await localExecution.placeOrder(market, { coin: market.apiCoin, isBuy: params.side === 'buy', size: params.size, limitPrice: price, reduceOnly: params.reduceOnly ?? false, tif: 'Alo', orderType: 'maker' });
	return ack.accepted ? { ok: true, data: ack } : { ok: false, error: ack.error, data: ack };
}

export function makerPriceForTest(market: MarketDescriptor, side: 'buy' | 'sell', offsetTicks = 0): number | null {
	return passivePrice(market, side, offsetTicks);
}
