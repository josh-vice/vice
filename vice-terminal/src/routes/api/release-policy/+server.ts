import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import type { VenueId } from '$lib/venue/identity';
import { betaIdentity } from '$lib/server/betaAuth';
import { getBetaTester } from '$lib/server/betaStore';
type PolicyRecord = {
	releaseBuild: string;
	network: 'mainnet';
	enabled: boolean;
	halted: boolean;
	policyVersion: string;
	allowedActionIds: string[];
	allowedOrderFamilies: string[];
	allowedVenues: VenueId[];
	allowedWallets: string[];
	perOrderCapUsd: string;
	aggregateCapUsd: string;
	expiresAt: number;
	approvalSha256: string;
	updatedAt: number;
};
const SHA256 = /^[a-f0-9]{64}$/i;
const RELEASE_SHA = /^[a-f0-9]{40}$/i;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function normalizeWallet(value: string): string | null {
	const wallet = value.trim().toLowerCase();
	return /^0x[a-f0-9]{40}$/.test(wallet) ? wallet : null;
}
function validatePolicy(policy: PolicyRecord): PolicyRecord {
	if (!RELEASE_SHA.test(policy.releaseBuild) || policy.network !== 'mainnet' || typeof policy.enabled !== 'boolean' || typeof policy.halted !== 'boolean' || !policy.policyVersion.trim()) throw new Error('release policy is malformed');
	if (!Array.isArray(policy.allowedActionIds) || !Array.isArray(policy.allowedOrderFamilies) || !Array.isArray(policy.allowedVenues) || !Array.isArray(policy.allowedWallets)) throw new Error('release policy is malformed');
	const wallets = policy.allowedWallets.map(normalizeWallet);
	if (wallets.some((wallet) => wallet === null) || new Set(wallets).size !== wallets.length) throw new Error('release policy wallet allowlist is malformed');
	if (!DECIMAL.test(policy.perOrderCapUsd) || !DECIMAL.test(policy.aggregateCapUsd) || policy.aggregateCapUsd === '0' || !Number.isSafeInteger(policy.expiresAt) || !Number.isSafeInteger(policy.updatedAt) || !SHA256.test(policy.approvalSha256)) throw new Error('release policy is malformed');
	return { ...policy, allowedWallets: wallets as string[] };
}
async function loadPolicy(): Promise<PolicyRecord> {
	const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	let raw = '';
	if (redisUrl && redisToken) {
		const response = await fetch(redisUrl, { method: 'POST', headers: { authorization: `Bearer ${redisToken}`, 'content-type': 'application/json' }, body: JSON.stringify(['GET', 'vice:release-policy:active']) });
		if (!response.ok) throw new Error('release policy store unavailable');
		const body = await response.json() as { result?: unknown };
		if (typeof body.result === 'string') raw = body.result;
	} else if (process.env.NODE_ENV !== 'production' && process.env.VICE_RELEASE_POLICY_JSON?.trim()) {
		raw = process.env.VICE_RELEASE_POLICY_JSON.trim();
	}
	if (!raw) throw new Error('durable release policy is required');
	return validatePolicy(JSON.parse(raw) as PolicyRecord);
}
function responseHeaders(): HeadersInit {
	return { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const wallet = normalizeWallet(url.searchParams.get('wallet') ?? '');
		if (!wallet) return json({ ok: false, error: 'invalid_wallet' }, { status: 400, headers: responseHeaders() });
		if (process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() === 'true') {
			const identity = await betaIdentity(cookies);
			if (!identity?.testerId) return json({ ok: false, error: 'beta_auth_required' }, { status: 401, headers: responseHeaders() });
			const tester = await getBetaTester(identity.testerId);
			if (!tester || tester.status !== 'active' || !tester.wallets.includes(wallet)) return json({ ok: false, error: 'policy_denied' }, { status: 403, headers: responseHeaders() });
		}
		const policy = await loadPolicy();
		const walletAllowed = policy.allowedWallets.includes(wallet) && policy.expiresAt > Date.now();
		const halted = policy.halted || !policy.enabled || policy.expiresAt <= Date.now();
		return json({
			releaseBuild: policy.releaseBuild,
			policyVersion: policy.policyVersion,
			network: policy.network,
			walletAllowed,
			allowedActionIds: walletAllowed ? policy.allowedActionIds : [],
			allowedVenues: walletAllowed ? policy.allowedVenues : [],
			allowedOrderFamilies: walletAllowed ? policy.allowedOrderFamilies : [],
			perOrderCapUsd: policy.perOrderCapUsd,
			aggregateCapUsd: policy.aggregateCapUsd,
			halted,
			mode: halted ? 'reduce-risk-only' : 'full',
			issuedAt: policy.updatedAt,
			expiresAt: policy.expiresAt,
			approvalSha256: policy.approvalSha256
		}, { headers: responseHeaders() });
	} catch {
		return json({ ok: false, error: 'release_policy_unavailable' }, { status: 503, headers: responseHeaders() });
	}
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	try {
		const origin = request.headers.get('origin');
		if (origin && origin !== url.origin) return json({ ok: false, error: 'invalid_origin' }, { status: 403, headers: responseHeaders() });
		const body = await request.text();
		if (new TextEncoder().encode(body).byteLength > 512) return json({ ok: false, error: 'invalid_request' }, { status: 400, headers: responseHeaders() });
		const input = JSON.parse(body) as { wallet?: string; releaseBuild?: string; policyVersion?: string; notionalUsd?: string; risk?: string };
		const wallet = normalizeWallet(input.wallet ?? '');
		if (!wallet || !DECIMAL.test(input.notionalUsd ?? '') || input.risk !== 'increase') return json({ ok: false, error: 'invalid_request' }, { status: 400, headers: responseHeaders() });
		if (process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() === 'true') {
			const identity = await betaIdentity(cookies);
			if (!identity?.testerId) return json({ ok: false, error: 'beta_auth_required' }, { status: 401, headers: responseHeaders() });
			const tester = await getBetaTester(identity.testerId);
			if (!tester || tester.status !== 'active' || !tester.wallets.includes(wallet)) return json({ ok: false, error: 'policy_denied' }, { status: 403, headers: responseHeaders() });
		}
		const policy = await loadPolicy();
		if (!policy.enabled || policy.halted || policy.expiresAt <= Date.now() || !policy.allowedWallets.includes(wallet) || input.releaseBuild !== policy.releaseBuild || input.policyVersion !== policy.policyVersion) return json({ ok: false, error: 'policy_denied' }, { status: 403, headers: responseHeaders() });
		const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
		const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
		if (!redisUrl || !redisToken) throw new Error('Redis is required for aggregate cap reservation');
		const key = `vice:release-usage:${policy.releaseBuild}:${wallet}`;
		const script = `local used=tonumber(redis.call('GET',KEYS[1]) or '0'); local next=used+tonumber(ARGV[1]); if next>tonumber(ARGV[2]) then return {0,next} end; redis.call('SET',KEYS[1],tostring(next),'PX',ARGV[3]); return {1,next}`;
		const response = await fetch(redisUrl, { method: 'POST', headers: { authorization: `Bearer ${redisToken}`, 'content-type': 'application/json' }, body: JSON.stringify(['EVAL', script, 1, key, input.notionalUsd, policy.aggregateCapUsd, Math.max(1, policy.expiresAt - Date.now())]) });
		if (!response.ok) throw new Error('release usage store unavailable');
		const result = await response.json() as { result?: unknown };
		if (!Array.isArray(result.result) || Number(result.result[0]) !== 1) return json({ ok: false, error: 'aggregate_cap_exceeded' }, { status: 409, headers: responseHeaders() });
		return json({ ok: true }, { headers: responseHeaders() });
	} catch {
		return json({ ok: false, error: 'release_usage_unavailable' }, { status: 503, headers: responseHeaders() });
	}
};
