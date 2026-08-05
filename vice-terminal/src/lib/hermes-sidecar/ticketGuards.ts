/**
 * Pure UI preflight guards for the Hermes hyperliquid-trader order ticket.
 *
 * Mirrors certified src/lib rules — do not invent thresholds here:
 *   - kill switch        → releaseSafety.tradingKillSwitchActive ('true')
 *   - mainnet ACK        → networkPolicy.MAINNET_ACK
 *   - fat-finger         → execution/fatFinger.validateFatFinger
 *   - venue increments   → execution/venueFormat (block, never silent-round)
 *   - price deviation    → same ±3% buffer used by hl/orders market path
 *   - order flags        → hl/orders.validateOrderFlags
 *
 * Kept free of Svelte/import.meta so Bun unit tests and the desktop plugin
 * (which inlines the same pure checks) share one contract.
 */

import { MAINNET_ACK } from '../hl/networkPolicy';
import { formatVenuePrice, formatVenueSize } from '../execution/venueFormat';
import { validateFatFinger, type FatFingerLimits } from '../execution/fatFinger';
import { validateOrderFlags } from '../hl/orders';
import type { OrderSide, OrderType } from '../types';

/** Certified market-order price buffer (hl/orders.placeOrder). */
export const PRICE_DEVIATION_RATIO = 0.03;

export { MAINNET_ACK };

export type TicketMarket = {
	symbol: string;
	marketKey?: string;
	szDecimals: number;
	priceDecimals: number;
	lastPrice?: number;
	markPrice?: number;
};

export type TicketGuardInput = {
	/** 'testnet' | 'mainnet' */
	network: string;
	/** Exact VITE_HL_MAINNET_ACK / VICE_HL_MAINNET_ACK value, or empty. */
	mainnetAck?: string;
	/** True when VITE_HL_TRADING_KILL_SWITCH === 'true'. */
	killSwitch: boolean;
	/** Sidecar agent-vault unlocked. */
	unlocked: boolean;
	orderType: OrderType | string;
	side: OrderSide | string;
	/** Base size (already converted from quote if the ticket is in quote mode). */
	size: number;
	/** Limit / reference price. Required for limit/stop_limit; mark for market. */
	price: number;
	triggerPrice?: number;
	reduceOnly?: boolean;
	postOnly?: boolean;
	ioc?: boolean;
	market: TicketMarket | null | undefined;
	/** Optional local fat-finger caps (empty string = off). */
	fatFingerLimits?: FatFingerLimits;
	/** Current signed base size for the market (long +, short -). */
	currentSignedSize?: string;
	/** Reference mid/mark/last used for deviation checks. */
	referencePrice?: number;
};

export type TicketGuardResult = {
	/** Hard blocks — submit must not fire. */
	blocks: string[];
	/** Soft warnings that require explicit operator confirmation. */
	confirmations: string[];
	/** Venue-formatted size string when size is valid. */
	formattedSize?: string;
	/** Venue-formatted price string when price is valid and needed. */
	formattedPrice?: string;
	/** Whether the ticket should render disabled (kill / mainnet / locked). */
	disabled: boolean;
	/** Primary disabled reason for the ticket banner. */
	disabledReason?: string;
};

export function tradingKillSwitchMessage(network = 'testnet'): string {
	return `Trading is halted by the ${network} release kill switch. Cancel and reconciliation remain available.`;
}

export function mainnetLockedMessage(): string {
	return `Mainnet is locked. Set VITE_HL_MAINNET_ACK=${MAINNET_ACK} only after testnet release gates pass.`;
}

export function vaultLockedMessage(): string {
	return 'Secure trading is locked. Unlock the agent vault to place orders. The renderer never holds key material.';
}

/** True when the kill-switch env is the certified active value. */
export function isKillSwitchActive(flag: unknown): boolean {
	return flag === true || flag === 'true';
}

/** Fail-closed mainnet gate — only the exact ACK unlocks submit. */
export function mainnetSubmitBlock(network: string, mainnetAck?: string): string | undefined {
	const net = (network || 'testnet').trim().toLowerCase();
	if (net !== 'mainnet') return undefined;
	if (mainnetAck !== MAINNET_ACK) return mainnetLockedMessage();
	return undefined;
}

/**
 * Lot-size guard: block when size is not already on a valid venue increment.
 * Uses formatVenueSize then rejects any silent round-away from the input.
 */
