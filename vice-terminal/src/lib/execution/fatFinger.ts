import type { OrderSide } from '$lib/types';

const QUOTE_DECIMALS = 8;
const QUOTE_SCALE = 10n ** BigInt(QUOTE_DECIMALS);

export interface FatFingerLimits {
	/** Empty means no per-order cap. Values are quote-currency decimal strings. */
	maxOrderNotional: string;
	/** Exact market-key map. Empty values disable the cap for that market. */
	maxPositionNotionalByMarket: Record<string, string>;
}

export const emptyFatFingerLimits = (): FatFingerLimits => ({
	maxOrderNotional: '',
	maxPositionNotionalByMarket: {}
});

function decimalAtoms(value: string): bigint | null {
	const input = value.trim();
	if (!/^\d+(?:\.\d+)?$/.test(input)) return null;
	const [whole, fraction = ''] = input.split('.');
	if (fraction.length > QUOTE_DECIMALS) return null;
	return BigInt(whole) * QUOTE_SCALE + BigInt((fraction + '0'.repeat(QUOTE_DECIMALS)).slice(0, QUOTE_DECIMALS));
}

function signedDecimalAtoms(value: string): bigint | null {
	const input = value.trim();
	const negative = input.startsWith('-');
	const atoms = decimalAtoms(negative ? input.slice(1) : input);
	return atoms === null ? null : negative ? -atoms : atoms;
}

/**
 * Calculates quote notional without binary floating point. Inputs must already
 * be venue-formatted decimal strings, so this matches the value being signed.
 */
export function quoteNotionalAtoms(price: string, size: string): bigint | null {
	const priceAtoms = decimalAtoms(price);
	const sizeAtoms = decimalAtoms(size);
	if (priceAtoms === null || sizeAtoms === null || priceAtoms <= 0n || sizeAtoms <= 0n) return null;
	const product = priceAtoms * sizeAtoms;
	// Round upward. A cap must never allow a value that the signed decimals exceed.
	return (product + QUOTE_SCALE - 1n) / QUOTE_SCALE;
}

export interface FatFingerCheck {
	marketKey: string;
	price: string;
	size: string;
	side: OrderSide;
	reduceOnly: boolean;
	/** Current signed base size: long is positive, short is negative. */
	currentSignedSize: string;
}

export function validateFatFinger(
	limits: FatFingerLimits,
	check: FatFingerCheck
): string | undefined {
	const orderNotional = quoteNotionalAtoms(check.price, check.size);
	if (orderNotional === null) return 'Order notional cannot be calculated from venue-formatted values';
	const maxOrder = decimalAtoms(limits.maxOrderNotional);
	if (limits.maxOrderNotional.trim() && (maxOrder === null || maxOrder <= 0n)) {
		return 'Set a positive maximum order notional or clear the limit';
	}
	if (maxOrder && orderNotional > maxOrder) return 'Order exceeds your local maximum order notional';

	const configuredPositionCap = limits.maxPositionNotionalByMarket[check.marketKey] ?? '';
	const maxPosition = decimalAtoms(configuredPositionCap);
	if (!configuredPositionCap.trim()) return undefined;
	if (maxPosition === null || maxPosition <= 0n) return 'Set a positive maximum position notional or clear the limit';

	const current = signedDecimalAtoms(check.currentSignedSize);
	const delta = decimalAtoms(check.size);
	if (current === null || delta === null) return 'Position limit cannot be calculated from venue-formatted values';
	const next = current + (check.side === 'buy' ? delta : -delta);
	if (next === 0n) return undefined;
	const nextNotional = quoteNotionalAtoms(check.price, atomsToDecimal(next < 0n ? -next : next));
	if (nextNotional === null) return 'Position limit cannot be calculated from venue-formatted values';
	if (nextNotional > maxPosition) return 'Order exceeds your local maximum position notional for this market';
	return undefined;
}

function atomsToDecimal(atoms: bigint): string {
	const whole = atoms / QUOTE_SCALE;
	const fraction = (atoms % QUOTE_SCALE).toString().padStart(QUOTE_DECIMALS, '0').replace(/0+$/, '');
	return fraction ? `${whole}.${fraction}` : whole.toString();
}
