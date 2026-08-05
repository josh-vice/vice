/**
 * hermes-sidecar — orderTicket.ts
 *
 * Pure order-ticket adapter helpers for the desktop plugin order ticket.
 * The renderer holds zero business logic: every decision the ticket makes
 * (guard evaluation, payload construction, trading-mode resolution, error
 * normalization) is a pure function in this module, unit-tested with bun.
 *
 * Contract source (do not drift from these):
 *   - POST /api/execute body      -> src/lib/hermes-sidecar/execution.ts executeOrder()
 *   - preflight guards            -> ./ticketGuards.ts (evaluateTicketGuards + sub-guards)
 *   - lot/tick precision          -> ../execution/venueFormat.ts
 *   - fat-finger notional caps    -> ../execution/fatFinger.ts
 *   - flag conflicts              -> ../hl/orders.ts validateOrderFlags()
 *   - network / mainnet ACK       -> ../hl/networkPolicy.ts
 *   - kill switch                 -> ../execution/releaseSafety.ts semantics
 *   - effective leverage          -> ../stores.ts setOrderSizePercent() clamp
 *   - sidecar error envelope      -> src/lib/hermes-sidecar/execution.ts ExecutionRouteResult
 *
 * The sidecar applies the certified ±3% market-price buffer server-side
 * (execution.ts executeOrder) — this module must NOT apply it to the wire
 * body. The ticket sends the operator's working price verbatim.
 */
import type { OrderSide, OrderType } from '../types';
import { MAINNET_ACK } from '../hl/networkPolicy';
import { validateOrderFlags } from '../hl/orders';
import { formatVenuePrice, formatVenueSize } from '../execution/venueFormat';
import { emptyFatFingerLimits, type FatFingerLimits } from '../execution/fatFinger';
import {
	baseSizeFromAmount,
	isKillSwitchActive,
	lotSizeBlock,
	mainnetLockedMessage,
	mainnetSubmitBlock,
	orderTypeNeedsLimitPrice,
	orderTypeNeedsTrigger,
	priceDeviationConfirmation,
	tickSizeBlock,
	tifToFlags,
	tradingKillSwitchMessage,
	vaultLockedMessage,
	fatFingerMessages,
	type TicketMarket
} from './ticketGuards';

export type TicketOrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'bracket';
export type TicketSide = OrderSide;
export type TicketTif = 'Gtc' | 'Ioc' | 'Alo';
export type TicketSizeUnit = 'base' | 'quote';
export type TicketTriggerKind = 'stop' | 'takeProfit';

/**
 * Ticket market slice — a superset of ticketGuards.TicketMarket carrying the
 * venue metadata the order ticket needs: apiCoin for the wire body, the venue
 * maxLeverage for leverage bounds, and kind for spot detection. Callers pass
 * the full MarketDescriptor from the registry.
 */
export interface OrderTicketMarket extends TicketMarket {
	apiCoin?: string;
	maxLeverage?: number;
	kind?: 'corePerp' | 'hip3Perp' | 'spot' | 'outcome';
}

/** The exact POST /api/execute request body (execution.ts executeOrder contract). */
export interface SidecarExecuteBody {
	coin: string;
	isBuy: boolean;
	size: number;
	limitPrice: number;
	orderType?: string;
	reduceOnly: boolean;
	postOnly: boolean;
	ioc: boolean;
	triggerPrice?: number;
	triggerKind?: TicketTriggerKind;
	takeProfit?: number;
	stopLoss?: number;
	commandId?: string;
}

export interface OrderTicketInput {
	market: OrderTicketMarket | null;
	side: TicketSide;
	orderType: TicketOrderType;
	/** Base or quote amount; quote is converted via the reference price. */
	size: number;
	sizeUnit?: TicketSizeUnit;
	/** Reference price for quote→base conversion and deviation checks. */
	referencePrice?: number;
	/** Working limit price. Required positive for every order type (executeOrder). */
	limitPrice?: number;
	triggerPrice?: number;
	triggerKind?: TicketTriggerKind;
	tif?: TicketTif;
	reduceOnly?: boolean;
	takeProfit?: number;
	stopLoss?: number;
	/** UI leverage preference — clamped to venue metadata; never sent on the wire. */
	leverage?: number;
	commandId?: string;
}

