// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { MAINNET_ACK } from '../hl/networkPolicy';
import {
	buildOrderPayload,
	evaluateSubmitGuards,
	normalizeSidecarError,
	resolveEffectiveLeverage,
	resolveTradingMode
} from './orderTicket.ts';
import { evaluateTicketGuards } from './ticketGuards.ts';

const btc = {
	symbol: 'BTC-USD-PERP',
	marketKey: 'HL:perp:BTC',
	apiCoin: 'BTC',
	szDecimals: 5,
	priceDecimals: 1,
	lastPrice: 50000,
	markPrice: 50000,
	maxLeverage: 25,
	kind: 'corePerp'
};

const spot = {
	symbol: 'PURR/USDC',
	marketKey: 'HL:spot:PURR',
	apiCoin: 'PURR',
	szDecimals: 5,
	priceDecimals: 5,
	lastPrice: 0.5,
	markPrice: 0.5,
	maxLeverage: undefined,
	kind: 'spot'
};

const open = { unlocked: true, currentSignedSize: '0' };
const openWithCaps = {
	unlocked: true,
	currentSignedSize: '0',
	fatFingerLimits: { maxOrderNotional: '100000', maxPositionNotionalByMarket: {} }
};

describe('buildOrderPayload — exact wire contract', () => {
	test('limit base order emits exactly the /api/execute body shape', () => {
		const { body } = buildOrderPayload({
			market: btc,
			side: 'buy',
			orderType: 'limit',
			size: 0.01,
			limitPrice: 50000,
			tif: 'Gtc',
			commandId: 'cmd-1'
		});
		expect(body).toEqual({
			coin: 'BTC',
			isBuy: true,
			size: 0.01,
			limitPrice: 50000,
			orderType: 'limit',
			reduceOnly: false,
			postOnly: false,
			ioc: false,
			commandId: 'cmd-1'
		});
	});

	test('quote notional converts to base size via reference price', () => {
		const { body } = buildOrderPayload({
			market: btc,
			side: 'buy',
			orderType: 'limit',
			size: 50000,
			sizeUnit: 'quote',
			referencePrice: 50000,
			limitPrice: 50000
		});
		expect(body.size).toBe(1);
	});

	test('quote conversion falls back to mark/last price', () => {
		const { body } = buildOrderPayload({
			market: btc,
			side: 'sell',
			orderType: 'limit',
			size: 25000,
			sizeUnit: 'quote',
			limitPrice: 50000
		});
		expect(body.size).toBe(0.5);
	});

	test('market order forces IOC and never carries the ±3% buffer in the body', () => {
		const { body } = buildOrderPayload({
			market: btc,
			side: 'buy',
			orderType: 'market',
			size: 0.01,
			referencePrice: 50000
		});
		expect(body.postOnly).toBe(false);
		expect(body.ioc).toBe(true);
		// The sidecar applies the buffer (execution.ts) — the ticket sends the raw price.
		expect(body.limitPrice).toBe(50000);
	});

	test('Alo maps to post-only; Ioc maps to IOC', () => {
		expect(
			buildOrderPayload({ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000, tif: 'Alo' }).body
		).toMatchObject({ postOnly: true, ioc: false });
		expect(
			buildOrderPayload({ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000, tif: 'Ioc' }).body
		).toMatchObject({ postOnly: false, ioc: true });
	});

	test('stop order carries trigger price and kind', () => {
		const { body } = buildOrderPayload({
			market: btc,
			side: 'sell',
			orderType: 'stop',
			size: 0.01,
			limitPrice: 49000,
			triggerPrice: 49500,
			triggerKind: 'stop'
		});
		expect(body.triggerPrice).toBe(49500);
		expect(body.triggerKind).toBe('stop');
	});

	test('TP/SL legs are flat numbers included only when provided', () => {
		const withLegs = buildOrderPayload({
			market: btc,
			side: 'buy',
			orderType: 'bracket',
			size: 0.01,
			limitPrice: 50000,
			takeProfit: 51000,
			stopLoss: 49000
		}).body;
		expect(withLegs.takeProfit).toBe(51000);
		expect(withLegs.stopLoss).toBe(49000);

		const plain = buildOrderPayload({
			market: btc,
			side: 'buy',
			orderType: 'limit',
			size: 0.01,
			limitPrice: 50000
		}).body;
		expect('takeProfit' in plain).toBe(false);
		expect('stopLoss' in plain).toBe(false);
	});

	test('orderType defaults to bracket when TP/SL present, else limit', () => {
		expect(
			buildOrderPayload({ market: btc, side: 'buy', size: 0.01, limitPrice: 50000, takeProfit: 51000 }).body.orderType
		).toBe('bracket');
		expect(buildOrderPayload({ market: btc, side: 'buy', size: 0.01, limitPrice: 50000 }).body.orderType).toBe('limit');
	});

	test('coin falls back to symbol when apiCoin is absent', () => {
		const noApiCoin = { ...btc, apiCoin: undefined };
		const { body } = buildOrderPayload({
			market: noApiCoin,
			side: 'buy',
			orderType: 'limit',
			size: 0.01,
			limitPrice: 50000
		});
		expect(body.coin).toBe('BTC-USD-PERP');
	});

	test('throws on size that cannot resolve to a positive base amount', () => {
		expect(() =>
			buildOrderPayload({ market: btc, side: 'buy', orderType: 'limit', size: 100, sizeUnit: 'quote', referencePrice: 0, limitPrice: 50000 })
		).toThrow('Size must be a positive number');
	});

	test('throws when the working price is missing or non-positive (no reference available)', () => {
		const noPrices = { ...btc, lastPrice: undefined, markPrice: undefined };
		expect(() =>
			buildOrderPayload({ market: noPrices, side: 'buy', orderType: 'limit', size: 0.01 })
		).toThrow('Price must be a positive number');
	});

	test('throws without a market (fail closed)', () => {
		expect(() =>
			buildOrderPayload({ market: null, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 })
		).toThrow('No market selected');
	});
});