export function lotSizeBlock(size: number, market: TicketMarket): string | undefined {
	if (!Number.isFinite(size) || size <= 0) return 'Order size must be positive';
	try {
		const formatted = formatVenueSize(size, market as Parameters<typeof formatVenueSize>[1]);
		if (Number(formatted) !== size && Math.abs(Number(formatted) - size) > 0) {
			// formatVenueSize rounds via toFixed — any change means invalid lot.
			return `Size ${size} is not a valid lot size for ${market.symbol} (${market.szDecimals} decimal places)`;
		}
		// Exact float equality can fail for binary fractions; also accept when
		// the input already matches the venue-formatted decimal string numerically
		// at szDecimals (no residual beyond that precision).
		const truncated = Number(size.toFixed(market.szDecimals));
		if (truncated !== Number(size.toFixed(12)) && Math.abs(size - truncated) > Number.EPSILON * Math.max(1, size)) {
			return `Size ${size} is not a valid lot size for ${market.symbol} (${market.szDecimals} decimal places)`;
		}
		if (Math.abs(Number(formatted) - size) > 1e-12 * Math.max(1, Math.abs(size))) {
			return `Size ${size} is not a valid lot size for ${market.symbol} (${market.szDecimals} decimal places)`;
		}
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : 'Invalid order size';
	}
}

/**
 * Tick-size guard: block when price is not already on a valid venue tick.
 * Mirrors formatVenuePrice (5 significant figures + priceDecimals).
 */
export function tickSizeBlock(price: number, market: TicketMarket): string | undefined {
	if (!Number.isFinite(price) || price <= 0) return 'Order price must be positive';
	try {
		const formatted = formatVenuePrice(price, market as Parameters<typeof formatVenuePrice>[1]);
		if (Math.abs(Number(formatted) - price) > 1e-12 * Math.max(1, Math.abs(price))) {
			return `Price ${price} is not a valid tick for ${market.symbol} (priceDecimals=${market.priceDecimals}, 5 sig figs)`;
		}
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : 'Invalid order price';
	}
}

/**
 * Price-deviation confirmation (not a hard block): fires when the working
 * price is more than the certified ±3% market buffer away from the reference.
 */
export function priceDeviationConfirmation(
	price: number,
	referencePrice: number | undefined,
	orderType: string
): string | undefined {
	if (!Number.isFinite(price) || price <= 0) return undefined;
	if (!Number.isFinite(referencePrice) || !referencePrice || referencePrice <= 0) return undefined;
	// Market orders intentionally use the ±3% buffer server-side — no UI confirm.
	if (orderType === 'market') return undefined;
	const ratio = Math.abs(price - referencePrice) / referencePrice;
	if (ratio > PRICE_DEVIATION_RATIO) {
		const pct = (ratio * 100).toFixed(2);
		return `Price ${price} is ${pct}% away from reference ${referencePrice} (threshold ${(PRICE_DEVIATION_RATIO * 100).toFixed(0)}%). Confirm to submit.`;
	}
	return undefined;
}

/**
 * Fat-finger notional confirmation when a local max-order notional is set and
 * the order notional exceeds it. Mirrors validateFatFinger messages.
 * (Hard block at the certified boundary; UI surfaces the same text as a
 * confirmation so the operator must acknowledge before the request fires —
 * the sidecar still enforces the hard reject.)
 */
export function fatFingerMessages(
	limits: FatFingerLimits | undefined,
	check: {
		marketKey: string;
		price: string;
		size: string;
		side: OrderSide | string;
		reduceOnly: boolean;
		currentSignedSize: string;
	}
): { block?: string; confirm?: string } {
	if (!limits) return {};
	const msg = validateFatFinger(limits, {
		marketKey: check.marketKey,
		price: check.price,
		size: check.size,
		side: check.side as OrderSide,
		reduceOnly: check.reduceOnly,
		currentSignedSize: check.currentSignedSize
	});
	if (!msg) return {};
	// Cap misconfiguration is a hard block; exceeded caps require confirmation
	// in the UI (sidecar still hard-rejects on submit).
	if (msg.startsWith('Set a positive') || msg.startsWith('Order notional cannot') || msg.startsWith('Position limit cannot')) {
		return { block: msg };
	}
	return { confirm: msg };
}

export function orderTypeNeedsLimitPrice(orderType: string): boolean {
	return orderType === 'limit' || orderType === 'stop_limit' || orderType === 'bracket';
}

export function orderTypeNeedsTrigger(orderType: string): boolean {
	return orderType === 'stop' || orderType === 'stop_limit';
}

/** Convert quote notional → base size using a positive reference price. */
export function baseSizeFromAmount(amount: number, unit: 'base' | 'quote', referencePrice: number): number {
	if (!Number.isFinite(amount) || amount < 0) return 0;
	if (unit === 'base') return amount;
	if (!Number.isFinite(referencePrice) || referencePrice <= 0) return 0;
	return amount / referencePrice;
}