export interface SubmitGuardMarketState {
	/** Vault unlocked (sidecar bridge ready). */
	unlocked: boolean;
	/** Current signed base size for fat-finger position caps. */
	currentSignedSize?: string;
	fatFingerLimits?: FatFingerLimits;
}

export interface SubmitGuardConfig {
	/** 'testnet' | 'mainnet' — defaults to testnet (fail-closed default). */
	network?: string;
	mainnetAck?: string;
	/** Release kill switch: certified active when === 'true' or === true. */
	killSwitch?: boolean | string;
}

export type SubmitGuardCode =
	| 'KILL_SWITCH'
	| 'MAINNET_ACK'
	| 'VAULT_LOCKED'
	| 'NO_MARKET'
	| 'LEVERAGE'
	| 'LOT_SIZE'
	| 'TICK_SIZE'
	| 'TRIGGER_INVALID'
	| 'FLAG_CONFLICT'
	| 'FAT_FINGER'
	| 'PRICE_DEVIATION';

export interface SubmitGuardReason {
	code: SubmitGuardCode;
	message: string;
}

export interface SubmitGuardResult {
	/** Hard blocks — submit must not fire. */
	blocked: boolean;
	/** Soft warnings — operator must acknowledge before submit. */
	requiresConfirmation: boolean;
	reasons: SubmitGuardReason[];
}

/**
 * Effective leverage exactly as the certified sizing path computes it
 * (stores.ts setOrderSizePercent): spot is always 1, perps clamp to the
 * market's venue maxLeverage when present, invalid inputs yield 0.
 */
export function resolveEffectiveLeverage(leverage: number | undefined, market: OrderTicketMarket | null): number {
	if (market?.kind === 'spot') return 1;
	// Absent request uses the store default (orderLeverage = 1).
	if (leverage === undefined) return 1;
	// Explicit invalid values short-circuit exactly like setOrderSizePercent.
	if (!Number.isFinite(leverage) || leverage <= 0) return 0;
	return Math.min(leverage, market?.maxLeverage ?? leverage);
}

/** Reference price fallback chain used by the ticket: explicit > mark > last. */
export function ticketReferencePrice(input: OrderTicketInput): number | undefined {
	const reference = input.referencePrice ?? input.market?.markPrice ?? input.market?.lastPrice;
	return Number.isFinite(reference) && reference && reference > 0 ? reference : undefined;
}

/**
 * Build the exact POST /api/execute body from ticket input.
 *
 * Returns the wire body plus the effective leverage for margin display.
 * Throws on values the sidecar would reject — the ticket must never send a
 * body it cannot sign (fail closed).
 */
export function buildOrderPayload(input: OrderTicketInput): { body: SidecarExecuteBody; leverage: number } {
	if (!input.market) throw new Error('No market selected');

	const reference = ticketReferencePrice(input);
	const size = baseSizeFromAmount(input.size, input.sizeUnit ?? 'base', reference ?? 0);
	if (!Number.isFinite(size) || size <= 0) throw new Error('Size must be a positive number');

	// The sidecar requires a positive working price for every order type
	// (execution.ts: 'Price must be a positive number').
	const workingPrice = input.limitPrice ?? reference ?? 0;
	if (!Number.isFinite(workingPrice) || workingPrice <= 0) throw new Error('Price must be a positive number');

	const flags = tifToFlags(input.tif ?? 'Gtc', input.orderType);
	const orderType = input.orderType ?? (input.takeProfit || input.stopLoss ? 'bracket' : 'limit');

	const body: SidecarExecuteBody = {
		coin: input.market.apiCoin ?? input.market.symbol,
		isBuy: input.side === 'buy',
		size,
		limitPrice: workingPrice,
		orderType,
		reduceOnly: !!input.reduceOnly,
		postOnly: flags.postOnly,
		ioc: flags.ioc
	};

	if (Number.isFinite(input.triggerPrice) && input.triggerPrice && input.triggerPrice > 0) {
		body.triggerPrice = input.triggerPrice;
		body.triggerKind = input.triggerKind ?? 'stop';
	}
	if (Number.isFinite(input.takeProfit) && input.takeProfit && input.takeProfit > 0) body.takeProfit = input.takeProfit;
	if (Number.isFinite(input.stopLoss) && input.stopLoss && input.stopLoss > 0) body.stopLoss = input.stopLoss;
	if (input.commandId) body.commandId = input.commandId;

	return { body, leverage: resolveEffectiveLeverage(input.leverage, input.market) };
}