describe('resolveEffectiveLeverage — stores.ts clamp parity', () => {
	test('defaults to 1 (store default) when no leverage requested', () => {
		expect(resolveEffectiveLeverage(undefined, btc)).toBe(1);
	});

	test('spot is always 1 regardless of request', () => {
		expect(resolveEffectiveLeverage(50, spot)).toBe(1);
	});

	test('clamps to the venue maxLeverage', () => {
		expect(resolveEffectiveLeverage(50, btc)).toBe(25);
		expect(resolveEffectiveLeverage(10, btc)).toBe(10);
	});

	test('passes through when the market has no maxLeverage metadata', () => {
		const noMax = { ...btc, maxLeverage: undefined };
		expect(resolveEffectiveLeverage(50, noMax)).toBe(50);
	});

	test('invalid inputs yield 0 (mirrors the store short-circuit)', () => {
		expect(resolveEffectiveLeverage(0, btc)).toBe(0);
		expect(resolveEffectiveLeverage(-3, btc)).toBe(0);
		expect(resolveEffectiveLeverage(NaN, btc)).toBe(0);
	});

	test('buildOrderPayload reports the effective leverage companion', () => {
		expect(buildOrderPayload({ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000, leverage: 50 }).leverage).toBe(25);
		expect(buildOrderPayload({ market: spot, side: 'buy', orderType: 'limit', size: 1, limitPrice: 0.5, leverage: 50 }).leverage).toBe(1);
	});
});

