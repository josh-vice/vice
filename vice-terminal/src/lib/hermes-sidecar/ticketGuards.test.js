// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import {
	MAINNET_ACK,
	PRICE_DEVIATION_RATIO,
	baseSizeFromAmount,
	evaluateTicketGuards,
	isKillSwitchActive,
	lotSizeBlock,
	mainnetSubmitBlock,
	priceDeviationConfirmation,
	tickSizeBlock,
	tifToFlags,
	tradingKillSwitchMessage,
	vaultLockedMessage
} from './ticketGuards.ts';

const btc = {
	symbol: 'BTC-USD-PERP',
	marketKey: 'HL:perp:BTC',
	szDecimals: 5,
	priceDecimals: 1,
	lastPrice: 50000,
	markPrice: 50000
};

describe('ticketGuards — kill switch + mainnet ACK', () => {
	test('kill switch only trips on the certified true string/boolean', () => {
		expect(isKillSwitchActive(true)).toBe(true);
		expect(isKillSwitchActive('true')).toBe(true);
		expect(isKillSwitchActive('false')).toBe(false);
		expect(isKillSwitchActive(false)).toBe(false);
		expect(isKillSwitchActive(undefined)).toBe(false);
		expect(tradingKillSwitchMessage('testnet')).toContain('testnet release kill switch');
	});

	test('mainnet submit is fail-closed without the exact ACK', () => {
		expect(mainnetSubmitBlock('testnet', '')).toBeUndefined();
		expect(mainnetSubmitBlock('mainnet', '')).toBe(
			`Mainnet is locked. Set VITE_HL_MAINNET_ACK=${MAINNET_ACK} only after testnet release gates pass.`
		);
		expect(mainnetSubmitBlock('mainnet', 'yes')).toContain('Mainnet is locked');
		expect(mainnetSubmitBlock('mainnet', MAINNET_ACK)).toBeUndefined();
	});
});

describe('ticketGuards — tick / lot size blocks (no silent round)', () => {
	test('accepts on-increment size and price', () => {
		expect(lotSizeBlock(0.12346, btc)).toBeUndefined();
		// 5 significant figures + priceDecimals=1 — whole ticks only at this magnitude.
		expect(tickSizeBlock(50000, btc)).toBeUndefined();
		expect(tickSizeBlock(50001, btc)).toBeUndefined();
	});

	test('blocks size that would need rounding to szDecimals', () => {
		const err = lotSizeBlock(0.1234567, btc);
		expect(err).toBeString();
		expect(err).toContain('lot size');
	});

	test('blocks price that is not on a valid tick / 5-sig venue format', () => {
		// 61965.54 formats to 61966 under certified venueFormat — must block.
		const err = tickSizeBlock(61965.54, btc);
		expect(err).toBeString();
		expect(err).toContain('tick');
	});

	test('rejects non-positive size and price', () => {
		expect(lotSizeBlock(0, btc)).toContain('positive');
		expect(tickSizeBlock(-1, btc)).toContain('positive');
	});
});

describe('ticketGuards — price deviation confirmation (±3% certified buffer)', () => {
	test('uses the certified market buffer ratio', () => {
		expect(PRICE_DEVIATION_RATIO).toBe(0.03);
	});

	test('does not confirm market orders (server applies the buffer)', () => {
		expect(priceDeviationConfirmation(60000, 50000, 'market')).toBeUndefined();
	});

	test('confirms limit prices beyond ±3% of reference', () => {
		const msg = priceDeviationConfirmation(52000, 50000, 'limit');
		expect(msg).toBeString();
		expect(msg).toContain('4.00%');
		expect(priceDeviationConfirmation(51000, 50000, 'limit')).toBeUndefined();
	});
});