/**
 * Full submit preflight for the ticket. Composed from the EXISTING certified
 * guard modules — no business logic lives here, only composition and a stable
 * code per reason.
 *
 *   - config-level gates (kill switch, mainnet ACK, vault) are hard blocks
 *   - lot/tick increment violations are hard blocks (never silent rounding)
 *   - fat-finger notional and price deviation are CONFIRM-then-proceed
 *   - leverage beyond the venue's maxLeverage is a hard block
 */
export function evaluateSubmitGuards(
	input: OrderTicketInput,
	marketState: SubmitGuardMarketState,
	config: SubmitGuardConfig = {}
): SubmitGuardResult {
	const reasons: SubmitGuardReason[] = [];
	let blocked = false;
	let requiresConfirmation = false;

	const push = (code: SubmitGuardCode, message: string, severity: 'block' | 'confirm'): void => {
		reasons.push({ code, message });
		if (severity === 'block') blocked = true;
		else requiresConfirmation = true;
	};

	const network = (config.network || 'testnet').trim().toLowerCase() || 'testnet';

	if (isKillSwitchActive(config.killSwitch)) {
		push('KILL_SWITCH', tradingKillSwitchMessage(network), 'block');
	}

	const mainnetBlock = mainnetSubmitBlock(network, config.mainnetAck);
	if (mainnetBlock) push('MAINNET_ACK', mainnetBlock, 'block');

	if (!marketState.unlocked) {
		push('VAULT_LOCKED', vaultLockedMessage(), 'block');
	}

	if (!input.market) {
		push('NO_MARKET', 'No market selected', 'block');
		return { blocked, requiresConfirmation, reasons };
	}

	// Leverage bounds: venue metadata (market.maxLeverage), not an invented cap.
	const venueMaxLeverage = input.market.maxLeverage;
	if (
		Number.isFinite(input.leverage) &&
		input.leverage &&
		input.leverage > 0 &&
		typeof venueMaxLeverage === 'number' &&
		Number.isFinite(venueMaxLeverage) &&
		venueMaxLeverage > 0 &&
		input.leverage > venueMaxLeverage
	) {
		push(
			'LEVERAGE',
			`Leverage ${input.leverage} exceeds ${input.market.symbol} venue max ${venueMaxLeverage}`,
			'block'
		);
	}

	const reference = ticketReferencePrice(input);
	const size = baseSizeFromAmount(input.size, input.sizeUnit ?? 'base', reference ?? 0);
	const flags = tifToFlags(input.tif ?? 'Gtc', input.orderType);

	const flagError = validateOrderFlags(flags.postOnly, flags.ioc, input.orderType as OrderType);
	if (flagError) push('FLAG_CONFLICT', flagError, 'block');

	const lotErr = lotSizeBlock(size, input.market);
	if (lotErr) push('LOT_SIZE', lotErr, 'block');

	const needsPrice =
		orderTypeNeedsLimitPrice(input.orderType) || input.orderType === 'market' || input.orderType === 'stop';
	const workingPrice = input.limitPrice ?? reference ?? 0;
	let formattedSize: string | undefined;
	let formattedPrice: string | undefined;
	if (needsPrice) {
		const tickErr = tickSizeBlock(workingPrice, input.market);
		if (tickErr) push('TICK_SIZE', tickErr, 'block');
		else {
			try {
				formattedPrice = formatVenuePrice(workingPrice, input.market as Parameters<typeof formatVenuePrice>[1]);
			} catch (error) {
				push('TICK_SIZE', error instanceof Error ? error.message : 'Invalid price', 'block');
			}
		}
	}

	if (orderTypeNeedsTrigger(input.orderType)) {
		const tp = input.triggerPrice;
		if (!Number.isFinite(tp) || !tp || tp <= 0) {
			push('TRIGGER_INVALID', 'Trigger price must be a positive number', 'block');
		} else {
			const triggerTick = tickSizeBlock(tp, input.market);
			if (triggerTick) push('TRIGGER_INVALID', `Trigger: ${triggerTick}`, 'block');
		}
	}

	if (!lotErr) {
		try {
			formattedSize = formatVenueSize(size, input.market as Parameters<typeof formatVenueSize>[1]);
		} catch (error) {
			push('LOT_SIZE', error instanceof Error ? error.message : 'Invalid size', 'block');
		}
	}

	// Price deviation is a confirmation, never a block (market orders are
	// intentionally exempt — the sidecar applies the ±3% buffer).
	const deviation = priceDeviationConfirmation(workingPrice, reference, input.orderType);
	if (deviation) push('PRICE_DEVIATION', deviation, 'confirm');

	if (formattedSize && formattedPrice) {
		const ff = fatFingerMessages(marketState.fatFingerLimits ?? emptyFatFingerLimits(), {
			marketKey: input.market.marketKey || input.market.symbol,
			price: formattedPrice,
			size: formattedSize,
			side: input.side,
			reduceOnly: !!input.reduceOnly,
			currentSignedSize: marketState.currentSignedSize ?? '0'
		});
		if (ff.block) push('FAT_FINGER', ff.block, 'block');
		if (ff.confirm) push('FAT_FINGER', ff.confirm, 'confirm');
	}

	return { blocked, requiresConfirmation, reasons };
}