describe('evaluateSubmitGuards — config gates fail closed', () => {
	test('happy path limit order: no blocks, no confirmations', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000, tif: 'Gtc' },
			openWithCaps,
			{ network: 'testnet' }
		);
		expect(r.blocked).toBe(false);
		expect(r.requiresConfirmation).toBe(false);
		expect(r.reasons).toEqual([]);
	});

	test('kill switch is a hard KILL_SWITCH block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 },
			open,
			{ network: 'testnet', killSwitch: 'true' }
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'KILL_SWITCH' }));
		expect(r.reasons[0].message).toContain('kill switch');
	});

	test('false / undefined kill switch stays open', () => {
		expect(
			evaluateSubmitGuards({ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 }, open, {
				network: 'testnet',
				killSwitch: 'false'
			}).blocked
		).toBe(false);
	});

	test('mainnet without the exact ACK is a hard MAINNET_ACK block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 },
			open,
			{ network: 'mainnet', mainnetAck: '' }
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'MAINNET_ACK' }));
		expect(r.reasons[0].message).toContain('Mainnet is locked');
	});

	test('mainnet with the certified ACK passes', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 },
			open,
			{ network: 'mainnet', mainnetAck: MAINNET_ACK }
		);
		expect(r.reasons.some((x) => x.code === 'MAINNET_ACK')).toBe(false);
		expect(r.blocked).toBe(false);
	});

	test('locked vault is a VAULT_LOCKED block with the unlock CTA message', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 },
			{ unlocked: false },
			{ network: 'testnet' }
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons[0]).toEqual({ code: 'VAULT_LOCKED', message: expect.stringContaining('Unlock the agent vault') });
	});

	test('missing market short-circuits with NO_MARKET', () => {
		const r = evaluateSubmitGuards({ market: null, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 }, open, {});
		expect(r.blocked).toBe(true);
		expect(r.reasons).toEqual([{ code: 'NO_MARKET', message: 'No market selected' }]);
	});
});

describe('evaluateSubmitGuards — increment violations block, never round silently', () => {
	test('size off szDecimals is a LOT_SIZE block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.1234567, limitPrice: 50000 },
			open,
			{}
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'LOT_SIZE' }));
		expect(r.reasons.find((x) => x.code === 'LOT_SIZE').message).toContain('lot size');
	});

	test('price off the venue tick is a TICK_SIZE block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 61965.54 },
			open,
			{}
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'TICK_SIZE' }));
	});

	test('non-positive size and price map to LOT_SIZE / TICK_SIZE', () => {
		expect(
			evaluateSubmitGuards({ market: btc, side: 'buy', orderType: 'limit', size: 0, limitPrice: 50000 }, open, {}).reasons[0].code
		).toBe('LOT_SIZE');
		expect(
			evaluateSubmitGuards({ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: -1 }, open, {}).reasons[0].code
		).toBe('TICK_SIZE');
	});

	test('stop without a trigger is a TRIGGER_INVALID block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'sell', orderType: 'stop', size: 0.01, limitPrice: 49000, triggerPrice: 0 },
			open,
			{}
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'TRIGGER_INVALID' }));
	});

	test('stop with an off-tick trigger is TRIGGER_INVALID', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'sell', orderType: 'stop', size: 0.01, limitPrice: 49000, triggerPrice: 49500.123 },
			open,
			{}
		);
		expect(r.reasons.some((x) => x.code === 'TRIGGER_INVALID')).toBe(true);
	});

	test('stop_limit passes when trigger and limit are both valid', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'sell', orderType: 'stop_limit', size: 0.01, limitPrice: 49000, triggerPrice: 49500 },
			open,
			{}
		);
		expect(r.blocked).toBe(false);
	});

	test('Alo on a non-limit order is a FLAG_CONFLICT block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'stop', size: 0.01, limitPrice: 49000, triggerPrice: 49500, tif: 'Alo' },
			open,
			{}
		);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'FLAG_CONFLICT' }));
		expect(r.reasons.find((x) => x.code === 'FLAG_CONFLICT').message).toContain('Post Only is only valid for limit orders');
	});

	test('quote-size input is resolved before the lot check', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 50000, sizeUnit: 'quote', referencePrice: 50000, limitPrice: 50000 },
			open,
			{}
		);
		expect(r.blocked).toBe(false);
	});

	test('leverage beyond venue max is a hard LEVERAGE block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000, leverage: 50 },
			open,
			{}
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons).toContainEqual({ code: 'LEVERAGE', message: 'Leverage 50 exceeds BTC-USD-PERP venue max 25' });
	});

	test('leverage at or under venue max is not a block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000, leverage: 25 },
			open,
			{}
		);
		expect(r.reasons.some((x) => x.code === 'LEVERAGE')).toBe(false);
	});
});

