import { json } from '@sveltejs/kit';


const MAINNET_ACK = 'I_ACCEPT_REAL_MAINNET_TRADING';
const RELEASE_SHA = /^[a-f0-9]{40}$/i;
const HL_INFO_URL = 'https://api.hyperliquid.xyz/info';
const PROBE_TIMEOUT_MS = 3_000;

type HealthCheck = {
	ok: boolean;
	skipped?: boolean;
};

function configured(value: string | undefined): boolean {
	return Boolean(value?.trim());
}

async function probeJson(url: string, body: unknown, token?: string): Promise<boolean> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				accept: 'application/json',
				...(token ? { authorization: `Bearer ${token}` } : {})
			},
			body: JSON.stringify(body),
			signal: controller.signal,
			cache: 'no-store'
		});
		if (!response.ok) return false;
		const value = await response.json() as unknown;
		return Boolean(value && typeof value === 'object' && Object.keys(value).length > 0);
	} catch {
		return false;
	} finally {
		clearTimeout(timeout);
	}
}

async function redisCheck(required: boolean): Promise<HealthCheck> {
	if (!required) return { ok: true, skipped: true };
	const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url || !token) return { ok: false };
	return { ok: await probeJson(url, ['PING'], token) };
}

async function publicMarketApiCheck(): Promise<HealthCheck> {
	return { ok: await probeJson(HL_INFO_URL, { type: 'allMids' }) };
}

function responseHeaders(): HeadersInit {
	return { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
}

export const GET = async () => {
	const betaRequired = process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() === 'true';
	const tradingNetwork = process.env.VITE_HL_TRADING_NETWORK?.trim().toLowerCase() ?? '';
	const mainnetAck = process.env.VITE_HL_MAINNET_ACK?.trim() ?? '';
	const releaseSha = process.env.VICE_RELEASE_SHA?.trim() ?? '';
	const releaseBuild = process.env.VICE_MAINNET_RELEASE_BUILD?.trim() ?? '';
	const betaStore = await redisCheck(betaRequired);
	const checks: Record<string, HealthCheck> = {
		mainnetConfiguration: { ok: tradingNetwork === 'mainnet' && mainnetAck === MAINNET_ACK },
		releaseIdentity: { ok: RELEASE_SHA.test(releaseSha) && releaseSha.toLowerCase() === releaseBuild.toLowerCase() },
		betaConfiguration: {
			ok: betaRequired &&
				configured(process.env.VICE_BETA_SESSION_SECRET) &&
				configured(process.env.UPSTASH_REDIS_REST_URL) &&
				configured(process.env.UPSTASH_REDIS_REST_TOKEN)
		},
		betaStore,
		publicMarketApi: await publicMarketApiCheck()
	};
	const ok = Object.values(checks).every((check) => check.ok);
	console.log(JSON.stringify({ event: 'health_probe', ok, checks: Object.fromEntries(Object.entries(checks).map(([name, check]) => [name, check.ok])) }));
	return json({
		ok,
		service: 'vice-terminal',
		network: 'mainnet',
		releaseBuild: releaseBuild || null,
		checks,
		observedAt: new Date().toISOString()
	}, { status: ok ? 200 : 503, headers: responseHeaders() });
};