/**
 * Resolve trading mode from env. Fail-closed: unknown or malformed env never
 * opens submit. Mirrors the certified networkPolicy + releaseSafety gates.
 */
export function resolveTradingMode(env: Record<string, string | undefined> = {}): {
	network: 'testnet' | 'mainnet';
	submitAllowed: boolean;
	disabledReason: string | null;
} {
	const network =
		(env.VITE_HL_NETWORK ?? '').trim().toLowerCase() ||
		(env.VITE_HL_TESTNET === 'false' ? 'mainnet' : 'testnet');

	if (network !== 'testnet' && network !== 'mainnet') {
		// Malformed env — fail closed, never open.
		return { network: 'testnet', submitAllowed: false, disabledReason: `Invalid Hyperliquid network: ${network}` };
	}
	if (isKillSwitchActive(env.VITE_HL_TRADING_KILL_SWITCH)) {
		return { network, submitAllowed: false, disabledReason: tradingKillSwitchMessage(network) };
	}
	if (network === 'mainnet' && env.VITE_HL_MAINNET_ACK !== MAINNET_ACK) {
		return { network, submitAllowed: false, disabledReason: mainnetLockedMessage() };
	}
	return { network, submitAllowed: true, disabledReason: null };
}

export type NormalizedSidecarError = {
	code: 'LOCKED_VAULT' | 'KILL_SWITCH' | 'UNAUTHORIZED' | 'EXECUTION' | 'OK';
	message: string;
	details?: unknown;
};

/**
 * Normalize the sidecar's structured error into { code, message, details }.
 *
 * The wire transport is ExecutionRouteResult — a plain error string with no
 * code field (execution.ts). This adapter classifies the known system states
 * (locked vault → unlock CTA, kill switch, 401) and preserves the sidecar's
 * message text near-verbatim for everything else. It never collapses to a
 * generic 'something went wrong'.
 */
export function normalizeSidecarError(input: unknown): NormalizedSidecarError {
	if (input && typeof input === 'object' && (input as { ok?: boolean }).ok === true) {
		return { code: 'OK', message: '', details: input };
	}

	let message = '';
	let details: unknown;
	if (typeof input === 'string') {
		message = input;
	} else if (input instanceof Error) {
		message = input.message;
	} else if (input && typeof input === 'object') {
		const err = input as { error?: unknown; message?: unknown; detail?: unknown; ack?: unknown };
		message = typeof err.error === 'string' ? err.error : typeof err.message === 'string' ? err.message : '';
		details = err.detail ?? err.ack ?? undefined;
	}

	const text = message.trim();
	if (!text) {
		// No message to preserve — be honest, still never generic.
		return { code: 'EXECUTION', message: 'Sidecar returned an error with no message', details };
	}

	if (/secure trading is locked|unlock the agent vault/i.test(text)) {
		return { code: 'LOCKED_VAULT', message: text, details };
	}
	if (/kill switch|halted by/i.test(text)) {
		return { code: 'KILL_SWITCH', message: text, details };
	}
	if (/unauthorized|401/i.test(text)) {
		return { code: 'UNAUTHORIZED', message: text, details };
	}
	return { code: 'EXECUTION', message: text, details };
}