describe('evaluateSubmitGuards — confirm-then-proceed soft guards', () => {
	test('fat-finger over max order notional is a FAT_FINGER confirmation (not a block)', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 },
			{ unlocked: true, currentSignedSize: '0', fatFingerLimits: { maxOrderNotional: '100', maxPositionNotionalByMarket: {} } },
			{}
		);
		expect(r.blocked).toBe(false);
		expect(r.requiresConfirmation).toBe(true);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'FAT_FINGER' }));
		expect(r.reasons.find((x) => x.code === 'FAT_FINGER').message).toContain('maximum order notional');
	});

	test('fat-finger cap misconfiguration is a hard FAT_FINGER block', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000 },
			{ unlocked: true, currentSignedSize: '0', fatFingerLimits: { maxOrderNotional: '0', maxPositionNotionalByMarket: {} } },
			{}
		);
		expect(r.blocked).toBe(true);
		expect(r.reasons.find((x) => x.code === 'FAT_FINGER').message).toContain('Set a positive');
	});

	test('price deviation beyond ±3% is a PRICE_DEVIATION confirmation', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 52000, referencePrice: 50000 },
			open,
			{}
		);
		expect(r.blocked).toBe(false);
		expect(r.requiresConfirmation).toBe(true);
		expect(r.reasons).toContainEqual(expect.objectContaining({ code: 'PRICE_DEVIATION' }));
	});

	test('price within ±3% needs no confirmation', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 51000, referencePrice: 50000 },
			open,
			{}
		);
		expect(r.requiresConfirmation).toBe(false);
	});

	test('market orders never confirm price deviation (server applies the buffer)', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'market', size: 0.01, limitPrice: 60000, referencePrice: 50000 },
			open,
			{}
		);
		expect(r.reasons.some((x) => x.code === 'PRICE_DEVIATION')).toBe(false);
	});

	test('multiple reasons accumulate with distinct codes', () => {
		const r = evaluateSubmitGuards(
			{ market: btc, side: 'buy', orderType: 'limit', size: 0.1234567, limitPrice: 61965.54 },
			open,
			{ network: 'testnet', killSwitch: 'true' }
		);
		expect(r.blocked).toBe(true);
		const codes = r.reasons.map((x) => x.code);
		expect(codes).toContain('KILL_SWITCH');
		expect(codes).toContain('LOT_SIZE');
		expect(codes).toContain('TICK_SIZE');
	});

	test('agrees with evaluateTicketGuards on overlapping inputs', () => {
		const input = { market: btc, side: 'buy', orderType: 'limit', size: 0.01, limitPrice: 50000, tif: 'Gtc' };
		const composed = evaluateSubmitGuards(input, openWithCaps, { network: 'testnet' });
		const existing = evaluateTicketGuards({
			network: 'testnet',
			killSwitch: false,
			unlocked: true,
			orderType: 'limit',
			side: 'buy',
			size: 0.01,
			price: 50000,
			postOnly: false,
			ioc: false,
			market: btc,
			fatFingerLimits: openWithCaps.fatFingerLimits,
			currentSignedSize: '0',
			referencePrice: 50000
		});
		expect(composed.blocked).toBe(existing.blocks.length > 0 || existing.disabled);
		expect(composed.requiresConfirmation).toBe(existing.confirmations.length > 0);
	});
});