/** Map ticket TIF + flags onto the certified postOnly/ioc pair. */
export function tifToFlags(
	tif: 'Gtc' | 'Ioc' | 'Alo',
	orderType: string
): { postOnly: boolean; ioc: boolean } {
	if (orderType === 'market') return { postOnly: false, ioc: true };
	if (tif === 'Alo') return { postOnly: true, ioc: false };
	if (tif === 'Ioc') return { postOnly: false, ioc: true };
	return { postOnly: false, ioc: false };
}

/**
 * Full preflight. Returns blocks (must not submit), confirmations (operator
 * must acknowledge), and disabled state for the ticket chrome.
 */
export function evaluateTicketGuards(input: TicketGuardInput): TicketGuardResult {
	const blocks: string[] = [];
	const confirmations: string[] = [];
	const network = (input.network || 'testnet').trim().toLowerCase() || 'testnet';

	let disabled = false;
	let disabledReason: string | undefined;

	if (isKillSwitchActive(input.killSwitch)) {
		disabled = true;
		disabledReason = tradingKillSwitchMessage(network);
		blocks.push(disabledReason);
	}

	const mainnetBlock = mainnetSubmitBlock(network, input.mainnetAck);
	if (mainnetBlock) {
		disabled = true;
		disabledReason = disabledReason ?? mainnetBlock;
		blocks.push(mainnetBlock);
	}

	if (!input.unlocked) {
		// Locked vault: ticket prompts unlock instead of erroring on submit.
		// Not a silent failure — disabled with a clear unlock CTA reason.
		disabled = true;
		disabledReason = disabledReason ?? vaultLockedMessage();
	}

	if (!input.market) {
		blocks.push('No market selected');
		return { blocks, confirmations, disabled: true, disabledReason: disabledReason ?? 'No market selected' };
	}

	const flagError = validateOrderFlags(!!input.postOnly, !!input.ioc, input.orderType as OrderType);
	if (flagError) blocks.push(flagError);

	const lotErr = lotSizeBlock(input.size, input.market);
	if (lotErr) blocks.push(lotErr);

	const needsPrice = orderTypeNeedsLimitPrice(input.orderType) || input.orderType === 'market' || input.orderType === 'stop';
	let formattedPrice: string | undefined;
	if (needsPrice) {
		const tickErr = tickSizeBlock(input.price, input.market);
		if (tickErr) blocks.push(tickErr);
		else {
			try {
				formattedPrice = formatVenuePrice(input.price, input.market as Parameters<typeof formatVenuePrice>[1]);
			} catch (error) {
				blocks.push(error instanceof Error ? error.message : 'Invalid price');
			}
		}
	}

	if (orderTypeNeedsTrigger(input.orderType)) {
		const tp = input.triggerPrice;
		if (!Number.isFinite(tp) || !tp || tp <= 0) blocks.push('Trigger price must be a positive number');
		else {
			const triggerTick = tickSizeBlock(tp, input.market);
			if (triggerTick) blocks.push(`Trigger: ${triggerTick}`);
		}
	}

	let formattedSize: string | undefined;
	if (!lotErr) {
		try {
			formattedSize = formatVenueSize(input.size, input.market as Parameters<typeof formatVenueSize>[1]);
		} catch (error) {
			blocks.push(error instanceof Error ? error.message : 'Invalid size');
		}
	}

	const reference =
		input.referencePrice ??
		input.market.markPrice ??
		input.market.lastPrice;

	const deviation = priceDeviationConfirmation(input.price, reference, input.orderType);
	if (deviation) confirmations.push(deviation);

	if (formattedSize && (formattedPrice || input.orderType === 'market' || input.orderType === 'stop')) {
		const priceStr =
			formattedPrice ??
			(Number.isFinite(input.price) && input.price > 0
				? (() => {
						try {
							return formatVenuePrice(input.price, input.market as Parameters<typeof formatVenuePrice>[1]);
						} catch {
							return undefined;
						}
					})()
				: undefined);
		if (priceStr && input.fatFingerLimits) {
			const ff = fatFingerMessages(input.fatFingerLimits, {
				marketKey: input.market.marketKey || input.market.symbol,
				price: priceStr,
				size: formattedSize,
				side: input.side,
				reduceOnly: !!input.reduceOnly,
				currentSignedSize: input.currentSignedSize ?? '0'
			});
			if (ff.block) blocks.push(ff.block);
			if (ff.confirm) confirmations.push(ff.confirm);
		}
	}

	return {
		blocks,
		confirmations,
		formattedSize,
		formattedPrice,
		disabled,
		disabledReason
	};
}
