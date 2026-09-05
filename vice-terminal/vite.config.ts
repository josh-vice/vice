import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type ConfigEnv, type Plugin } from 'vite';

const MAINNET_ACK = 'I_ACCEPT_REAL_MAINNET_TRADING';

function mainnetBuildGuard(): Plugin {
	return {
		name: 'vice-mainnet-build-guard',
		config(_config, env: ConfigEnv) {
			if (env.command !== 'build' || env.mode !== 'production') return;
			const loaded = loadEnv(env.mode, process.cwd(), 'VITE_');
			const network = (process.env.VITE_HL_TRADING_NETWORK ?? loaded.VITE_HL_TRADING_NETWORK ?? '').trim().toLowerCase();
			const ack = process.env.VITE_HL_MAINNET_ACK ?? loaded.VITE_HL_MAINNET_ACK ?? '';
			if (network !== 'mainnet' || ack !== MAINNET_ACK) {
				throw new Error(`Production build locked: set VITE_HL_TRADING_NETWORK=mainnet and VITE_HL_MAINNET_ACK=${MAINNET_ACK}`);
			}
		}
	};
}

export default defineConfig({
	plugins: [mainnetBuildGuard(), sveltekit()],
	server: {
		fs: {
			allow: ['.']
		}
	}
});