describe('resolveTradingMode — fail-closed env resolution', () => {
	test('empty env resolves to open testnet (the certified default)', () => {
		expect(resolveTradingMode({})).toEqual({ network: 'testnet', submitAllowed: true, disabledReason: null });
	});

	test('explicit testnet network stays open', () => {
		expect(resolveTradingMode({ VITE_HL_NETWORK: 'testnet' }).submitAllowed).toBe(true);
	});

	test('kill switch closes submit with the release message', () => {
		const r = resolveTradingMode({ VITE_HL_TRADING_KILL_SWITCH: 'true' });
		expect(r.submitAllowed).toBe(false);
		expect(r.disabledReason).toContain('kill switch');
	});

	test('mainnet without ACK is closed; with the exact ACK it opens', () => {
		const closed = resolveTradingMode({ VITE_HL_NETWORK: 'mainnet' });
		expect(closed.submitAllowed).toBe(false);
		expect(closed.disabledReason).toContain('Mainnet is locked');
		const open_ = resolveTradingMode({ VITE_HL_NETWORK: 'mainnet', VITE_HL_MAINNET_ACK: MAINNET_ACK });
		expect(open_.submitAllowed).toBe(true);
		expect(open_.network).toBe('mainnet');
	});

	test('legacy VITE_HL_TESTNET=false selects mainnet and still gates on ACK', () => {
		const r = resolveTradingMode({ VITE_HL_TESTNET: 'false' });
		expect(r.network).toBe('mainnet');
		expect(r.submitAllowed).toBe(false);
	});

	test('malformed network env fails closed', () => {
		const r = resolveTradingMode({ VITE_HL_NETWORK: 'moonnet' });
		expect(r.submitAllowed).toBe(false);
		expect(r.disabledReason).toContain('Invalid Hyperliquid network');
	});
});

describe('normalizeSidecarError — structured, verbatim, never generic', () => {
	test('locked vault error becomes LOCKED_VAULT with message preserved', () => {
		const r = normalizeSidecarError(new Error('Secure trading is locked. Unlock the agent vault first.'));
		expect(r.code).toBe('LOCKED_VAULT');
		expect(r.message).toBe('Secure trading is locked. Unlock the agent vault first.');
	});

	test('lock text inside an ExecutionRouteResult body is classified the same', () => {
		const r = normalizeSidecarError({ ok: false, error: 'Secure trading is locked. Unlock the agent vault first.' });
		expect(r.code).toBe('LOCKED_VAULT');
	});

	test('raw string input is handled', () => {
		expect(normalizeSidecarError('Secure trading is locked. Unlock the agent vault first.').code).toBe('LOCKED_VAULT');
	});

	test('HTTP 401 body maps to UNAUTHORIZED', () => {
		const r = normalizeSidecarError({ error: 'unauthorized' });
		expect(r.code).toBe('UNAUTHORIZED');
		expect(r.message).toBe('unauthorized');
	});

	test('kill-switch message maps to KILL_SWITCH', () => {
		const r = normalizeSidecarError({ ok: false, error: 'Trading is halted by the testnet release kill switch. Cancel and reconciliation remain available.' });
		expect(r.code).toBe('KILL_SWITCH');
	});

	test('venue text is preserved verbatim, never collapsed to generic', () => {
		const venueMsg = 'Insufficient margin: 3.2 BTC > available 1.5 BTC (err code 52217)';
		const r = normalizeSidecarError({ ok: false, error: venueMsg });
		expect(r.code).toBe('EXECUTION');
		expect(r.message).toBe(venueMsg);
	});

	test('structured detail is carried through', () => {
		const r = normalizeSidecarError({ ok: false, error: 'cancel plan partial', detail: { targets: 3, outcomes: [] } });
		expect(r.details).toEqual({ targets: 3, outcomes: [] });
	});

	test('rejected ack detail is carried through', () => {
		const r = normalizeSidecarError({ ok: false, error: 'venue rejected', ack: { accepted: false } });
		expect(r.details).toEqual({ accepted: false });
	});

	test('success input maps to OK without inventing an error', () => {
		const r = normalizeSidecarError({ ok: true, ack: { accepted: true } });
		expect(r.code).toBe('OK');
	});

	test('empty input stays honest, not generic', () => {
		const r = normalizeSidecarError(undefined);
		expect(r.code).toBe('EXECUTION');
		expect(r.message).toContain('no message');
	});
});
