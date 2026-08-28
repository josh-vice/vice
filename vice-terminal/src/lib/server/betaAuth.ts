import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { assertBetaStoreConfigured, getBetaTesterByInvite, isBetaSessionActive } from './betaStore';

export const BETA_COOKIE_NAME = 'vice_beta_session';
export const BETA_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type InviteRecord = { id: string; code: string };
export type BetaIdentity = {
	id: string;
	testerId?: string;
	sessionVersion?: number;
	issuedAt?: number;
	expiresAt?: number;
};

function durableMode(): boolean {
	return process.env.VICE_BETA_REQUIRED?.trim().toLowerCase() === 'true';
}

function configuredInvites(): InviteRecord[] {
	if (durableMode()) return [];
	const raw = process.env.VICE_BETA_ACCESS_CODES?.trim() || process.env.VICE_BETA_ACCESS_CODE?.trim() || '';
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			return parsed.map((entry: unknown, index: number) => {
				if (!entry || typeof entry !== 'object') return null;
				const value = entry as { id?: unknown; code?: unknown };
				if (typeof value.code !== 'string' || value.code.trim() === '') return null;
				return { id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : `tester-${index + 1}`, code: value.code.trim() };
			}).filter((entry): entry is InviteRecord => entry !== null);
		}
		if (parsed && typeof parsed === 'object') {
			return Object.entries(parsed as Record<string, unknown>)
				.filter(([, code]) => typeof code === 'string' && code.trim() !== '')
				.map(([id, code]) => ({ id: id.trim(), code: (code as string).trim() }))
				.filter((entry) => entry.id !== '');
		}
	} catch {
		// Small local deployments may use a newline/comma-separated list.
	}
	return raw.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean).map((entry, index) => {
		const separator = entry.indexOf('=');
		return separator > 0 ? { id: entry.slice(0, separator).trim(), code: entry.slice(separator + 1).trim() } : { id: `tester-${index + 1}`, code: entry };
	}).filter((entry) => entry.id !== '' && entry.code !== '');
}

function sessionSecret(): string {
	return process.env.VICE_BETA_SESSION_SECRET?.trim() || '';
}
export function betaGateEnabled(): boolean {
	return durableMode() || configuredInvites().length > 0;
}
export function assertBetaConfiguration(): void {
	if (!betaGateEnabled()) return;
	if (durableMode()) {
		assertBetaStoreConfigured();
		return;
	}
	if (!sessionSecret()) throw new Error('VICE_BETA_SESSION_SECRET is required when beta access is enabled');
}
function digest(value: string): Buffer {
	return createHmac('sha256', sessionSecret()).update(value).digest();
}
function equalSecret(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	return left.length === right.length && timingSafeEqual(left, right);
}
function encodedIdentity(id: string): string {
	return Buffer.from(id, 'utf8').toString('base64url');
}
function decodedIdentity(value: string): string | null {
	try {
		const id = Buffer.from(value, 'base64url').toString('utf8');
		return id.trim() ? id : null;
	} catch {
		return null;
	}
}
function sessionSignature(payload: string): string {
	return digest(payload).toString('base64url');
}

export function verifyInviteCode(candidate: string): BetaIdentity | null {
	const code = candidate.trim();
	if (!code || !sessionSecret() || durableMode()) return null;
	const invite = configuredInvites().find((entry) => equalSecret(entry.code, code));
	return invite ? { id: invite.id } : null;
}
export async function verifyDurableInviteCode(candidate: string): Promise<BetaIdentity | null> {
	if (!durableMode() || !candidate.trim()) return null;
	assertBetaConfiguration();
	const tester = await getBetaTesterByInvite(candidate);
	if (!tester || tester.status !== 'active' || tester.expiresAt <= Date.now()) return null;
	return { id: tester.testerId, testerId: tester.testerId, sessionVersion: tester.sessionVersion, issuedAt: Date.now(), expiresAt: Math.floor(tester.expiresAt / 1000) };
}

export function createSessionToken(identity: BetaIdentity, now = Date.now()): string {
	if (!sessionSecret()) throw new Error('VICE_BETA_SESSION_SECRET is required when beta access is enabled');
	const issuedAt = Math.floor(now / 1000);
	const expiresAt = issuedAt + BETA_SESSION_MAX_AGE;
	if (!durableMode()) {
		const payload = `v1.${encodedIdentity(identity.id)}.${expiresAt}`;
		return `${payload}.${sessionSignature(payload)}`;
	}
	const testerId = identity.testerId ?? identity.id;
	const sessionVersion = identity.sessionVersion ?? 1;
	const payload = `v2.${encodedIdentity(testerId)}.${sessionVersion}.${issuedAt}.${expiresAt}`;
	return `${payload}.${sessionSignature(payload)}`;
}
export function verifySessionToken(token: string | undefined, now = Date.now()): BetaIdentity | null {
	if (!token || !sessionSecret()) return null;
	const parts = token.split('.');
	if (parts[0] === 'v1' && parts.length === 4) {
		const id = decodedIdentity(parts[1]);
		const expiresAt = Number(parts[2]);
		const payload = parts.slice(0, 3).join('.');
		if (!id || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000) || !equalSecret(sessionSignature(payload), parts[3])) return null;
		return { id };
	}
	if (parts.length !== 6 || parts[0] !== 'v2') return null;
	const testerId = decodedIdentity(parts[1]);
	const sessionVersion = Number(parts[2]);
	const issuedAt = Number(parts[3]);
	const expiresAt = Number(parts[4]);
	const payload = parts.slice(0, 5).join('.');
	if (!testerId || !Number.isSafeInteger(sessionVersion) || !Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000) || !equalSecret(sessionSignature(payload), parts[5])) return null;
	return { id: testerId, testerId, sessionVersion, issuedAt, expiresAt };
}
export async function betaIdentity(cookies: Cookies): Promise<BetaIdentity | null> {
	const identity = verifySessionToken(cookies.get(BETA_COOKIE_NAME));
	if (!identity) return null;
	if (!durableMode()) return identity;
	return await isBetaSessionActive(identity) ? identity : null;
}
export function setBetaSession(cookies: Cookies, identity: BetaIdentity, secure: boolean): void {
	cookies.set(BETA_COOKIE_NAME, createSessionToken(identity), { path: '/', httpOnly: true, sameSite: 'strict', secure, maxAge: BETA_SESSION_MAX_AGE });
}
export function clearBetaSession(cookies: Cookies): void {
	cookies.delete(BETA_COOKIE_NAME, { path: '/' });
}
export function safeReturnTarget(url: URL): string {
	const ref = url.searchParams.get('ref');
	if (!ref) return '/';
	try {
		const candidate = new URL(ref, url.origin);
		if (candidate.origin !== url.origin || candidate.pathname === '/login') return '/';
		return `${candidate.pathname}${candidate.search}${candidate.hash}`;
	} catch {
		return '/';
	}
}
export function betaLoginRedirect(url: URL): string {
	return `/login?ref=${encodeURIComponent(url.origin + url.pathname + url.search)}`;
}
