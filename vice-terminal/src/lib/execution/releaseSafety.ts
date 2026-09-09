import { writable, get } from 'svelte/store';
import { hyperliquidNetwork } from '$lib/hl/network';

export const remoteReleaseHalted = writable(false);
let policyTimer: ReturnType<typeof setInterval> | null = null;

export function tradingKillSwitchActive(flag = import.meta.env.VITE_HL_TRADING_KILL_SWITCH): boolean {
	return flag === 'true' || get(remoteReleaseHalted);
}
export function tradingKillSwitchMessage(): string {
	return `Trading is halted by the ${hyperliquidNetwork.network} release policy kill switch. Cancel and reconciliation remain available.`;
}
export function assertTradingAllowed(flag = import.meta.env.VITE_HL_TRADING_KILL_SWITCH, risk: 'increase' | 'reduce' = 'increase'): void {
	if (risk === 'increase' && tradingKillSwitchActive(flag)) throw new Error(tradingKillSwitchMessage());
}
export function assertFreshExecutionState(connected: boolean, accountStatus: string, marketStatus: string): void {
	if (!connected || accountStatus !== 'live') throw new Error('Trading is paused until the authoritative account snapshot is live.');
	if (marketStatus !== 'live') throw new Error('Trading is paused until the selected market feed is live.');
}
export function setRemoteReleaseHalt(halted: boolean): void {
	const wasHalted = get(remoteReleaseHalted);
	remoteReleaseHalted.set(halted);
	if (halted && !wasHalted) {
		void import('./scale').then(({ stopAllScaleTimers }) => stopAllScaleTimers());
		if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('vice:release-halt'));
	}
}
export function startReleasePolicyMonitor(wallet: string, intervalMs = 5_000): () => void {
	// Release policy is a mainnet entitlement boundary. Testnet execution is
	// intentionally local and must not be halted just because the production
	// policy endpoint is absent in local development.
	if (hyperliquidNetwork.network !== 'mainnet') {
		stopReleasePolicyMonitor();
		setRemoteReleaseHalt(false);
		return () => undefined;
	}
	if (typeof window === 'undefined') return () => undefined;
	const poll = async () => {
		try {
			const response = await fetch(`/api/release-policy?wallet=${encodeURIComponent(wallet)}`, { cache: 'no-store' });
			if (!response.ok) {
				setRemoteReleaseHalt(true);
				return;
			}
			const policy = await response.json() as { halted?: boolean; expiresAt?: number };
			setRemoteReleaseHalt(policy.halted === true || !Number.isFinite(policy.expiresAt) || (policy.expiresAt as number) <= Date.now());
		} catch {
			setRemoteReleaseHalt(true);
		}
	};
	void poll();
	if (policyTimer) clearInterval(policyTimer);
	policyTimer = setInterval(() => void poll(), intervalMs);
	return () => stopReleasePolicyMonitor();
}
export function stopReleasePolicyMonitor(): void {
	if (policyTimer) clearInterval(policyTimer);
	policyTimer = null;
}
