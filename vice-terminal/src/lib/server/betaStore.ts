import { createHmac, randomBytes } from 'node:crypto';

export type BetaTesterStatus = 'active' | 'revoked';
export type BetaTesterRecord = {
	testerId: string;
	inviteHash: string;
	wallets: string[];
	sessionVersion: number;
	status: BetaTesterStatus;
	cohort: string;
	expiresAt: number;
	createdAt: number;
	updatedAt: number;
};

const PREFIX = 'vice:beta';
const REQUIRED = 'VICE_BETA_REQUIRED';

function required(): boolean {
	return process.env[REQUIRED]?.trim().toLowerCase() === 'true';
}
function secret(): string {
	return process.env.VICE_BETA_SESSION_SECRET?.trim() ?? '';
}
function config(): { url: string; token: string } {
	const url = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? '';
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? '';
	if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for beta access');
	return { url, token };
}

export function betaStoreConfigured(): boolean {
	return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}
export function assertBetaStoreConfigured(): void {
	if (required() && (!secret() || !betaStoreConfigured())) throw new Error('Durable beta access is misconfigured');
}
export function hashBetaValue(value: string, purpose: 'invite' | 'ip' | 'attempt'): string {
	if (!secret()) throw new Error('VICE_BETA_SESSION_SECRET is required for beta hashing');
	return createHmac('sha256', secret()).update(`${purpose}:`).update(value).digest('hex');
}
export function newBetaInviteCode(): string {
	return randomBytes(24).toString('base64url');
}

async function command(command: string, args: unknown[] = []): Promise<unknown> {
	const { url, token } = config();
	const response = await fetch(url, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify([command, ...args])
	});
	if (!response.ok) throw new Error(`beta store request failed (${response.status})`);
	const body = await response.json() as { result?: unknown; error?: string };
	if (body.error) throw new Error('beta store command failed');
	return body.result;
}

function testerKey(testerId: string): string { return `${PREFIX}:tester:${testerId}`; }
function inviteKey(inviteHash: string): string { return `${PREFIX}:invite:${inviteHash}`; }

export async function getBetaTester(testerId: string): Promise<BetaTesterRecord | null> {
	const raw = await command('GET', [testerKey(testerId)]);
	if (typeof raw !== 'string') return null;
	try { return JSON.parse(raw) as BetaTesterRecord; } catch { return null; }
}
export async function getBetaTesterByInvite(code: string): Promise<BetaTesterRecord | null> {
	const inviteHash = hashBetaValue(code.trim(), 'invite');
	const testerId = await command('GET', [inviteKey(inviteHash)]);
	return typeof testerId === 'string' ? getBetaTester(testerId) : null;
}
export async function putBetaTester(record: BetaTesterRecord): Promise<void> {
	await command('SET', [testerKey(record.testerId), JSON.stringify(record)]);
	await command('SET', [inviteKey(record.inviteHash), record.testerId]);
}
export async function updateBetaTester(testerId: string, update: Partial<BetaTesterRecord>): Promise<BetaTesterRecord> {
	const current = await getBetaTester(testerId);
	if (!current) throw new Error('beta tester not found');
	const next = { ...current, ...update, testerId, updatedAt: Date.now() };
	await putBetaTester(next);
	return next;
}
export async function revokeBetaTester(testerId: string): Promise<void> {
	await updateBetaTester(testerId, { status: 'revoked' });
}
export async function rotateBetaTesterSession(testerId: string): Promise<BetaTesterRecord> {
	const current = await getBetaTester(testerId);
	if (!current) throw new Error('beta tester not found');
	return updateBetaTester(testerId, { sessionVersion: current.sessionVersion + 1 });
}
export async function revokeAllBetaTesters(): Promise<number> {
	const keys = await command('SMEMBERS', [`${PREFIX}:testers`]);
	if (!Array.isArray(keys)) return 0;
	let count = 0;
	for (const testerId of keys) {
		if (typeof testerId !== 'string') continue;
		await revokeBetaTester(testerId);
		count += 1;
	}
	return count;
}
export function normalizeBetaWallet(value: string): string {
	const wallet = value.trim().toLowerCase();
	if (!/^0x[a-f0-9]{40}$/.test(wallet)) throw new Error('beta wallet address is invalid');
	return wallet;
}

export async function recordBetaTester(tester: Omit<BetaTesterRecord, 'createdAt' | 'updatedAt'>): Promise<BetaTesterRecord> {
	const now = Date.now();
	const wallets = tester.wallets.map(normalizeBetaWallet);
	if (new Set(wallets).size !== wallets.length) throw new Error('beta tester wallet addresses must be unique');
	const record = { ...tester, wallets, createdAt: now, updatedAt: now };
	await putBetaTester(record);
	await command('SADD', [`${PREFIX}:testers`, tester.testerId]);
	return record;
}

export async function isBetaSessionActive(identity: { testerId?: string; sessionVersion?: number; expiresAt?: number }): Promise<boolean> {
	if (!identity.testerId || !Number.isInteger(identity.sessionVersion) || !Number.isFinite(identity.expiresAt)) return false;
	// Session tokens carry Unix timestamps in seconds; tester records use
	// milliseconds. Normalize the token boundary before comparing it to now.
	if ((identity.expiresAt as number) * 1_000 <= Date.now()) return false;
	const current = await getBetaTester(identity.testerId);
	return Boolean(current && current.status === 'active' && current.sessionVersion === identity.sessionVersion && current.expiresAt > Date.now());
}
export async function consumeBetaRateLimit(bucket: string, limit: number, windowMs: number, now = Date.now()): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
	if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) throw new Error('Invalid beta rate-limit parameters');
	const key = `${PREFIX}:rate:${bucket}`;
	const script = `
		local key = KEYS[1]
		local now = tonumber(ARGV[1])
		local window = tonumber(ARGV[2])
		local limit = tonumber(ARGV[3])
		redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
		local count = redis.call('ZCARD', key)
		if count >= limit then
			local first = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
			return {0, tonumber(first[2]) + window - now}
		end
		redis.call('ZADD', key, now, tostring(now) .. '-' .. tostring(math.random()))
		redis.call('PEXPIRE', key, window)
		return {1, 0}
	`;
	const result = await command('EVAL', [script, 1, key, now, windowMs, limit]);
	if (!Array.isArray(result)) return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
	const allowed = Number(result[0]) === 1;
	return { allowed, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(Number(result[1] ?? windowMs) / 1000)) };
}
