import { isAddress } from 'viem';
import type { EIP1193Provider } from 'viem';

export type DiscoveredWallet = {
	provider: EIP1193Provider;
	name: string;
	icon?: string;
	rdns?: string;
	uuid?: string;
};

type Eip6963Announcement = { info?: { name?: unknown; icon?: unknown; rdns?: unknown; uuid?: unknown }; provider?: unknown };

type EthereumWindow = Window & {
	ethereum?: EIP1193Provider & { providers?: EIP1193Provider[]; isMetaMask?: boolean; isRabby?: boolean; isCoinbaseWallet?: boolean; isBraveWallet?: boolean };
};

function legacyName(provider: EIP1193Provider): string {
	const candidate = provider as EthereumWindow['ethereum'];
	if (candidate?.isRabby) return 'Rabby';
	if (candidate?.isCoinbaseWallet) return 'Coinbase Wallet';
	if (candidate?.isBraveWallet) return 'Brave Wallet';
	if (candidate?.isMetaMask) return 'MetaMask';
	return 'Browser wallet';
}

function isProvider(value: unknown): value is EIP1193Provider {
	return Boolean(value && typeof value === 'object' && 'request' in value && typeof value.request === 'function');
}

/** Discover EIP-6963 wallets plus legacy window.ethereum providers. */
export async function discoverWalletProviders(timeoutMs = 750): Promise<DiscoveredWallet[]> {
	if (typeof window === 'undefined') return [];
	const ethereumWindow = window as EthereumWindow;
	const discovered: DiscoveredWallet[] = [];
	const seen = new Set<EIP1193Provider>();
	const add = (wallet: DiscoveredWallet) => {
		if (!isProvider(wallet.provider) || seen.has(wallet.provider)) return;
		seen.add(wallet.provider);
		discovered.push(wallet);
	};
	const announce = (event: Event) => {
		const detail = (event as CustomEvent<Eip6963Announcement>).detail;
		if (!detail || !isProvider(detail.provider)) return;
		add({
			provider: detail.provider,
			name: typeof detail.info?.name === 'string' && detail.info.name ? detail.info.name : 'Browser wallet',
			icon: typeof detail.info?.icon === 'string' ? detail.info.icon : undefined,
			rdns: typeof detail.info?.rdns === 'string' ? detail.info.rdns : undefined,
			uuid: typeof detail.info?.uuid === 'string' ? detail.info.uuid : undefined
		});
	};
	window.addEventListener('eip6963:announceProvider', announce);
	try {
		window.dispatchEvent(new Event('eip6963:requestProvider'));
		await new Promise((resolve) => setTimeout(resolve, Math.max(0, timeoutMs)));
	} finally {
		window.removeEventListener('eip6963:announceProvider', announce);
	}
	for (const provider of ethereumWindow.ethereum?.providers ?? []) add({ provider, name: legacyName(provider) });
	if (ethereumWindow.ethereum) add({ provider: ethereumWindow.ethereum, name: legacyName(ethereumWindow.ethereum) });
	return discovered;
}

export async function requestWalletAccounts(provider: EIP1193Provider): Promise<string[]> {
	const accounts = await provider.request({ method: 'eth_requestAccounts' });
	if (!Array.isArray(accounts) || accounts.some((account) => typeof account !== 'string' || !isAddress(account))) throw new Error('Wallet returned an invalid EVM account list');
	return accounts;
}
