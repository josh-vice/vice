import { hyperliquidNetwork } from '$lib/hl/network';

export function tradingKillSwitchActive(flag = import.meta.env.VITE_HL_TRADING_KILL_SWITCH): boolean {
	return flag === 'true';
}

export function tradingKillSwitchMessage(): string {
	return `Trading is halted by the ${hyperliquidNetwork.network} release kill switch. Cancel and reconciliation remain available.`;
}

export function assertTradingAllowed(flag = import.meta.env.VITE_HL_TRADING_KILL_SWITCH): void {
	if (tradingKillSwitchActive(flag)) throw new Error(tradingKillSwitchMessage());
}

export function assertFreshExecutionState(
	connected: boolean,
	accountStatus: string,
	marketStatus: string
): void {
	if (!connected || accountStatus !== 'live') {
		throw new Error('Trading is paused until the authoritative account snapshot is live.');
	}
	if (marketStatus !== 'live') {
		throw new Error('Trading is paused until the selected market feed is live.');
	}
}