describe('ticketGuards — amount unit + tif mapping', () => {
	test('converts quote notional to base size', () => {
		expect(baseSizeFromAmount(1, 'base', 50000)).toBe(1);
		expect(baseSizeFromAmount(50000, 'quote', 50000)).toBe(1);
		expect(baseSizeFromAmount(100, 'quote', 0)).toBe(0);
	});

	test('maps TIF onto postOnly/ioc; market forces IOC', () => {
		expect(tifToFlags('Gtc', 'limit')).toEqual({ postOnly: false, ioc: false });
		expect(tifToFlags('Ioc', 'limit')).toEqual({ postOnly: false, ioc: true });
		expect(tifToFlags('Alo', 'limit')).toEqual({ postOnly: true, ioc: false });
		expect(tifToFlags('Gtc', 'market')).toEqual({ postOnly: false, ioc: true });
	});
});

describe('ticketGuards — evaluateTicketGuards integration', () => {
	test('disables on kill switch and never clears the reason', () => {
		const r = evaluateTicketGuards({
			network: 'testnet',
			killSwitch: true,
			unlocked: true,
			orderType: 'limit',
			side: 'buy',
			size: 0.01,
			price: 50000,
			market: btc
		});
		expect(r.disabled).toBe(true);
		expect(r.disabledReason).toContain('kill switch');
		expect(r.blocks.some((b) => b.includes('kill switch'))).toBe(true);
	});

	test('disables on locked vault with unlock prompt (not a raw error)', () => {
		const r = evaluateTicketGuards({
			network: 'testnet',
			killSwitch: false,
			unlocked: false,
			orderType: 'market',
			side: 'buy',
			size: 0.01,
			price: 50000,
			market: btc
		});
		expect(r.disabled).toBe(true);
		expect(r.disabledReason).toBe(vaultLockedMessage());
	});

	test('blocks mainnet without ACK even when unlocked', () => {
		const r = evaluateTicketGuards({
			network: 'mainnet',
			mainnetAck: '',
			killSwitch: false,
			unlocked: true,
			orderType: 'limit',
			side: 'buy',
			size: 0.01,
			price: 50000,
			market: btc
		});
		expect(r.disabled).toBe(true);
		expect(r.blocks.some((b) => b.includes('Mainnet is locked'))).toBe(true);
	});

	test('blocks post-only + IOC and surfaces fat-finger confirmation', () => {
		const r = evaluateTicketGuards({
			network: 'testnet',
			killSwitch: false,
			unlocked: true,
			orderType: 'limit',
			side: 'buy',
			size: 0.01,
			price: 50000,
			postOnly: true,
			ioc: true,
			market: btc,
			fatFingerLimits: { maxOrderNotional: '100', maxPositionNotionalByMarket: {} },
			currentSignedSize: '0'
		});
		expect(r.blocks).toContain('Post Only and IOC cannot be enabled together');
		// 0.01 * 50000 = 500 > 100 → fat-finger confirmation
		expect(r.confirmations.some((c) => c.includes('maximum order notional'))).toBe(true);
	});

	test('happy path limit order yields no blocks', () => {
		const r = evaluateTicketGuards({
			network: 'testnet',
			mainnetAck: '',
			killSwitch: false,
			unlocked: true,
			orderType: 'limit',
			side: 'buy',
			size: 0.01,
			price: 50000,
			postOnly: true,
			ioc: false,
			market: btc,
			fatFingerLimits: { maxOrderNotional: '', maxPositionNotionalByMarket: {} },
			referencePrice: 50000
		});
		expect(r.blocks).toEqual([]);
		expect(r.disabled).toBe(false);
		expect(r.formattedSize).toBe('0.01');
		expect(r.formattedPrice).toBe('50000');
	});

	test('stop requires a positive trigger on a valid tick', () => {
		const r = evaluateTicketGuards({
			network: 'testnet',
			killSwitch: false,
			unlocked: true,
			orderType: 'stop',
			side: 'sell',
			size: 0.01,
			price: 50000,
			triggerPrice: 0,
			market: btc
		});
		expect(r.blocks.some((b) => b.toLowerCase().includes('trigger'))).toBe(true);
	});
});
