import type { OrderType } from '$lib/types';

const ADVANCED_ORDER_TYPES = new Set<OrderType>([
	'bracket',
	'twap',
	'adaptive_twap',
	'vwap',
	'pov',
	'scale',
	'chase',
	'swarm',
	'iceberg',
	'oco',
	'ping_pong',
	'trailing_stop',
	'break_even',
	'maker',
	'conditional_ladder'
]);

const CERTIFICATION_ENV_KEYS: Partial<Record<OrderType, string>> = {
	bracket: 'VITE_HL_CERTIFIED_BRACKET',
	twap: 'VITE_HL_CERTIFIED_TWAP',
	adaptive_twap: 'VITE_HL_CERTIFIED_ADAPTIVE_TWAP',
	vwap: 'VITE_HL_CERTIFIED_VWAP',
	pov: 'VITE_HL_CERTIFIED_POV',
	scale: 'VITE_HL_CERTIFIED_SCALE',
	chase: 'VITE_HL_CERTIFIED_CHASE',
	swarm: 'VITE_HL_CERTIFIED_SWARM',
	iceberg: 'VITE_HL_CERTIFIED_ICEBERG',
	oco: 'VITE_HL_CERTIFIED_OCO',
	ping_pong: 'VITE_HL_CERTIFIED_PING_PONG',
	trailing_stop: 'VITE_HL_CERTIFIED_TRAILING_STOP',
	break_even: 'VITE_HL_CERTIFIED_BREAK_EVEN',
	maker: 'VITE_HL_CERTIFIED_MAKER',
	conditional_ladder: 'VITE_HL_CERTIFIED_CONDITIONAL_LADDER'
};

/**
 * Advanced order types are a release capability, not a UI preference. The
 * global flag is a release kill-switch; every advanced family must also have
 * its own funded-testnet certification flag. Mainnet beta builds keep every
 * advanced family disabled until a release-specific evidence binding exists.
 */
export function isAdvancedOrderCertified(
	type: OrderType,
	flag = import.meta.env.VITE_HL_CERTIFIED_ADVANCED_ORDERS,
	typeFlag = certificationFlag(type)
): boolean {
	if (!ADVANCED_ORDER_TYPES.has(type)) return true;
	const network = import.meta.env.VITE_HL_TRADING_NETWORK ?? (import.meta.env.VITE_HL_NETWORK === 'mainnet' ? 'mainnet' : 'testnet');
	if (network === 'mainnet') return false;
	return flag === 'true' && typeFlag === 'true';
}

export function certificationEnvKey(type: OrderType): string | undefined {
	return CERTIFICATION_ENV_KEYS[type];
}

function certificationFlag(type: OrderType): string | undefined {
	const key = certificationEnvKey(type);
	if (!key) return undefined;
	return (import.meta.env as Record<string, string | undefined>)[key];
}

export function unavailableOrderTypeMessage(type: OrderType): string {
	return `${type} is unavailable until its funded-mainnet lifecycle and reconnect certification passes`;
}

export function advancedOrderTypes(): OrderType[] {
	return [...ADVANCED_ORDER_TYPES];
}
